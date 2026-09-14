import { AspectRatio, CaptionSegment, CaptionStyle } from '../types';

interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeMs: number;
  aspectRatio: AspectRatio;
  activeCaption: CaptionSegment | null;
  captionStyle: CaptionStyle;
  customVideoElement?: HTMLVideoElement | null;
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
}: RenderFrameOptions) {
  // If user uploaded their own video and it has a decoded frame ready, draw it
  // — regardless of play/pause state, so the canvas always shows the frame at
  // the current scrub/pause position instead of falling back to the placeholder.
  if (customVideoElement && customVideoElement.readyState >= 2) {
    ctx.drawImage(customVideoElement, 0, 0, width, height);
  } else {
    drawEmptyState(ctx, width, height);
  }

  // Draw End Card (if within last 6 seconds of a clip or active)
  // Drawn if specified or at final outro

  // Draw Live Captions
  if (activeCaption) {
    drawCaptionOverlay(ctx, width, height, activeCaption, captionStyle, timeMs, aspectRatio);
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

function drawCaptionOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  caption: CaptionSegment,
  style: CaptionStyle,
  _timeMs: number,
  aspectRatio: AspectRatio
) {
  ctx.save();
  const isVertical = w < h || aspectRatio === '9:16' || aspectRatio === '3:4';

  // Apply casing
  let text = caption.text;
  const effectiveCase = style.textCase || (style.uppercase ? 'uppercase' : 'none');
  if (effectiveCase === 'uppercase') {
    text = text.toUpperCase();
  } else if (effectiveCase === 'lowercase') {
    text = text.toLowerCase();
  } else if (effectiveCase === 'title') {
    text = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
  }

  // Calculate dynamic vertical position
  let y = h * 0.72;
  if (style.position === 'center') {
    y = h * 0.50;
  } else if (style.position === 'lower-third') {
    y = isVertical ? h * 0.68 : h * 0.75;
  } else {
    // bottom safe
    y = isVertical ? h * 0.76 : h * 0.84;
  }

  // Determine font
  const baseFontSize = isVertical ? style.fontSize : style.fontSize * 1.15;
  const fontStyle = style.isItalic ? 'italic ' : '';
  const fontWeight = style.isBold !== false ? '800' : '500';
  ctx.font = `${fontStyle}${fontWeight} ${baseFontSize}px "${style.fontFamily}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Split into 2-3 lines max for optimal mobile short-form readability
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const maxLineChars = isVertical ? 22 : 36;

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxLineChars) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const lineHeight = baseFontSize * 1.35;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    const lineY = startY + index * lineHeight;
    const textWidth = ctx.measureText(line).width;

    ctx.save();

    // 1. Badge Background if set
    if (style.badgeBgColor) {
      const padX = 16;
      const padY = 8;
      const boxW = textWidth + padX * 2;
      const boxH = baseFontSize + padY;
      const boxX = w * 0.5 - boxW / 2;
      const boxY = lineY - baseFontSize / 2 - padY / 2;

      ctx.fillStyle = style.badgeBgColor;
      roundRect(ctx, boxX, boxY, boxW, boxH, 8);
      ctx.fill();

      if (style.badgeBorderColor) {
        ctx.strokeStyle = style.badgeBorderColor;
        ctx.lineWidth = 2;
        roundRect(ctx, boxX, boxY, boxW, boxH, 8);
        ctx.stroke();
      }
    } else if (style.templateType === 'minimal' || style.backgroundColor) {
      const padX = 18;
      const padY = 8;
      ctx.fillStyle = style.backgroundColor || 'rgba(20, 33, 61, 0.75)';
      roundRect(
        ctx,
        w * 0.5 - textWidth / 2 - padX,
        lineY - baseFontSize / 2 - padY / 2,
        textWidth + padX * 2,
        baseFontSize + padY,
        8
      );
      ctx.fill();
    } else if (style.templateType === 'modern-kinetic') {
      const padX = 22;
      const padY = 10;
      const boxW = textWidth + padX * 2;
      const boxH = baseFontSize + padY;
      const boxX = w * 0.5 - boxW / 2;
      const boxY = lineY - baseFontSize / 2 - padY / 2;

      ctx.fillStyle = 'rgba(20, 33, 61, 0.92)';
      roundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = style.highlightColor || '#FCA311';
      ctx.lineWidth = 2;
      roundRect(ctx, boxX, boxY, boxW, boxH, 10);
      ctx.stroke();
    }

    // 2. Shadows & Glow
    if (style.glowColor) {
      ctx.shadowColor = style.glowColor;
      ctx.shadowBlur = style.shadowBlur || 16;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (style.shadowColor) {
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = style.shadowBlur !== undefined ? style.shadowBlur : 4;
      ctx.shadowOffsetX = style.shadowOffsetX !== undefined ? style.shadowOffsetX : 2;
      ctx.shadowOffsetY = style.shadowOffsetY !== undefined ? style.shadowOffsetY : 3;
    }

    // 3. Stroke / Outline
    if (style.strokeColor) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth || Math.max(5, baseFontSize * 0.2);
      ctx.lineJoin = 'round';
      ctx.strokeText(line, w * 0.5, lineY);
    }

    // 4. Fill Text
    ctx.fillStyle = style.textColor || '#FFFFFF';
    ctx.fillText(line, w * 0.5, lineY);

    // 5. Underline if enabled
    if (style.isUnderline) {
      const underlineY = lineY + baseFontSize * 0.5 + 3;
      ctx.strokeStyle = style.textColor || '#FFFFFF';
      ctx.lineWidth = Math.max(2, baseFontSize * 0.08);
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - textWidth / 2, underlineY);
      ctx.lineTo(w * 0.5 + textWidth / 2, underlineY);
      ctx.stroke();
    }

    ctx.restore();
  });

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  _radius?: number | number[]
) {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.closePath();
}
