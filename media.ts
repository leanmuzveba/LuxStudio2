// Server-side media handling: chunked upload to disk + ffmpeg audio extraction.
// The browser keeps its own blob URL for preview playback; the server copy is
// what heavy work (waveform/silence audio, later export + speech-to-text) runs on.
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

const MEDIA_DIR = process.env.MEDIA_DIR || path.join(os.tmpdir(), "luxstudio2-media");
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 8 * 1024 ** 3; // 8 GB
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Low rate on purpose: plenty for waveform drawing + 20ms-window silence
// detection, and keeps a 2hr file's response ~115 MB instead of ~1.4 GB.
export const AUDIO_SAMPLE_RATE = 4000;

fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Ids are client-generated UUIDs; validating them is what keeps a request
// from naming a path outside MEDIA_DIR.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const mediaPath = (id: string) => (ID_RE.test(id) ? path.join(MEDIA_DIR, id) : null);

// ponytail: age-based sweep of a local temp dir; move to object storage
// (S3/GCS) if instances scale out or uploads must survive restarts.
function sweep() {
  for (const name of fs.readdirSync(MEDIA_DIR)) {
    const p = path.join(MEDIA_DIR, name);
    try {
      if (Date.now() - fs.statSync(p).mtimeMs > MAX_AGE_MS) fs.rmSync(p, { force: true });
    } catch {}
  }
}
sweep();
setInterval(sweep, 60 * 60 * 1000).unref();

export const mediaRouter = express.Router();

// Append one chunk. `offset` must equal the bytes already stored, so a
// retried or out-of-order chunk is rejected instead of corrupting the file.
mediaRouter.put(
  "/:id",
  express.raw({ type: "application/octet-stream", limit: "16mb" }),
  (req, res) => {
    const file = mediaPath(req.params.id);
    if (!file) return res.status(400).json({ error: "Invalid media id" });
    const offset = Number(req.query.offset);
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    if (!Number.isInteger(offset) || offset !== size) {
      return res.status(409).json({ error: "Offset mismatch", size });
    }
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: "Empty chunk" });
    if (size + body.length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: "File too large" });
    fs.appendFileSync(file, body);
    res.json({ size: size + body.length });
  }
);

// Mono 32-bit float PCM at AUDIO_SAMPLE_RATE. ffmpeg writes it to a file
// next to the upload once; it's then served as a plain file. (Streaming
// ffmpeg's stdout as a chunked response was ~4x slower to download in Chrome
// than with a Content-Length, and a failure could only truncate the stream.)
mediaRouter.get("/:id/audio", (req, res) => {
  const file = mediaPath(req.params.id);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: "Media not found" });
  const audioFile = `${file}.audio.f32`;
  const send = () =>
    res.sendFile(audioFile, {
      headers: { "Content-Type": "application/octet-stream", "X-Sample-Rate": String(AUDIO_SAMPLE_RATE) },
    });
  if (fs.existsSync(audioFile)) return send();

  // Unique temp name + atomic rename: concurrent requests can't serve a half-written file.
  const tmp = `${audioFile}.${process.pid}.${Date.now()}.tmp`;
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", "-i", file,
    "-vn", "-ac", "1", "-ar", String(AUDIO_SAMPLE_RATE), "-f", "f32le", tmp,
  ]);
  let stderr = "";
  ff.stderr.on("data", (d) => (stderr += d));
  ff.on("error", (err) => {
    // ffmpeg missing from PATH — the one failure worth a clear message.
    if (!res.headersSent) res.status(500).json({ error: `ffmpeg unavailable: ${err.message}` });
  });
  ff.on("close", (code) => {
    if (code === 0) {
      fs.renameSync(tmp, audioFile);
      return send();
    }
    fs.rmSync(tmp, { force: true });
    console.error(`ffmpeg audio extraction failed for ${req.params.id}:`, stderr.trim());
    if (!res.headersSent) {
      res.status(500).json({ error: `Could not extract audio: ${stderr.trim().split("\n").pop() || `ffmpeg exit ${code}`}` });
    }
  });
});

// ---------------------------------------------------------------------------
// Speech-to-text (auto captions) via Gemini.
// ffmpeg splits the audio into short mono MP3 chunks; each chunk is sent to
// Gemini inline and comes back as timed caption lines, offset to file time.
// The result is cached next to the upload, so a second click is instant.
// ponytail: fixed 5-min chunks can split a word at a boundary; split on
// detected silences instead if that shows up in practice.

const TRANSCRIBE_CHUNK_SEC = 300;
const TRANSCRIBE_CONCURRENCY = 4;
// Gemini models return 503 "high demand" for minutes at a time, so a busy
// model falls through to the next, and the whole list is retried with backoff.
const TRANSCRIBE_MODELS = (process.env.GEMINI_TRANSCRIBE_MODELS || "gemini-3.5-flash,gemini-3.8-flash,gemini-3.5-flash-lite")
  .split(",").map((m) => m.trim()).filter(Boolean);
const RETRY_WAITS_MS = [0, 10_000, 30_000];

interface CaptionLine { startMs: number; endMs: number; text: string }

