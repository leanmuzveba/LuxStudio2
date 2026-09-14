// Extracts real frame thumbnails from an uploaded video for the timeline
// filmstrip, instead of a static placeholder graphic.

const cache = new Map<string, Promise<string[]>>();

async function captureThumbnails(
  videoUrl: string,
  startSec: number,
  endSec: number,
  count: number,
  thumbWidth: number,
  thumbHeight: number
): Promise<string[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.playsInline = true;
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      reject(new Error('Failed to load video for thumbnail extraction'));
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
  });

  const canvas = document.createElement('canvas');
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const safeEnd = Math.min(endSec, video.duration || endSec);
  const duration = Math.max(0.05, safeEnd - startSec);
  const thumbnails: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = Math.min(video.duration || safeEnd, startSec + (duration * (i + 0.5)) / count);
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = t;
    });
    ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
    thumbnails.push(canvas.toDataURL('image/jpeg', 0.55));
  }

  video.src = '';
  return thumbnails;
}

/**
 * Returns cached (or freshly generated) frame thumbnails for a clip's source
 * range. `count` should scale with the clip's rendered pixel width so
 * zooming the timeline in/out reveals more or fewer actual frames.
 */
export function getVideoThumbnails(
  videoUrl: string,
  sourceStartMs: number,
  sourceEndMs: number,
  count: number,
  thumbWidth = 64,
  thumbHeight = 36
): Promise<string[]> {
  if (count <= 0) return Promise.resolve([]);

  const startSec = sourceStartMs / 1000;
  const endSec = sourceEndMs / 1000;
  const key = `${videoUrl}|${startSec.toFixed(2)}|${endSec.toFixed(2)}|${count}`;

  let cached = cache.get(key);
  if (!cached) {
    cached = captureThumbnails(videoUrl, startSec, endSec, count, thumbWidth, thumbHeight);
    cache.set(key, cached);
    cached.catch(() => cache.delete(key));
  }
  return cached;
}
