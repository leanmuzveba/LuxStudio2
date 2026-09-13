/**
 * Helper utilities for timecodes, waveform calculation, and formatting
 */

export function formatTimecode(ms: number, showFrames = true, fps = 30): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const frameDurationMs = 1000 / fps;
  const frames = Math.min(fps - 1, Math.floor((ms % 1000) / frameDurationMs));

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');

  return showFrames
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      textArea.remove();
      return Promise.resolve(true);
    } catch (error) {
      textArea.remove();
      return Promise.resolve(false);
    }
  }
}
