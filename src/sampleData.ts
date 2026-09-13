import {
  Track,
  CaptionSegment,
  AIClipCandidate,
  TeachingSummary,
  ChurchBranding,
  SilenceSegment,
  CaptionStyle,
} from './types';

export const DEFAULT_CHURCH_BRANDING: ChurchBranding = {
  churchName: 'Higher Life Commission',
  address: '2nd Floor, 65 11th Road, Kew, Johannesburg, 2090',
  serviceTimes: 'Sunday 9:00 AM–12:00 PM; Thursday 6:00 PM–8:00 PM',
  phone: '+27 11 887 4200',
  website: 'www.commissionhigherlife.org',
  showLowerThird: true,
  showEndCard: true,
  includeInSocialCopy: true,
};

export const DEFAULT_CAPTION_STYLES: Record<'minimal' | 'bold-impact' | 'modern-kinetic', CaptionStyle> = {
  'minimal': {
    templateType: 'minimal',
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 22,
    textColor: '#FFFFFF',
    highlightColor: '#FCA311',
    backgroundColor: 'rgba(20, 33, 61, 0.75)',
    animation: 'fade',
    position: 'bottom',
    uppercase: false,
  },
  'bold-impact': {
    templateType: 'bold-impact',
    fontFamily: 'Montserrat',
    fontSize: 28,
    textColor: '#FFFFFF',
    highlightColor: '#FCA311',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    strokeColor: '#000000',
    animation: 'pop',
    position: 'center',
    uppercase: true,
  },
  'modern-kinetic': {
    templateType: 'modern-kinetic',
    fontFamily: 'Space Grotesk',
    fontSize: 24,
    textColor: '#FFFFFF',
    highlightColor: '#FCA311',
    backgroundColor: 'rgba(20, 33, 61, 0.90)',
    strokeColor: '#14213D',
    animation: 'highlight',
    position: 'lower-third',
    uppercase: false,
  },
};

export const SAMPLE_TEACHING_SUMMARY: TeachingSummary = {
  title: 'Activating Divine Authority in Your Everyday Life',
  summary:
    'In this powerful teaching, we discover that God never called believers to passively wait for circumstances to align, but to step forward in bold obedience and faith. Real authority is unleashed the moment you take action on spiritual revelation, transforming closed doors into stepping stones of divine purpose.',
  hashtags: [
    '#DivinePurpose',
    '#FaithInAction',
    '#HigherLifeCommission',
    '#JohannesburgChurch',
    '#KingdomLiving',
  ],
};

export const SAMPLE_CAPTIONS: CaptionSegment[] = [
  {
    id: 'cap-1',
    startMs: 2000,
    endMs: 7500,
    text: 'Welcome to Higher Life Commission. Today we are unpacking divine purpose.',
    confidence: 0.99,
  },
  {
    id: 'cap-2',
    startMs: 8200,
    endMs: 14000,
    text: 'Many people spend years asking God for a sign, when God already said Go.',
    confidence: 0.98,
  },
  {
    id: 'cap-3',
    startMs: 14500,
    endMs: 21000,
    text: 'Stop praying for what God already gave you the spiritual authority to take!',
    confidence: 0.97,
  },
  {
    id: 'cap-4',
    startMs: 21800,
    endMs: 29500,
    text: 'Faith is never passive. Faith is an aggressive conviction that moves mountains.',
    confidence: 0.99,
  },
  {
    id: 'cap-5',
    startMs: 31000,
    endMs: 38000,
    text: 'When Moses stood before the Red Sea, God said, why are you crying out to me?',
    confidence: 0.98,
  },
  {
    id: 'cap-6',
    startMs: 38800,
    endMs: 46000,
    text: 'Lift up your rod! Stretch out your hand over the water and divide it!',
    confidence: 0.99,
  },
  {
    id: 'cap-7',
    startMs: 48000,
    endMs: 56000,
    text: 'The power wasn’t in the wood of the rod; the power was in the obedience to the word.',
    confidence: 0.96,
  },
  {
    id: 'cap-8',
    startMs: 58000,
    endMs: 67000,
    text: 'Whatever sphere of life you step into this week, know that your atmosphere shifts with you.',
    confidence: 0.98,
  },
  {
    id: 'cap-9',
    startMs: 68500,
    endMs: 76000,
    text: 'You carry divine presence. Don’t settle for the commentary of the natural world.',
    confidence: 0.97,
  },
  {
    id: 'cap-10',
    startMs: 78000,
    endMs: 86500,
    text: 'God didn’t call you to be an admirer of the promise; He called you to be a possessor of it!',
    confidence: 0.99,
  },
  {
    id: 'cap-11',
    startMs: 88000,
    endMs: 96000,
    text: 'Join us every Sunday at 9:00 AM in Kew, Johannesburg, as we grow together.',
    confidence: 0.99,
  },
];

