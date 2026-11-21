// Decodes real audio from an uploaded file (or a video file's embedded audio
// track) and derives waveform peaks / silence ranges from the actual PCM
// samples, so the timeline reflects the real media instead of a simulation.

/** Mono PCM decoded server-side by ffmpeg (shape mirrors the bits of AudioBuffer we use). */
export interface DecodedAudioLike {
  sampleRate: number;
  length: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

const CHUNK_BYTES = 8 * 1024 * 1024; // well under the server's 16 MB per-request cap
const uploads = new Map<string, Promise<string>>();

/**
 * Uploads the media behind a blob URL to the server in sequential chunks and
 * resolves to its server media id. Cached per URL, so waveform rendering,
 * silence detection (and later export/transcription) share one upload.
 * Progress is reported 0..1 over the bytes sent.
 */
export function uploadMedia(url: string, onProgress?: (ratio: number) => void): Promise<string> {
  const cached = uploads.get(url);
  if (cached) return cached;

  const promise = (async () => {
    // Fetching a blob: URL hands back the original File/Blob without copying it.
    const blob = await (await fetch(url)).blob();
    const id = crypto.randomUUID();
    for (let offset = 0; offset < blob.size; offset += CHUNK_BYTES) {
      const res = await fetch(`/api/media/${id}?offset=${offset}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: blob.slice(offset, offset + CHUNK_BYTES),
      });
      if (!res.ok) throw new Error(`Upload failed at byte ${offset}: ${res.status} ${await res.text()}`);
      onProgress?.(Math.min(1, (offset + CHUNK_BYTES) / blob.size));
    }
    return id;
  })();

  uploads.set(url, promise);
  promise.catch(() => uploads.delete(url));
  return promise;
}

/**
 * Server-side ffmpeg extracts mono PCM from any container/codec it supports,
 * in seconds even for multi-hour files. Upload is ~90% of the progress bar;
 * extraction is reported as the final stretch.
 */
async function decodeViaServer(url: string, onProgress?: (ratio: number) => void): Promise<DecodedAudioLike> {
  const id = await uploadMedia(url, (r) => onProgress?.(r * 0.9));
  const res = await fetch(`/api/media/${id}/audio`);
  if (!res.ok) throw new Error(`Audio extraction failed: ${res.status} ${await res.text()}`);
  const sampleRate = Number(res.headers.get('X-Sample-Rate')) || 4000;
  const bytes = await res.arrayBuffer();
  // f32le from ffmpeg; trim any partial trailing sample before viewing as floats.
  const data = new Float32Array(bytes, 0, Math.floor(bytes.byteLength / 4));
  onProgress?.(1);
  return {
    sampleRate,
    length: data.length,
    numberOfChannels: 1,
    getChannelData: () => data,
  };
}

const decodeCache = new Map<string, Promise<DecodedAudioLike>>();
const progressListeners = new Map<string, Set<(ratio: number) => void>>();

function broadcastProgress(url: string, ratio: number) {
  progressListeners.get(url)?.forEach((cb) => cb(ratio));
}

/**
 * Returns the decoded audio for a URL, capturing it once and caching the
 * result for every caller (waveform rendering, silence detection, etc.). If
 * a decode for this URL is already in flight, onProgress is ignored (only
 * the call that started it drives progress) and the same promise is reused.
 */
export function getDecodedAudio(
  url: string,
  onProgress?: (ratio: number) => void
): Promise<DecodedAudioLike> {
  const cached = decodeCache.get(url);
  if (cached) return cached;

  if (onProgress) {
    if (!progressListeners.has(url)) progressListeners.set(url, new Set());
    progressListeners.get(url)!.add(onProgress);
  }

  const promise = decodeViaServer(url, (ratio) => broadcastProgress(url, ratio));

  decodeCache.set(url, promise);
  promise
    .then(() => broadcastProgress(url, 1))
    .catch(() => decodeCache.delete(url))
    .finally(() => progressListeners.delete(url));

  return promise;
}

function toMonoSamples(buffer: DecodedAudioLike): Float32Array {
  const channels = buffer.numberOfChannels;
  if (channels === 1) return buffer.getChannelData(0);

  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / channels;
  }
  return mono;
}

export interface WaveformPeaks {
  min: Float32Array;
  max: Float32Array;
}

/**
 * Peak (min/max) amplitude per bucket across [startSec, endSec). Bucket count
 * should track the rendered pixel width so zooming the timeline in/out
 * changes how much real detail is visible, not just how stretched a fixed
 * set of bars looks.
 */
export function computeWaveformPeaks(
  buffer: DecodedAudioLike,
  bucketCount: number,
  startSec: number,
  endSec: number
): WaveformPeaks {
  const sampleRate = buffer.sampleRate;
  const mono = toMonoSamples(buffer);
  const startSample = Math.max(0, Math.min(mono.length, Math.floor(startSec * sampleRate)));
  const endSample = Math.max(startSample, Math.min(mono.length, Math.floor(endSec * sampleRate)));
  const span = Math.max(1, endSample - startSample);
  const buckets = Math.max(1, bucketCount);
  const bucketSize = Math.max(1, span / buckets);
  const maxSamplesPerBucket = 2000; // caps work on very zoomed-out / long clips

  const min = new Float32Array(buckets);
  const max = new Float32Array(buckets);

  for (let i = 0; i < buckets; i++) {
    const bucketStart = startSample + Math.floor(i * bucketSize);
    const bucketEnd = i === buckets - 1 ? endSample : Math.min(endSample, startSample + Math.floor((i + 1) * bucketSize));
    const stride = Math.max(1, Math.floor((bucketEnd - bucketStart) / maxSamplesPerBucket));

    let bucketMin = 0;
    let bucketMax = 0;
    for (let j = bucketStart; j < bucketEnd; j += stride) {
      const v = mono[j];
      if (v > bucketMax) bucketMax = v;
      if (v < bucketMin) bucketMin = v;
    }
    min[i] = bucketMin;
    max[i] = bucketMax;
  }

  return { min, max };
}

export interface SilenceRange {
  startMs: number;
  endMs: number;
}

export interface SilenceDetectionOptions {
  /** Fixed RMS threshold in dBFS. Default: adaptive, from this file's own noise floor and speech level. */
  thresholdDb?: number;
  /** Shifts the adaptive threshold: positive also catches louder pauses (room noise), negative only near-total silence. */
  sensitivityDb?: number;
  /** Minimum pause length to report, in ms. */
  minSilenceMs?: number;
  /** Sound shorter than this (breath, click, noise spike) inside a pause doesn't end it, in ms. */
  minSoundMs?: number;
  /** Shrinks each detected range inward so cuts don't clip speech onset/tail. */
  paddingMs?: number;
}

export interface SilenceDetectionResult {
  ranges: SilenceRange[];
  /** The threshold actually used (dBFS), so the UI can show what "auto" picked. */
  thresholdDb: number;
}

const WINDOW_MS = 20;

/** Picks a threshold between this recording's pauses and its speech, not a fixed dB that suits only clean studio audio. */
function adaptiveThresholdDb(windowDb: Float32Array): number {
  const sorted = Float32Array.from(windowDb).sort();
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const floor = pct(0.1); // pauses / room tone
  const speech = pct(0.95); // loud speech
  // 45% of the way up from the floor (works down to ~12 dB speech-to-noise),
  // never within 6 dB of speech, and never more than 35 dB below it
  // (digital-silence floors read -120 dB).
  const raw = floor + 0.45 * (speech - floor);
  return Math.min(speech - 6, Math.max(speech - 35, raw));
}

/**
 * Scans the whole buffer in 20 ms RMS windows. A pause starts at the first
 * quiet window and only ends once sound lasts minSoundMs, so room noise
 * flickering around the threshold or a breath mid-pause doesn't chop one
 * pause into fragments too short to count (the old behaviour).
 */
export function detectSilenceRanges(
  buffer: DecodedAudioLike,
  options: SilenceDetectionOptions = {}
): SilenceDetectionResult {
  const { sensitivityDb = 0, minSilenceMs = 350, minSoundMs = 100, paddingMs = 80 } = options;
  const mono = toMonoSamples(buffer);
  const windowSize = Math.max(1, Math.round((WINDOW_MS / 1000) * buffer.sampleRate));
  const windowCount = Math.ceil(mono.length / windowSize);
  if (windowCount === 0) return { ranges: [], thresholdDb: options.thresholdDb ?? -40 };

  const windowDb = new Float32Array(windowCount);
  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(mono.length, start + windowSize);
    let sumSquares = 0;
    for (let i = start; i < end; i++) sumSquares += mono[i] * mono[i];
    windowDb[w] = 20 * Math.log10(Math.max(1e-6, Math.sqrt(sumSquares / Math.max(1, end - start))));
  }

  const thresholdDb = (options.thresholdDb ?? adaptiveThresholdDb(windowDb)) + sensitivityDb;
  const minSoundWindows = Math.max(1, Math.round(minSoundMs / WINDOW_MS));
  const windowMs = (windowSize / buffer.sampleRate) * 1000;
  const ranges: SilenceRange[] = [];

  const flush = (startW: number, endW: number) => {
    if ((endW - startW) * windowMs < minSilenceMs) return;
    const startMs = startW * windowMs + paddingMs;
    const endMs = Math.min(endW * windowMs, (mono.length / buffer.sampleRate) * 1000) - paddingMs;
    if (endMs > startMs) ranges.push({ startMs, endMs });
  };

  let silenceStart = -1; // first quiet window of the current pause
  let soundStart = -1; // first loud window of a (possibly brief) sound inside it
  for (let w = 0; w < windowCount; w++) {
    if (windowDb[w] < thresholdDb) {
      if (silenceStart < 0) silenceStart = w;
      soundStart = -1;
    } else if (silenceStart >= 0) {
      if (soundStart < 0) soundStart = w;
      if (w - soundStart + 1 >= minSoundWindows) {
        flush(silenceStart, soundStart);
        silenceStart = -1;
        soundStart = -1;
      }
    }
  }
  if (silenceStart >= 0) flush(silenceStart, soundStart >= 0 ? soundStart : windowCount);

  return { ranges, thresholdDb };
}
