export interface Clip {
  id: string;
  trackId: string;
  name: string;
  startMs: number;
  endMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  color?: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface Track {
  id: string;
  type: 'video' | 'audio';
  name: string;
  muted: boolean;
  orderIndex: number;
  clips: Clip[];
}

export interface CaptionWord {
  word: string;
  startMs: number;
  endMs: number;
}

export interface CaptionSegment {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  words?: CaptionWord[];
}

export type CaptionTemplateType = 'minimal' | 'bold-impact' | 'modern-kinetic' | string;

export interface CaptionStyle {
  templateType: CaptionTemplateType;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  highlightColor: string;
  backgroundColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  animation: 'pop' | 'highlight' | 'fade' | 'slide-up' | 'none';
  position: 'bottom' | 'center' | 'lower-third';
  uppercase: boolean;
  textCase?: 'uppercase' | 'lowercase' | 'title' | 'none';
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  effectId?: string;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowColor?: string;
  badgeBgColor?: string;
  badgeBorderColor?: string;
}

export interface AIClipCandidate {
  id: string;
  title: string;
  hook: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  score: number;
  rationale: string;
  keyTakeaway: string;
}

export interface TeachingSummary {
  title: string;
  summary: string;
  hashtags: string[]; // exactly 5 hashtags
}

export interface ChurchBranding {
  churchName: string;
  address: string;
  serviceTimes: string;
  phone: string;
  website: string;
  showLowerThird: boolean;
  showEndCard: boolean;
  includeInSocialCopy: boolean;
}

export interface SilenceSegment {
  id: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface SilenceSettings {
  thresholdDb: number;
  minSilenceMs: number;
  paddingMs: number;
}

export type AspectRatio = '9:16' | '16:9' | '4:3' | '2:1' | '3:4' | '1:1';

export interface ExportSettings {
  format: 'mp4' | 'webm';
  aspectRatio: AspectRatio;
  resolution: '1080p' | '720p';
  burnCaptions: boolean;
  includeBranding: boolean;
  frameRate: 30 | 60;
}
