// Run: npx tsx src/utils/audioAnalysis.check.ts
import assert from 'node:assert/strict';
import { detectSilenceRanges } from './audioAnalysis';

// 60 s at 4 kHz: "speech" (tone) for 8 s, then a 2 s pause, repeating.
// Pauses hold room noise at `noise` amplitude; every other pause has a 50 ms
// click in the middle. The old fixed -40 dB detector fragmented these.
function signal(noise: number) {
  const rate = 4000;
  const data = new Float32Array(60 * rate);
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < data.length; i++) {
    const t = i / rate;
    const inPause = t % 10 >= 8;
    const click = t % 20 >= 9 && t % 20 < 9.05;
    data[i] = (inPause && !click ? 0 : 0.3 * Math.sin(2 * Math.PI * 300 * t)) + noise * rand();
  }
  return { sampleRate: rate, length: data.length, numberOfChannels: 1, getChannelData: () => data };
}

for (const noise of [0, 0.01, 0.04]) {
  const { ranges } = detectSilenceRanges(signal(noise));
  assert.equal(ranges.length, 6, `noise ${noise}: expected 6 whole pauses, got ${ranges.length}`);
  ranges.forEach((r, i) => {
    assert.ok(Math.abs(r.startMs - (i * 10000 + 8000)) < 150, `noise ${noise}: pause ${i} starts at ${r.startMs}`);
    assert.ok(Math.abs(r.endMs - (i * 10000 + 10000)) < 150, `noise ${noise}: pause ${i} ends at ${r.endMs}`);
  });
}

// Higher sensitivity must never find fewer pauses; a long min pause finds none here.
assert.ok(detectSilenceRanges(signal(0.04), { sensitivityDb: 6 }).ranges.length >= 6);
assert.equal(detectSilenceRanges(signal(0.04), { minSilenceMs: 2500 }).ranges.length, 0);

console.log('audioAnalysis OK');
