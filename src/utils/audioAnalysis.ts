// Decodes real audio from an uploaded file (or a video file's embedded audio
// track) and derives waveform peaks / silence ranges from the actual PCM
// samples, so the timeline reflects the real media instead of a simulation.

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    sharedContext = new Ctor();
  }
  return sharedContext;
}

const decodeCache = new Map<string, Promise<AudioBuffer>>();

export function decodeAudioSource(url: string): Promise<AudioBuffer> {
  const cached = decodeCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((arrayBuffer) => getAudioContext().decodeAudioData(arrayBuffer));

  decodeCache.set(url, promise);
  promise.catch(() => decodeCache.delete(url));
  return promise;
}

function toMonoSamples(buffer: AudioBuffer): Float32Array {
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
  buffer: AudioBuffer,
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
  buffer: AudioBuffer,
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