export const SAMPLE_SILENCES: SilenceSegment[] = [
  { id: 'sil-1', startMs: 7500, endMs: 8200, durationMs: 700 },
  { id: 'sil-2', startMs: 14000, endMs: 14500, durationMs: 500 },
  { id: 'sil-3', startMs: 29500, endMs: 31000, durationMs: 1500 },
  { id: 'sil-4', startMs: 46000, endMs: 48000, durationMs: 2000 },
  { id: 'sil-5', startMs: 56000, endMs: 58000, durationMs: 2000 },
  { id: 'sil-6', startMs: 67000, endMs: 68500, durationMs: 1500 },
  { id: 'sil-7', startMs: 76000, endMs: 78000, durationMs: 2000 },
  { id: 'sil-8', startMs: 86500, endMs: 88000, durationMs: 1500 },
];

export const SAMPLE_AI_CLIPS: AIClipCandidate[] = [
  {
    id: 'clip-ai-1',
    title: 'Stop Praying for What You Already Have',
    hook: 'Stop praying for what God already gave you the authority to take!',
    startMs: 14500,
    endMs: 46000,
    durationMs: 31500,
    score: 98,
    rationale:
      'High-impact viral hook in the first 3 seconds, explosive energetic delivery, and practical teaching punchline.',
    keyTakeaway: 'Authority requires proactive obedience, not passive hesitation.',
  },
  {
    id: 'clip-ai-2',
    title: 'Admirer vs. Possessor of the Promise',
    hook: 'God didn’t call you to be an admirer of the promise; He called you to be a possessor of it!',
    startMs: 68500,
    endMs: 96000,
    durationMs: 27500,
    score: 95,
    rationale:
      'Memorable dichotomy that drives comments, saves, and shares across Instagram Reels & TikTok.',
    keyTakeaway: 'Possessing your inheritance requires active faith alignment.',
  },
  {
    id: 'clip-ai-3',
    title: 'The Red Sea Principle & Your Rod',
    hook: 'When Moses stood before the sea, God asked: Why are you crying out to me?',
    startMs: 31000,
    endMs: 67000,
    durationMs: 36000,
    score: 92,
    rationale:
      'Classic biblical narrative applied immediately to modern workplace and family challenges.',
    keyTakeaway: 'Use what is in your hands under God’s direct command.',
  },
];

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-video',
    type: 'video',
    name: 'Video Track 1',
    muted: false,
    orderIndex: 0,
    clips: [
      {
        id: 'clip-v1',
        trackId: 'track-video',
        name: 'Sermon Opening & Hook',
        startMs: 0,
        endMs: 30000,
        sourceStartMs: 0,
        sourceEndMs: 30000,
        color: '#14213D',
      },
      {
        id: 'clip-v2',
        trackId: 'track-video',
        name: 'Teaching Revelation & Scriptural Core',
        startMs: 30000,
        endMs: 65000,
        sourceStartMs: 30000,
        sourceEndMs: 65000,
        color: '#1E2D4F',
      },
      {
        id: 'clip-v3',
        trackId: 'track-video',
        name: 'Call to Action & Outro',
        startMs: 65000,
        endMs: 98000,
        sourceStartMs: 65000,
        sourceEndMs: 98000,
        color: '#14213D',
      },
    ],
  },
  {
    id: 'track-audio',
    type: 'audio',
    name: 'Vocal Audio Track',
    muted: false,
    orderIndex: 1,
    clips: [
      {
        id: 'clip-a1',
        trackId: 'track-audio',
        name: 'Voice Audio Main',
        startMs: 0,
        endMs: 98000,
        sourceStartMs: 0,
        sourceEndMs: 98000,
        color: '#FCA311',
      },
    ],
  },
];

export const SAMPLE_PROJECT = {
  id: 'project-sunday-teaching',
  name: 'Activating Divine Authority (1hr Teaching)',
  durationMs: 98000,
  tracks: INITIAL_TRACKS,
  captions: SAMPLE_CAPTIONS,
  silenceSegments: SAMPLE_SILENCES,
  aiClipCandidates: SAMPLE_AI_CLIPS,
  transcriptText:
    "Welcome to Higher Life Commission. Today we are unpacking divine purpose. Many people spend years asking God for a sign, when God already said Go. Stop praying for what God already gave you the spiritual authority to take! Faith is never passive. Faith is an aggressive conviction that moves mountains. When Moses stood before the Red Sea, God said, why are you crying out to me? Lift up your rod! Stretch out your hand over the water and divide it! The power wasn’t in the wood of the rod; the power was in the obedience to the word. Whatever sphere of life you step into this week, know that your atmosphere shifts with you. You carry divine presence. Don't settle for the commentary of the natural world. God didn't call you to be an admirer of the promise; He called you to be a possessor of it! Join us every Sunday at 9:00 AM in Kew, Johannesburg, as we grow together.",
};
