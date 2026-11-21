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
  /** RMS level below which a window counts as silent, in dBFS. */
  thresholdDb?: number;
  /** Minimum contiguous silence duration to report, in ms. */
  minSilenceMs?: number;
  /** Shrinks each detected range inward so cuts don't clip speech onset/tail. */
  paddingMs?: number;
}

/**
 * Scans the ENTIRE decoded buffer for silent stretches using an RMS sliding
 * window — unlike a fixed sample list, this naturally returns as many (or as
 * few) ranges as the actual audio contains, for its full duration.
 */
export function detectSilenceRanges(
  buffer: DecodedAudioLike,
  options: SilenceDetectionOptions = {}
): SilenceRange[] {
  const { thresholdDb = -40, minSilenceMs = 400, paddingMs = 80 } = options;
  const sampleRate = buffer.sampleRate;
  const mono = toMonoSamples(buffer);
  const windowSize = Math.max(1, Math.round((20 / 1000) * sampleRate)); // 20ms windows
  const amplitudeThreshold = Math.pow(10, thresholdDb / 20);
  const windowCount = Math.ceil(mono.length / windowSize);

  const ranges: SilenceRange[] = [];
  let silenceStartSample: number | null = null;

  const flush = (silenceEndSample: number) => {
    if (silenceStartSample === null) return;
    const durationMs = ((silenceEndSample - silenceStartSample) / sampleRate) * 1000;
    if (durationMs >= minSilenceMs) {
      const startMs = (silenceStartSample / sampleRate) * 1000 + paddingMs;
      const endMs = (silenceEndSample / sampleRate) * 1000 - paddingMs;
      if (endMs > startMs) ranges.push({ startMs, endMs });
    }
    silenceStartSample = null;
  };

  for (let w = 0; w < windowCount; w++) {
    const start = w * windowSize;
    const end = Math.min(mono.length, start + windowSize);
    let sumSquares = 0;
    for (let i = start; i < end; i++) sumSquares += mono[i] * mono[i];
    const rms = Math.sqrt(sumSquares / Math.max(1, end - start));

    if (rms < amplitudeThreshold) {
      if (silenceStartSample === null) silenceStartSample = start;
    } else {
      flush(start);
    }
  }
  flush(mono.length);

  return ranges;
}
