// Decodes real audio from an uploaded file (or a video file's embedded audio
// track) and derives waveform peaks / silence ranges from the actual PCM
// samples, so the timeline reflects the real media instead of a simulation.

/** Minimal shape both a real AudioBuffer and our playback-captured fallback satisfy. */
export interface DecodedAudioLike {
  sampleRate: number;
  length: number;
  numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
}

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    sharedContext = new Ctor();
  }
  return sharedContext;
}

/**
 * Loads the file into a real <video> element (works for plain audio files
 * too) and taps its actual decoded audio via Web Audio as it plays — the
 * same decoding pipeline the visible player already uses successfully, so
 * there's no separate "extraction" step or container-format guessing.
 *
 * The element is intentionally NOT muted: muting a media element also zeroes
 * the PCM that reaches a MediaElementAudioSourceNode in some browsers (not
 * just its own speaker output), which produces silent captured audio even
 * though the file audibly has sound. Instead, output is silenced by routing
 * through a zero-gain node before the destination.
 *
 * Plays at normal (1x) speed so there's no time-compression math to get
 * wrong — it just takes as long as the file's real duration, with progress
 * (0..1) reported via onProgress as it goes.
 */
function captureAudioViaPlayback(
  url: string,
  onProgress?: (ratio: number) => void
): Promise<DecodedAudioLike> {
  return new Promise((resolve, reject) => {
    const captureSampleRate = 4000; // plenty for waveform display + silence detection, keeps memory small

    const video = document.createElement('video');
    video.src = url;
    video.preload = 'auto';
    video.playsInline = true;

    let ctx: AudioContext | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    // ScriptProcessorNode is deprecated but universally supported and avoids
    // needing a separate AudioWorklet module file just for this.
    let processor: ScriptProcessorNode | null = null;
    let outBuffer = new Float32Array(0);
    let writeIndex = 0;
    let settled = false;

    const cleanup = () => {
      try { processor?.disconnect(); } catch {}
      try { source?.disconnect(); } catch {}
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      const finalData = outBuffer.slice(0, writeIndex);
      cleanup();
      onProgress?.(1);
      resolve({
        sampleRate: captureSampleRate,
        length: finalData.length,
        numberOfChannels: 1,
        getChannelData: () => finalData,
      });
    };

    const ensureCapacity = (needed: number) => {
      if (needed <= outBuffer.length) return;
      const grown = new Float32Array(Math.max(needed, (outBuffer.length || 1024) * 2));
      grown.set(outBuffer);
      outBuffer = grown;
    };

    video.addEventListener('error', () => fail(new Error('Failed to load media for audio analysis')));

    video.addEventListener('loadedmetadata', () => {
      const durationSec = video.duration || 0;
      outBuffer = new Float32Array(Math.max(1, Math.ceil(durationSec * captureSampleRate)));

      try {
        ctx = getAudioContext();
        const decimateStep = Math.max(1, Math.round(ctx.sampleRate / captureSampleRate));
        source = ctx.createMediaElementSource(video);
        processor = ctx.createScriptProcessor(4096, 1, 1);

        let decimateAccumulator = 0;
        let decimateCount = 0;

        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          for (let i = 0; i < input.length; i++) {
            const sample = input[i];
            if (Math.abs(sample) > Math.abs(decimateAccumulator)) decimateAccumulator = sample;
            decimateCount++;
            if (decimateCount >= decimateStep) {
              ensureCapacity(writeIndex + 1);
              outBuffer[writeIndex++] = decimateAccumulator;
              decimateAccumulator = 0;
              decimateCount = 0;
            }
          }
          if (durationSec > 0) onProgress?.(Math.min(0.99, video.currentTime / durationSec));
        };

        // A ScriptProcessorNode only pulls audio if its output reaches the
        // destination — route through a zero-gain node so nothing is audible.
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(ctx.destination);
      } catch (err) {
        fail(err);
        return;
      }

      video.addEventListener('ended', finish);
      video.play().catch(fail);
    });
  });
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

  const promise = captureAudioViaPlayback(url, (ratio) => broadcastProgress(url, ratio));

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