/** Runs a command; resolves with its stderr (where ffmpeg prints filter stats). */
function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(stderr) : reject(new Error(stderr.trim().split("\n").pop() || `${cmd} exit ${code}`))
    );
  });
}

// Gemini invents plausible speech for silent audio, so near-silent chunks
// (e.g. a blank lead-in) are never sent. ponytail: whole-chunk peak check;
// quiet room noise with no speech can still slip through.
const SILENT_CHUNK_MAX_DB = -45;
async function chunkPeakDb(mp3Path: string): Promise<number> {
  const out = await run("ffmpeg", ["-v", "info", "-nostats", "-i", mp3Path, "-af", "volumedetect", "-f", "null", "-"]);
  const m = out.match(/max_volume:\s*(-?[\d.]+) dB/);
  return m ? Number(m[1]) : -Infinity;
}

async function transcribeChunk(ai: GoogleGenAI, mp3: Buffer, offsetMs: number): Promise<CaptionLine[]> {
  let lastErr: unknown;
  for (const wait of RETRY_WAITS_MS) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    for (const model of TRANSCRIBE_MODELS) {
      try {
        return await transcribeChunkWith(ai, model, mp3, offsetMs);
      } catch (err) {
        lastErr = err;
        console.warn(`Transcription with ${model} failed:`, (err as Error)?.message?.slice(0, 160));
      }
    }
  }
  throw lastErr;
}

async function transcribeChunkWith(ai: GoogleGenAI, model: string, mp3: Buffer, offsetMs: number): Promise<CaptionLine[]> {
  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: "audio/mpeg", data: mp3.toString("base64") } },
        { text:
`Transcribe the speech in this audio verbatim, in the language spoken, for video captions.
Split it into short caption lines of at most ~10 words / ~4 seconds each, breaking at natural pauses.
For each line give "start" and "end" in seconds from the start of this audio clip (decimals allowed).
Do not transcribe music or noise. Do not summarise or invent words. If there is no speech, return an empty list.` },
      ],
    }],
    config: {
      httpOptions: { timeout: 90_000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { start: { type: Type.NUMBER }, end: { type: Type.NUMBER }, text: { type: Type.STRING } },
              required: ["start", "end", "text"],
            },
          },
        },
        required: ["lines"],
      },
    },
  });
  const parsed = JSON.parse(response.text || "{}");
  const maxMs = TRANSCRIBE_CHUNK_SEC * 1000;
  return (Array.isArray(parsed.lines) ? parsed.lines : [])
    .map((l: any) => {
      const start = Math.min(maxMs, Math.max(0, Number(l.start) * 1000 || 0));
      const end = Math.min(maxMs, Math.max(start + 200, Number(l.end) * 1000 || 0));
      return { startMs: Math.round(offsetMs + start), endMs: Math.round(offsetMs + end), text: String(l.text || "").trim() };
    })
    .filter((l: CaptionLine) => l.text);
}

const transcribing = new Map<string, Promise<CaptionLine[]>>();

async function transcribeFile(file: string, apiKey: string): Promise<CaptionLine[]> {
  const cacheFile = `${file}.captions.json`;
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  const dir = fs.mkdtempSync(`${file}.stt-`);
  try {
    await run("ffmpeg", [
      "-v", "error", "-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k",
      "-f", "segment", "-segment_time", String(TRANSCRIBE_CHUNK_SEC), "-reset_timestamps", "1",
      path.join(dir, "%04d.mp3"),
    ]);
    const chunks = fs.readdirSync(dir).filter((n) => n.endsWith(".mp3")).sort();
    const ai = new GoogleGenAI({ apiKey });
    const results: CaptionLine[][] = new Array(chunks.length);
    let next = 0;
    const worker = async () => {
      while (next < chunks.length) {
        const i = next++;
        const chunkPath = path.join(dir, chunks[i]);
        if ((await chunkPeakDb(chunkPath)) < SILENT_CHUNK_MAX_DB) { results[i] = []; continue; }
        const mp3 = fs.readFileSync(chunkPath);
        results[i] = await transcribeChunk(ai, mp3, i * TRANSCRIBE_CHUNK_SEC * 1000);
      }
    };
    await Promise.all(Array.from({ length: Math.min(TRANSCRIBE_CONCURRENCY, chunks.length) }, worker));
    const lines = results.flat().sort((a, b) => a.startMs - b.startMs);
    fs.writeFileSync(cacheFile, JSON.stringify(lines));
    return lines;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

mediaRouter.post("/:id/transcribe", async (req, res) => {
  const file = mediaPath(req.params.id);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: "Media not found" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(503).json({ error: "Speech-to-text isn't configured: set GEMINI_API_KEY on the server." });
  }
  // One transcription per file, even if the button is clicked twice.
  let job = transcribing.get(file);
  if (!job) {
    job = transcribeFile(file, apiKey);
    transcribing.set(file, job);
    job.finally(() => transcribing.delete(file)).catch(() => {});
  }
  try {
    res.json({ lines: await job });
  } catch (err: any) {
    console.error(`Transcription failed for ${req.params.id}:`, err);
    res.status(502).json({ error: `Transcription failed: ${err?.message || err}` });
  }
});
