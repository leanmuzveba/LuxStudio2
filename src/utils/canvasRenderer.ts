import { AspectRatio, CaptionSegment, CaptionStyle, VideoFraming } from '../types';

interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeMs: number;
  aspectRatio: AspectRatio;
  activeCaption: CaptionSegment | null;
  captionStyle: CaptionStyle;
  customVideoElement?: HTMLVideoElement | null;
  framing?: VideoFraming;
  /** Run caption entrance animations (playing); paused frames show captions fully in. */
  animate?: boolean;
}

/** Where the video lands in a w×h frame: aspect preserved, zoomed from "fit", panned within its overflow. */
export function framedRect(vw: number, vh: number, w: number, h: number, f: VideoFraming) {
  const scale = Math.min(w / vw, h / vh) * f.zoom;
  const dw = vw * scale;
  const dh = vh * scale;
  // Overflow is split evenly at x=0; x=-1 shows the left edge, x=1 the right.
  return {
    x: (w - dw) / 2 - (f.x * Math.max(0, dw - w)) / 2,
    y: (h - dh) / 2 - (f.y * Math.max(0, dh - h)) / 2,
    w: dw,
    h: dh,
  };
}

export function drawVideoFrame({
  ctx,
  width,
  height,
  timeMs,
  aspectRatio,
  activeCaption,
  captionStyle,
  customVideoElement,
  framing = { zoom: 1, x: 0, y: 0 },
  animate = true,
}: RenderFrameOptions) {
  // If user uploaded their own video and it has a decoded frame ready, draw it
  // — regardless of play/pause state, so the canvas always shows the frame at
  // the current scrub/pause position instead of falling back to the placeholder.
  if (customVideoElement && customVideoElement.readyState >= 2 && customVideoElement.videoWidth > 0) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const r = framedRect(customVideoElement.videoWidth, customVideoElement.videoHeight, width, height, framing);
    ctx.drawImage(customVideoElement, r.x, r.y, r.w, r.h);
  } else {
    drawEmptyState(ctx, width, height);
  }

  // Draw End Card (if within last 6 seconds of a clip or active)
  // Drawn if specified or at final outro

  // Draw Live Captions
  if (activeCaption) {
    drawCaptionOverlay(ctx, width, height, activeCaption, captionStyle, timeMs, aspectRatio, animate);
  }
}

/** Plain empty canvas shown before any video is loaded — no simulated footage or sample branding. */
function drawEmptyState(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0f1d');
  grad.addColorStop(1, '#050811');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  const iconSize = Math.min(w, h) * 0.12;
  roundRect(ctx, w * 0.5 - iconSize / 2, h * 0.5 - iconSize / 2, iconSize, iconSize, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - iconSize * 0.15, h * 0.5 - iconSize * 0.2);
  ctx.lineTo(w * 0.5 + iconSize * 0.22, h * 0.5);
  ctx.lineTo(w * 0.5 - iconSize * 0.15, h * 0.5 + iconSize * 0.2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Upload a video to begin', w * 0.5, h * 0.5 + iconSize * 0.9);
}

interface TimedWord { text: string; startMs: number; endMs: number }

/**
 * Word timings for a caption line: the real per-word timings when the
 * caption has them, otherwise the line's duration shared out by word length
 * (longer words take longer to say), which is close enough for paging.
 */
export function captionWordTimings(caption: CaptionSegment): TimedWord[] {
  const real = caption.words?.filter((w) => w.word.trim());
  if (real && real.length) return real.map((w) => ({ text: w.word.trim(), startMs: w.startMs, endMs: w.endMs }));
  const words = caption.text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const dur = Math.max(1, caption.endMs - caption.startMs);
  let t = caption.startMs;
  return words.map((text, i) => {
    const startMs = t;
    t += (dur * weights[i]) / total;
    return { text, startMs, endMs: t };
  });
}

/**
 * Subtitle paging: a caption line is shown a few words at a time
 * (wordsPerLine x maxLines per page), each page appearing when its first word
 * is spoken. Returns the page on screen at timeMs, split into lines.
 */
export function captionPageAt(words: TimedWord[], timeMs: number, wordsPerLine: number, maxLines: number) {
  const perLine = Math.max(1, wordsPerLine);
  const perPage = perLine * Math.max(1, maxLines);
  let pageStart = 0;
  for (let i = 0; i < words.length; i += perPage) if (words[i].startMs <= timeMs) pageStart = i;
  const page = words.slice(pageStart, pageStart + perPage);
  const lines: TimedWord[][] = [];
  for (let i = 0; i < page.length; i += perLine) lines.push(page.slice(i, i + perLine));
  return { lines, startMs: page[0]?.startMs ?? 0 };
}

const ANIM_MS = 260;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
// Overshoots past 1 then settles: the "bounce" in Pop.
const easeOutBack = (p: number) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);

