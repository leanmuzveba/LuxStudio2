// Run: npx tsx src/utils/timelineOps.check.ts
import assert from 'node:assert/strict';
import { removeRangesFromTracks, removeRangesFromTimedItems } from './timelineOps';

const cuts = [{ startMs: 1000, endMs: 2000 }, { startMs: 5000, endMs: 6000 }];

// Captions: before a cut stays, inside a cut is dropped, after cuts shifts left.
const caps = removeRangesFromTimedItems(
  [
    { id: 'a', startMs: 0, endMs: 900 },
    { id: 'b', startMs: 1200, endMs: 1800 },
    { id: 'c', startMs: 7000, endMs: 8000 },
    { id: 'd', startMs: 1500, endMs: 3000 },
  ],
  cuts
);
assert.deepEqual(caps.map((c) => [c.id, c.startMs, c.endMs]), [
  ['a', 0, 900],
  ['c', 5000, 6000],
  ['d', 1000, 2000],
]);

// Tracks: same cuts give the same timeline positions, sources keep pointing at original media.
const [track] = removeRangesFromTracks(
  [{ id: 't', type: 'video', name: 'v', muted: false, orderIndex: 0,
     clips: [{ id: 'c', trackId: 't', name: 'c', startMs: 0, endMs: 10000, sourceStartMs: 0, sourceEndMs: 10000 }] }] as any,
  cuts
);
assert.deepEqual(track.clips.map((c: any) => [c.startMs, c.endMs, c.sourceStartMs, c.sourceEndMs]), [
  [0, 1000, 0, 1000],
  [1000, 4000, 2000, 5000],
  [4000, 8000, 6000, 10000],
]);

console.log('timelineOps OK');
