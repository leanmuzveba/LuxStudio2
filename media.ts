// Server-side media handling: chunked upload to disk + ffmpeg audio extraction.
// The browser keeps its own blob URL for preview playback; the server copy is
// what heavy work (waveform/silence audio, later export + speech-to-text) runs on.
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

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

// Mono 32-bit float PCM at AUDIO_SAMPLE_RATE, streamed straight from ffmpeg.
mediaRouter.get("/:id/audio", (req, res) => {
  const file = mediaPath(req.params.id);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: "Media not found" });

  const ff = spawn("ffmpeg", [
    "-v", "error", "-i", file,
    "-vn", "-ac", "1", "-ar", String(AUDIO_SAMPLE_RATE), "-f", "f32le", "pipe:1",
  ]);
  let stderr = "";
  ff.stderr.on("data", (d) => (stderr += d));
  ff.on("error", (err) => {
    // ffmpeg missing from PATH — the one failure worth a clear message.
    if (!res.headersSent) res.status(500).json({ error: `ffmpeg unavailable: ${err.message}` });
  });

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("X-Sample-Rate", String(AUDIO_SAMPLE_RATE));
  ff.stdout.pipe(res);
  ff.on("close", (code, signal) => {
    if (code !== 0 && !signal) {
      console.error(`ffmpeg audio extraction failed for ${req.params.id}:`, stderr.trim());
      // Headers may already be sent; destroying makes the client see a failed
      // fetch rather than a silently truncated waveform.
      res.destroy();
    }
  });
  // Client went away mid-stream: stop decoding.
  res.on("close", () => {
    if (ff.exitCode === null) ff.kill("SIGKILL");
  });
});