function applyCase(text: string, style: CaptionStyle) {
  const c = style.textCase || (style.uppercase ? 'uppercase' : 'none');
  if (c === 'uppercase') return text.toUpperCase();
  if (c === 'lowercase') return text.toLowerCase();
  if (c === 'title') return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return text;
}

function drawCaptionOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  caption: CaptionSegment,
  style: CaptionStyle,
  timeMs: number,
  aspectRatio: AspectRatio,
  animate: boolean
) {
  const isVertical = w < h || aspectRatio === '9:16' || aspectRatio === '3:4';
  const wordsPerLine = style.wordsPerLine ?? (isVertical ? 3 : 6);
  const maxLines = style.maxLines ?? 1;
  const { lines, startMs } = captionPageAt(captionWordTimings(caption), timeMs, wordsPerLine, maxLines);
  if (!lines.length) return;

  let y: number;
  if (style.position === 'center') y = h * 0.5;
  else if (style.position === 'lower-third') y = isVertical ? h * 0.68 : h * 0.75;
  else y = isVertical ? h * 0.76 : h * 0.84;

  const fontStyle = style.isItalic ? 'italic ' : '';
  const fontWeight = style.isBold !== false ? '800' : '500';
  let fontSize = isVertical ? style.fontSize : style.fontSize * 1.15;
  const setFont = () => {
    ctx.font = `${fontStyle}${fontWeight} ${fontSize}px "${style.fontFamily}", sans-serif`;
  };
  setFont();
  const texts = lines.map((line) => line.map((word) => applyCase(word.text, style)));
  const lineWidth = (ws: string[]) =>
    ws.reduce((a, t) => a + ctx.measureText(t).width, 0) + ctx.measureText(' ').width * (ws.length - 1);
  // A page never overflows the frame: shrink the font rather than wrap more.
  const widest = Math.max(...texts.map(lineWidth));
  if (widest > w * 0.88) {
    fontSize *= (w * 0.88) / widest;
    setFont();
  }
  const spaceW = ctx.measureText(' ').width;

  // Page entrance animation.
  const p = animate ? clamp01((timeMs - startMs) / ANIM_MS) : 1;
  let alpha = 1;
  let scale = 1;
  let offsetY = 0;
  if (style.animation === 'fade') alpha = easeOut(p);
  else if (style.animation === 'pop') {
    scale = 0.6 + 0.4 * easeOutBack(p);
    alpha = clamp01(p * 3);
  } else if (style.animation === 'slide-up') {
    offsetY = (1 - easeOut(p)) * fontSize * 0.9;
    alpha = easeOut(p);
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(w / 2, y + offsetY);
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const lineHeight = fontSize * 1.3;
  const top = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, li) => {
    const ly = top + li * lineHeight;
    const lw = lineWidth(texts[li]);

    // Box behind the line: the template's badge or backdrop colour.
    const box = style.badgeBgColor || style.backgroundColor;
    if (box) {
      const padX = fontSize * 0.45;
      const padY = fontSize * 0.22;
      ctx.fillStyle = box;
      roundRect(ctx, -lw / 2 - padX, ly - fontSize / 2 - padY, lw + padX * 2, fontSize + padY * 2, fontSize * 0.3);
      ctx.fill();
      if (style.badgeBorderColor || style.templateType === 'modern-kinetic') {
        ctx.strokeStyle = style.badgeBorderColor || style.highlightColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    let x = -lw / 2;
    line.forEach((word, wi) => {
      const text = texts[li][wi];
      const ww = ctx.measureText(text).width;
      const spoken = timeMs >= word.startMs;
      const active = spoken && timeMs < word.endMs;

      ctx.save();
      let color = style.textColor || '#FFFFFF';
      if (style.animation === 'highlight') {
        // Karaoke style: the word being said pops in the highlight colour;
        // words not said yet are dimmed.
        if (active) {
          color = style.highlightColor || '#FCA311';
          const s = 1.03 + 0.05 * Math.sin(Math.PI * clamp01((timeMs - word.startMs) / 180));
          ctx.translate(x + ww / 2, ly);
          ctx.scale(s, s);
          ctx.translate(-(x + ww / 2), -ly);
        } else if (!spoken) {
          ctx.globalAlpha *= 0.5;
        }
      }

      if (style.glowColor) {
        ctx.shadowColor = style.glowColor;
        ctx.shadowBlur = style.shadowBlur || 16;
      } else if (style.shadowColor) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur ?? 4;
        ctx.shadowOffsetX = style.shadowOffsetX ?? 2;
        ctx.shadowOffsetY = style.shadowOffsetY ?? 3;
      }
      if (style.strokeColor) {
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth || Math.max(4, fontSize * 0.18);
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, ly);
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, ly);
      if (style.isUnderline) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, fontSize * 0.08);
        ctx.beginPath();
        ctx.moveTo(x, ly + fontSize * 0.55);
        ctx.lineTo(x + ww, ly + fontSize * 0.55);
        ctx.stroke();
      }
      ctx.restore();
      x += ww + spaceW;
    });
  });
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}
