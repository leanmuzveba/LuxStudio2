// Run: npx tsx src/utils/captionPaging.check.ts
import assert from 'node:assert';
import { captionWordTimings, captionPageAt } from './canvasRenderer';

const cap = { id: 'c', startMs: 1000, endMs: 5000, text: 'Faith without action is like a seed that never grows' };
const words = captionWordTimings(cap);
assert.equal(words.length, 10);
assert.equal(words[0].startMs, 1000);
assert.ok(Math.abs(words[9].endMs - 5000) < 1e-6, 'timings span the whole line');
for (let i = 1; i < words.length; i++) assert.ok(words[i].startMs >= words[i - 1].startMs, 'monotonic');

const text = (t: number, wpl: number, ml: number) =>
  captionPageAt(words, t, wpl, ml).lines.map((l) => l.map((w) => w.text).join(' '));
assert.deepEqual(text(1000, 3, 1), ['Faith without action']);
assert.deepEqual(text(words[3].startMs, 3, 1), ['is like a']);
assert.deepEqual(text(4999, 3, 1), ['grows']);
assert.deepEqual(text(1000, 3, 2), ['Faith without action', 'is like a']);
assert.equal(captionPageAt(words, words[3].startMs, 3, 1).startMs, words[3].startMs, 'page starts with its first word');

// Real per-word timings win over the estimate.
const timed = captionWordTimings({ ...cap, words: [{ word: 'Faith', startMs: 1200, endMs: 1500 }] });
assert.deepEqual(timed, [{ text: 'Faith', startMs: 1200, endMs: 1500 }]);
console.log('caption paging checks passed');
