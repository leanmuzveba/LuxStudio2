// Shared multi-track editing operations. These always act on every track at
// once (video + audio) using the same global timestamps, so cutting one
// track never leaves the others out of sync.

import { Clip, Track } from '../types';

interface TimeRange {
  startMs: number;
  endMs: number;
}

function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => a.startMs - b.startMs);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, range.endMs);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/** Splits every track's clips at timeMs, keeping all tracks cut at the exact same instant. */
export function splitTracksAtTime(tracks: Track[], timeMs: number): Track[] {
  return tracks.map((track) => ({
    ...track,
    clips: splitClipsAtTime(track.clips, timeMs),
  }));
}

function splitClipsAtTime(clips: Clip[], timeMs: number): Clip[] {
  const result: Clip[] = [];
  const uid = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  for (const clip of clips) {
    if (timeMs <= clip.startMs + 1 || timeMs >= clip.endMs - 1) {
      result.push(clip);
      continue;
    }
    const sourceSplit = clip.sourceStartMs + (timeMs - clip.startMs);
    result.push(
      { ...clip, id: `${clip.id}-a-${uid}`, endMs: timeMs, sourceEndMs: sourceSplit },
      { ...clip, id: `${clip.id}-b-${uid}`, startMs: timeMs, sourceStartMs: sourceSplit }
    );
  }

  return result;
}

/**
 * Removes the given ranges from a track's clips and closes the resulting
 * gaps. Applied identically (same ranges, same shift math) to every track so
 * video and audio stay aligned after the cut.
 */
export function removeRangesFromTracks(tracks: Track[], ranges: TimeRange[]): Track[] {
  const merged = mergeRanges(ranges);
  if (merged.length === 0) return tracks;

  return tracks.map((track) => ({
    ...track,
    clips: removeRangesFromClips(track.clips, merged),
  }));
}

function shiftForTime(t: number, merged: TimeRange[]): number {
  let removed = 0;
  for (const range of merged) {
    if (range.endMs <= t) removed += range.endMs - range.startMs;
    else if (range.startMs < t) removed += t - range.startMs;
    else break;
  }
  return removed;
}

function removeRangesFromClips(clips: Clip[], merged: TimeRange[]): Clip[] {
  const result: Clip[] = [];

  for (const clip of clips) {
    let segments: TimeRange[] = [{ startMs: clip.startMs, endMs: clip.endMs }];

    for (const range of merged) {
      const next: TimeRange[] = [];
      for (const seg of segments) {
        const overlapStart = Math.max(seg.startMs, range.startMs);
        const overlapEnd = Math.min(seg.endMs, range.endMs);
        if (overlapStart < overlapEnd) {
          if (seg.startMs < overlapStart) next.push({ startMs: seg.startMs, endMs: overlapStart });
          if (overlapEnd < seg.endMs) next.push({ startMs: overlapEnd, endMs: seg.endMs });
        } else {
          next.push(seg);
        }
      }
      segments = next;
    }

    segments.forEach((seg, idx) => {
      if (seg.endMs - seg.startMs < 20) return; // drop near-zero slivers
      const sourceOffsetStart = seg.startMs - clip.startMs;
      const sourceOffsetEnd = seg.endMs - clip.startMs;
      result.push({
        ...clip,
        id: `${clip.id}-cut${idx}-${seg.startMs}`,
        startMs: seg.startMs - shiftForTime(seg.startMs, merged),
        endMs: seg.endMs - shiftForTime(seg.endMs, merged),
        sourceStartMs: clip.sourceStartMs + sourceOffsetStart,
        sourceEndMs: clip.sourceStartMs + sourceOffsetEnd,
      });
    });
  }

  return result.sort((a, b) => a.startMs - b.startMs);
}
