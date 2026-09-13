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
  // If user uploaded their own video and it's ready, draw it!
  if (
    customVideoElement &&
    customVideoElement.readyState >= 2 &&
    !customVideoElement.paused
  ) {
    ctx.drawImage(customVideoElement, 0, 0, width, height);
  } else {
    // Generate realistic studio/sanctuary presentation background
    drawSermonBackground(ctx, width, height, timeMs, aspectRatio);
  }

  // Draw End Card (if within last 6 seconds of a clip or active)
  // Drawn if specified or at final outro

  // Draw Live Captions
  if (activeCaption) {
    drawCaptionOverlay(ctx, width, height, activeCaption, captionStyle, timeMs, aspectRatio);
  }
}

function drawSermonBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  timeMs: number,
  aspectRatio: AspectRatio
) {
  // Deep Navy & Charcoal church sanctuary stage gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0f1d');
  grad.addColorStop(0.4, '#14213d');
  grad.addColorStop(1, '#050811');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft stage spotlight ambiance (warm gold #FCA311 glow)
  const pulse = Math.sin(timeMs / 1200) * 0.05;
  const spotGrad = ctx.createRadialGradient(
    w * 0.5,
    h * 0.38,
    20,
    w * 0.5,
    h * 0.42,
    w * 0.65
  );
  spotGrad.addColorStop(0, `rgba(252, 163, 17, ${0.28 + pulse})`);
  spotGrad.addColorStop(0.5, 'rgba(20, 33, 61, 0.4)');
  spotGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, w, h);

  // Stylized Sermon Stage Background Graphic Elements
  ctx.save();
  ctx.strokeStyle = 'rgba(252, 163, 17, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.4, w * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Speaker silhouette / podium illustration representation
  const speakerX = w * 0.5;
  const speakerY = h * 0.56;

  // Subtle speaker movement animation
  const sway = Math.sin(timeMs / 600) * 3;
  const breathe = Math.cos(timeMs / 800) * 2;

  // Speaker head and body silhouette
  ctx.save();
  ctx.fillStyle = '#080d1a';
  // Head
  ctx.beginPath();
  ctx.arc(speakerX + sway, speakerY - 90 + breathe, 40, 0, Math.PI * 2);
  ctx.fill();

  const isVertical = w < h || aspectRatio === '9:16' || aspectRatio === '3:4';

  // Shoulders & torso
  ctx.beginPath();
  ctx.ellipse(
    speakerX + sway,
    speakerY + 20 + breathe,
    isVertical ? 95 : 120,
    110,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Accent rim lighting on speaker (Gold #FCA311 highlight)
  ctx.strokeStyle = '#FCA311';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(speakerX + sway - 15, speakerY - 95 + breathe, 28, Math.PI * 0.9, Math.PI * 1.6);
  ctx.stroke();

  // Lectern / pulpit with church emblem
  const pulpitW = isVertical ? 160 : 200;
  const pulpitH = h * 0.35;
  const pulpitX = w * 0.5 - pulpitW / 2;
  const pulpitY = h * 0.65;

  const pulpitGrad = ctx.createLinearGradient(pulpitX, pulpitY, pulpitX, pulpitY + pulpitH);
  pulpitGrad.addColorStop(0, '#101a2e');
  pulpitGrad.addColorStop(1, '#050811');
  ctx.fillStyle = pulpitGrad;

  // Rounded top pulpit
  roundRect(ctx, pulpitX, pulpitY, pulpitW, pulpitH, 12);
  ctx.fill();

  // Pulpit gold edge
  ctx.strokeStyle = 'rgba(252, 163, 17, 0.4)';
  ctx.lineWidth = 2;
  roundRect(ctx, pulpitX, pulpitY, pulpitW, pulpitH, 12);
  ctx.stroke();

  // Mini church cross / logo on pulpit
  ctx.fillStyle = '#FCA311';
  ctx.fillRect(w * 0.5 - 2, pulpitY + 22, 4, 24);
  ctx.fillRect(w * 0.5 - 10, pulpitY + 28, 20, 4);

  // "HIGHER LIFE" text on pulpit
  ctx.fillStyle = '#E5E5E5';
  ctx.font = '700 11px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HIGHER LIFE COMMISSION', w * 0.5, pulpitY + 62);
  ctx.restore();

  // Audio level meters on top right
  drawAudioMeter(ctx, w - 80, 24, timeMs);
}

function drawAudioMeter(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
  ctx.save();
  const barCount = 6;
  const barW = 4;
  const maxH = 20;

  for (let i = 0; i < barCount; i++) {
    const rawLevel = Math.sin(timeMs / 180 + i * 1.5) * 0.5 + 0.5;
    const h = Math.max(4, rawLevel * maxH);
    ctx.fillStyle = i >= 4 ? '#ef4444' : i >= 3 ? '#FCA311' : '#22c55e';
    ctx.fillRect(x + i * 7, y + maxH - h, barW, h);
  }
  ctx.restore();
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
