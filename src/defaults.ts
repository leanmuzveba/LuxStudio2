import { ChurchBranding, CaptionStyle } from './types';

// Blank starting values for a brand-new project — no fictitious church or
// sermon content, just what a fresh workspace defaults to before the user
// fills anything in.
export const DEFAULT_CHURCH_BRANDING: ChurchBranding = {
  churchName: '',
  address: '',
  serviceTimes: '',
  phone: '',
  website: '',
  showLowerThird: false,
  showEndCard: false,
  includeInSocialCopy: false,
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
