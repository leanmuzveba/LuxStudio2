import React, { useState, useMemo } from 'react';
import {
  Search,
  Scissors,
  Languages,
  ListFilter,
  HelpCircle,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Star,
  Download,
  Ban,
  Check,
  Play,
  Volume2,
  Crosshair,
} from 'lucide-react';
import { CaptionSegment, CaptionStyle } from '../types';

interface CaptionsEditorProps {
  captions: CaptionSegment[];
  onCaptionsChange: (captions: CaptionSegment[]) => void;
  captionStyle: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  onAutoGenerateCaptions: () => void;
  isTranscribing: boolean;
}

// Letter Effects Presets (Corresponding to Screenshot 3 Aa Grid)
interface AaEffectPreset {
  id: string;
  name: string;
  apply: Partial<CaptionStyle>;
  previewClass: string;
  previewStyle?: React.CSSProperties;
  isNone?: boolean;
}

const AA_EFFECT_PRESETS: AaEffectPreset[] = [
  {
    id: 'none',
    name: 'None',
    isNone: true,
    apply: {
      effectId: 'none',
      textColor: '#FFFFFF',
      strokeColor: undefined,
      strokeWidth: 0,
      shadowColor: undefined,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      badgeBgColor: undefined,
      badgeBorderColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'flex items-center justify-center text-gray-400',
  },
  {
    id: 'white-heavy-shadow',
    name: 'White Shadow',
    apply: {
      effectId: 'white-heavy-shadow',
      textColor: '#FFFFFF',
      strokeColor: undefined,
      shadowColor: 'rgba(0,0,0,0.95)',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 3,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]',
  },
  {
    id: 'white-black-outline',
    name: 'White Outline',
    apply: {
      effectId: 'white-black-outline',
      textColor: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4,
      shadowColor: undefined,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-white font-black',
    previewStyle: {
      WebkitTextStroke: '1.5px #000000',
    },
  },
  {
    id: 'white-3d-shadow',
    name: 'White 3D',
    apply: {
      effectId: 'white-3d-shadow',
      textColor: '#FFFFFF',
      strokeColor: undefined,
      shadowColor: '#000000',
      shadowBlur: 0,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-white font-black',
    previewStyle: {
      textShadow: '2px 2px 0px #000000',
    },
  },
  {
    id: 'white-dark-glow',
    name: 'White Soft Shadow',
    apply: {
      effectId: 'white-dark-glow',
      textColor: '#FFFFFF',
      strokeColor: undefined,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-white font-black drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]',
  },
  {
    id: 'yellow-black-stroke',
    name: 'Yellow Stroke',
    apply: {
      effectId: 'yellow-black-stroke',
      textColor: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 4,
      shadowColor: 'rgba(0,0,0,0.8)',
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#FACC15] font-black',
    previewStyle: {
      WebkitTextStroke: '1.5px #000000',
    },
  },
  {
    id: 'red-white-outline',
    name: 'Red Outline',
    apply: {
      effectId: 'red-white-outline',
      textColor: '#EF4444',
      strokeColor: '#FFFFFF',
      strokeWidth: 3,
      shadowColor: 'rgba(0,0,0,0.8)',
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#EF4444] font-black',
    previewStyle: {
      WebkitTextStroke: '1px #FFFFFF',
    },
  },
  {
    id: 'orange-white-outline',
    name: 'Orange Outline',
    apply: {
      effectId: 'orange-white-outline',
      textColor: '#F97316',
      strokeColor: '#FFFFFF',
      strokeWidth: 3,
      shadowColor: 'rgba(0,0,0,0.8)',
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#F97316] font-black',
    previewStyle: {
      WebkitTextStroke: '1px #FFFFFF',
    },
  },
  {
    id: 'blue-white-outline',
    name: 'Sky Blue',
    apply: {
      effectId: 'blue-white-outline',
      textColor: '#0EA5E9',
      strokeColor: '#FFFFFF',
      strokeWidth: 3,
      shadowColor: 'rgba(0,0,0,0.8)',
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#0EA5E9] font-black',
    previewStyle: {
      WebkitTextStroke: '1px #FFFFFF',
    },
  },
  {
    id: 'neon-green-stroke',
    name: 'Neon Green',
    apply: {
      effectId: 'neon-green-stroke',
      textColor: '#22C55E',
      strokeColor: '#000000',
      strokeWidth: 4,
      shadowColor: 'rgba(0,0,0,0.8)',
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#22C55E] font-black',
    previewStyle: {
      WebkitTextStroke: '1.5px #000000',
    },
  },
  {
    id: 'black-on-light-gray',
    name: 'Light Gray Badge',
    apply: {
      effectId: 'black-on-light-gray',
      textColor: '#000000',
      badgeBgColor: '#9CA3AF',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-[#9CA3AF] text-black font-black px-2 py-0.5 rounded',
  },
  {
    id: 'white-on-dark-gray',
    name: 'Dark Gray Badge',
    apply: {
      effectId: 'white-on-dark-gray',
      textColor: '#FFFFFF',
      badgeBgColor: '#4B5563',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-[#4B5563] text-white font-black px-2 py-0.5 rounded',
  },
  {
    id: 'black-on-yellow',
    name: 'Yellow Badge',
    apply: {
      effectId: 'black-on-yellow',
      textColor: '#000000',
      badgeBgColor: '#FACC15',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-[#FACC15] text-black font-black px-2 py-0.5 rounded',
  },
  {
    id: 'white-on-purple',
    name: 'Purple Badge',
    apply: {
      effectId: 'white-on-purple',
      textColor: '#FFFFFF',
      badgeBgColor: '#7C3AED',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-[#7C3AED] text-white font-black px-2 py-0.5 rounded',
  },
  {
    id: 'purple-on-white',
    name: 'White Badge Purple',
    apply: {
      effectId: 'purple-on-white',
      textColor: '#7C3AED',
      badgeBgColor: '#FFFFFF',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-white text-[#7C3AED] font-black px-2 py-0.5 rounded',
  },
  {
    id: 'black-on-white',
    name: 'White Pill Black',
    apply: {
      effectId: 'black-on-white',
      textColor: '#000000',
      badgeBgColor: '#FFFFFF',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-white text-black font-black px-2 py-0.5 rounded',
  },
  {
    id: 'white-on-black',
    name: 'Black Pill White',
    apply: {
      effectId: 'white-on-black',
      textColor: '#FFFFFF',
      badgeBgColor: '#000000',
      badgeBorderColor: 'rgba(255,255,255,0.2)',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-black text-white border border-white/20 font-black px-2 py-0.5 rounded',
  },
  {
    id: 'green-on-black',
    name: 'Black Pill Green',
    apply: {
      effectId: 'green-on-black',
      textColor: '#22C55E',
      badgeBgColor: '#000000',
      badgeBorderColor: 'rgba(34,197,94,0.3)',
      strokeColor: undefined,
      shadowColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'bg-black text-[#22C55E] border border-green-500/30 font-black px-2 py-0.5 rounded',
  },
  {
    id: 'black-green-split',
    name: 'Green 3D Offset',
    apply: {
      effectId: 'black-green-split',
      textColor: '#000000',
      shadowColor: '#22C55E',
      shadowBlur: 0,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      strokeColor: undefined,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-black font-black',
    previewStyle: {
      textShadow: '2px 2px 0px #22C55E',
    },
  },
  {
    id: 'yellow-red-3d',
    name: 'Yellow Red 3D',
    apply: {
      effectId: 'yellow-red-3d',
      textColor: '#FBBF24',
      shadowColor: '#DC2626',
      shadowBlur: 0,
      shadowOffsetX: 3,
      shadowOffsetY: 3,
      strokeColor: undefined,
      badgeBgColor: undefined,
      glowColor: undefined,
    },
    previewClass: 'text-[#FBBF24] font-black',
    previewStyle: {
      textShadow: '2px 2px 0px #DC2626',
    },
  },
  {
    id: 'neon-pink-glow',
    name: 'Neon Pink',
    apply: {
      effectId: 'neon-pink-glow',
      textColor: '#FFFFFF',
      glowColor: '#EC4899',
      shadowBlur: 16,
      strokeColor: undefined,
      badgeBgColor: undefined,
    },
    previewClass: 'text-white font-black drop-shadow-[0_0_10px_#EC4899]',
  },
  {
    id: 'neon-gold-glow',
    name: 'Neon Gold',
    apply: {
      effectId: 'neon-gold-glow',
      textColor: '#FFFFFF',
      glowColor: '#FACC15',
      shadowBlur: 16,
      strokeColor: undefined,
      badgeBgColor: undefined,
    },
    previewClass: 'text-white font-black drop-shadow-[0_0_10px_#FACC15]',
  },
  {
    id: 'neon-lime-glow',
    name: 'Neon Lime',
    apply: {
      effectId: 'neon-lime-glow',
      textColor: '#FFFFFF',
      glowColor: '#4ADE80',
      shadowBlur: 16,
      strokeColor: undefined,
      badgeBgColor: undefined,
    },
    previewClass: 'text-white font-black drop-shadow-[0_0_10px_#4ADE80]',
  },
];

// Short Word / Letter Templates (Screenshot 4 - No full sentence descriptions, just styled words)
interface TextTemplateCard {
  id: string;
  category: 'Trending' | 'Classic' | 'NEW' | 'Hits' | 'Word by word';
  sampleText: string;
  isPro?: boolean;
  style: Partial<CaptionStyle>;
  customRender: (text: string) => React.ReactNode;
}

const TEXT_TEMPLATES: TextTemplateCard[] = [
  {
    id: 'tpl-quick-black-pill',
    category: 'Classic',
    sampleText: 'QUICK',
    isPro: true,
    style: {
      textColor: '#FFFFFF',
      badgeBgColor: '#000000',
      fontFamily: 'Montserrat',
      uppercase: true,
    },
    customRender: (text) => (
      <span className="bg-black text-white px-2 py-0.5 rounded font-black text-xs">
        {text}
      </span>
    ),
  },
  {
    id: 'tpl-quick-shadow',
    category: 'Trending',
    sampleText: 'QUICK',
    isPro: false,
    style: {
      textColor: '#FFFFFF',
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      fontFamily: 'Montserrat',
      uppercase: true,
    },
    customRender: (text) => (
      <span className="text-white font-black text-xs drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
        {text}
      </span>
    ),
  },
  {
    id: 'tpl-the-quick-italic-yellow',
    category: 'Classic',
    sampleText: 'The quick',
    isPro: true,
    style: {
      textColor: '#FACC15',
      isItalic: true,
      strokeColor: '#000000',
      strokeWidth: 3,
      fontFamily: 'Georgia',
      uppercase: false,
    },
    customRender: () => (
      <span className="text-[#FACC15] italic font-serif text-xs" style={{ WebkitTextStroke: '0.8px #000' }}>
        The <span className="text-white not-italic font-sans">quick</span>
      </span>
    ),
  },
  {
    id: 'tpl-quick-yellow-heavy',
    category: 'Trending',
    sampleText: 'QUICK',
    isPro: true,
    style: {
      textColor: '#FACC15',
      strokeColor: '#000000',
      strokeWidth: 4,
      fontFamily: 'Montserrat',
      uppercase: true,
    },
    customRender: (text) => (
      <span className="text-[#FACC15] font-black text-xs" style={{ WebkitTextStroke: '1px #000' }}>
        {text}
      </span>
    ),
  },
  {
    id: 'tpl-quick-bold-white',
    category: 'Hits',
    sampleText: 'QUICK',
    isPro: true,
    style: {
      textColor: '#FFFFFF',
      fontFamily: 'Montserrat',
      uppercase: true,
      shadowColor: 'rgba(0,0,0,0.8)',
      shadowBlur: 4,
    },
    customRender: (text) => (
      <span className="text-white font-black text-xs tracking-wider">
        {text}
      </span>
    ),
  },
  {
    id: 'tpl-the-quick-green',
    category: 'NEW',
    sampleText: 'THE QUICK',
    isPro: false,
    style: {
      textColor: '#22C55E',
      highlightColor: '#FFFFFF',
      fontFamily: 'Montserrat',
      uppercase: true,
    },
    customRender: () => (
      <div className="flex flex-col items-center leading-none text-[10px] font-black">
        <span className="text-white">THE QUICK</span>
        <span className="text-[#22C55E]">BROWN FOX</span>
      </div>
    ),
  },
  {
    id: 'tpl-quick-lowercase',
    category: 'Classic',
    sampleText: 'quick',
    isPro: true,
    style: {
      textColor: '#FFFFFF',
      fontFamily: 'Plus Jakarta Sans',
      uppercase: false,
      textCase: 'lowercase',
      shadowColor: '#000000',
      shadowBlur: 3,
    },
    customRender: (text) => (
      <span className="text-white font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        {text}
      </span>
    ),
  },
  {
    id: 'tpl-the-quick-stacked',
    category: 'Word by word',
    sampleText: 'THE QUICK',
    isPro: true,
    style: {
      textColor: '#FACC15',
      fontFamily: 'Montserrat',
      uppercase: true,
      highlightColor: '#FFFFFF',
    },
    customRender: () => (
      <span className="text-[#FACC15] font-black text-xs">
        THE <span className="text-white">QUICK</span>
      </span>
    ),
  },
];

export const CaptionsEditor: React.FC<CaptionsEditorProps> = ({
  captions,
  onCaptionsChange,
  captionStyle,
  onStyleChange,
  currentTimeMs,
  onSeek,
  onAutoGenerateCaptions,
  isTranscribing,
}) => {
  // Top primary tabs: Captions | Text | Animation | Tracking | Text to speech
  const [topTab, setTopTab] = useState<'Captions' | 'Text' | 'Animation' | 'Tracking' | 'Text to speech'>('Captions');

  // Sub-tabs when Text is selected: Basic | Templates | Effects
  const [textSubTab, setTextSubTab] = useState<'Basic' | 'Templates' | 'Effects'>('Basic');

  // Search in captions list
  const [captionSearch, setCaptionSearch] = useState<string>('');

  // Search in templates tab
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [templateCategory, setTemplateCategory] = useState<string>('All');

  // Apply to all main captions toggle
  const [applyToAll, setApplyToAll] = useState<boolean>(true);

  // Determine current active caption based on video playback
  const activeCaptionIndex = useMemo(() => {
    return captions.findIndex(
      (c) => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs
    );
  }, [captions, currentTimeMs]);

  // If no caption is playing, select the first or clicked one
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  const currentActiveCaption = useMemo(() => {
    if (selectedCaptionId) {
      const found = captions.find((c) => c.id === selectedCaptionId);
      if (found) return found;
    }
    if (activeCaptionIndex !== -1) {
      return captions[activeCaptionIndex];
    }
    return captions[0] || null;
  }, [captions, selectedCaptionId, activeCaptionIndex]);

  // Handle segment text change in Basic tab or transcript
  const handleUpdateCurrentCaptionText = (newText: string) => {
    if (!currentActiveCaption) return;
    onCaptionsChange(
      captions.map((c) =>
        c.id === currentActiveCaption.id ? { ...c, text: newText } : c
      )
    );
  };

  // Delete segment
  const handleDeleteSegment = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onCaptionsChange(captions.filter((c) => c.id !== id));
  };

  // Add new caption segment
  const handleAddSegment = (afterIndex?: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const insertAfter = afterIndex !== undefined ? captions[afterIndex] : null;
    const startMs = insertAfter ? insertAfter.endMs + 100 : currentTimeMs;
    const endMs = startMs + 3500;

    const newCap: CaptionSegment = {
      id: `cap-${Date.now()}`,
      startMs,
      endMs,
      text: 'New spoken teaching caption...',
      confidence: 1.0,
    };

    let updated: CaptionSegment[];
    if (afterIndex !== undefined && afterIndex >= 0) {
      updated = [
        ...captions.slice(0, afterIndex + 1),
        newCap,
        ...captions.slice(afterIndex + 1),
      ];
    } else {
      updated = [...captions, newCap].sort((a, b) => a.startMs - b.startMs);
    }
    onCaptionsChange(updated);
    setSelectedCaptionId(newCap.id);
  };

  // Filtered captions for Captions tab
  const filteredCaptions = useMemo(() => {
    if (!captionSearch.trim()) return captions;
    const q = captionSearch.toLowerCase();
    return captions.filter((c) => c.text.toLowerCase().includes(q));
  }, [captions, captionSearch]);

  // Filtered templates for Templates tab
  const filteredTemplates = useMemo(() => {
    return TEXT_TEMPLATES.filter((tpl) => {
      const matchCat = templateCategory === 'All' || tpl.category === templateCategory;
      const matchSearch =
        !templateSearch.trim() ||
        tpl.sampleText.toLowerCase().includes(templateSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templateCategory, templateSearch]);

  return (
    <div
      id="captions-editor-panel"
      className="flex flex-col h-full bg-[#0d162b] text-blue-100 text-[10px] select-none overflow-hidden border-l border-[#14213D]"
    >
      {/* 1. TOP PRIMARY TABS BAR (Captions, Text, Animation, Tracking, Text to speech) */}
      <div
        id="caption-top-tabs-bar"
        className="h-7 shrink-0 bg-[#091024] border-b border-[#14213D] px-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          {(['Captions', 'Text', 'Animation', 'Tracking', 'Text to speech'] as const).map(
            (tab) => {
              const isActive = topTab === tab;
              return (
                <button
                  key={tab}
                  id={`top-tab-${tab.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setTopTab(tab)}
                  className={`text-[10px] font-semibold whitespace-nowrap transition-colors relative py-1 ${
                    isActive
                      ? 'text-[#00e5ff]'
                      : 'text-blue-300/70 hover:text-white'
                  }`}
                >
                  <span>{tab}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e5ff]" />
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* Right overflow indicator arrow */}
        <button
          className="p-0.5 text-blue-300/70 hover:text-white shrink-0 ml-1"
          title="More tabs"
          onClick={() => {
            const tabs: Array<typeof topTab> = [
              'Captions',
              'Text',
              'Animation',
              'Tracking',
              'Text to speech',
            ];
            const nextIdx = (tabs.indexOf(topTab) + 1) % tabs.length;
            setTopTab(tabs[nextIdx]);
          }}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* 2. TAB CONTENT BODY */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-[#0a1224]">
        {/* ========================================================= */}
        {/* TAB 1: CAPTIONS */}
        {/* ========================================================= */}
        {topTab === 'Captions' && (
          <div className="flex flex-col h-full">
            {/* Search Bar & Utility Icons */}
            <div className="p-1.5 pb-1 flex items-center gap-1.5 border-b border-[#14213D] bg-[#0c1630]">
              <div className="flex-1 flex items-center gap-1 bg-[#101b38] px-1.5 py-0.5 rounded border border-[#1a2b54] focus-within:border-[#00e5ff]/60">
                <Search className="w-2.5 h-2.5 text-blue-300/70 shrink-0" />
                <input
                  id="input-caption-search"
                  type="text"
                  placeholder="Search"
                  value={captionSearch}
                  onChange={(e) => setCaptionSearch(e.target.value)}
                  className="bg-transparent border-0 text-white text-[10px] w-full focus:outline-none placeholder:text-blue-300/50"
                />
              </div>

              {/* Utility Icons on right */}
              <div className="flex items-center gap-0.5 text-blue-300/70">
                <button
                  onClick={() => onAutoGenerateCaptions()}
                  title={isTranscribing ? 'Transcribing...' : 'Auto-Transcribe with AI'}
                  className="p-1 hover:text-[#00e5ff] hover:bg-[#14213D] transition-colors rounded"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => handleAddSegment()}
                  title="Add Caption"
                  className="p-1 hover:text-[#00e5ff] hover:bg-[#14213D] transition-colors rounded"
                >
                  <Scissors className="w-2.5 h-2.5" />
                </button>
                <button
                  title="Translate Subtitles"
                  className="p-1 hover:text-[#00e5ff] hover:bg-[#14213D] transition-colors rounded"
                >
                  <Languages className="w-2.5 h-2.5" />
                </button>
                <button
                  title="Filter Captions"
                  className="p-1 hover:text-[#00e5ff] hover:bg-[#14213D] transition-colors rounded"
                >
                  <ListFilter className="w-2.5 h-2.5" />
                </button>
                <button
                  title="Help & Shortcuts"
                  className="p-1 hover:text-[#00e5ff] hover:bg-[#14213D] transition-colors rounded"
                >
                  <HelpCircle className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

            {/* Captions List with Line Numbers */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#14213D]/60">
              {filteredCaptions.map((cap, index) => {
                const isActive =
                  currentTimeMs >= cap.startMs && currentTimeMs <= cap.endMs;
                const isSelected = selectedCaptionId === cap.id;
                const lineNumber = 73 + index;

                return (
                  <div
                    key={cap.id}
                    id={`caption-item-${cap.id}`}
                    onClick={() => {
                      setSelectedCaptionId(cap.id);
                      onSeek(cap.startMs);
                    }}
                    onDoubleClick={() => {
                      setSelectedCaptionId(cap.id);
                      setTopTab('Text');
                      setTextSubTab('Basic');
                    }}
                    className={`group px-2 py-1.5 flex items-start gap-2 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#00e5ff]/20 text-[#00e5ff]'
                        : isSelected
                        ? 'bg-[#142347] text-white'
                        : 'text-blue-100 hover:bg-[#101b38]'
                    }`}
                  >
                    {/* Line number */}
                    <span
                      className={`font-mono text-[9px] w-4 shrink-0 pt-0.5 text-right font-medium ${
                        isActive ? 'text-[#00e5ff]' : 'text-blue-400/60'
                      }`}
                    >
                      {lineNumber}
                    </span>

                    {/* Caption text */}
                    <p
                      className={`flex-1 text-[10px] leading-snug font-medium break-words ${
                        isActive ? 'text-[#00e5ff] font-semibold' : 'text-blue-100'
                      }`}
                    >
                      {cap.text}
                    </p>

                    {/* Action buttons on hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => handleAddSegment(index, e)}
                        title="Add next caption"
                        className="p-0.5 text-blue-300 hover:text-[#00e5ff] transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSegment(cap.id, e)}
                        title="Delete caption"
                        className="p-0.5 text-blue-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TEXT */}
        {/* ========================================================= */}
        {topTab === 'Text' && (
          <div className="flex flex-col h-full">
            {/* Sub-tabs: Basic | Templates | Effects */}
            <div className="p-1.5 pb-1 bg-[#0c1630] border-b border-[#14213D]">
              <div className="flex items-center gap-1 bg-[#101b38] p-0.5 rounded border border-[#1a2b54]">
                {(['Basic', 'Templates', 'Effects'] as const).map((sub) => {
                  const isActive = textSubTab === sub;
                  return (
                    <button
                      key={sub}
                      id={`subtab-${sub.toLowerCase()}`}
                      onClick={() => setTextSubTab(sub)}
                      className={`flex-1 py-0.5 text-[10px] font-semibold rounded text-center transition-all ${
                        isActive
                          ? 'bg-[#142347] text-[#00e5ff] shadow-sm border border-[#00e5ff]/40'
                          : 'text-blue-300/70 hover:text-blue-100'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Checkbox: Apply to all main captions */}
              <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                <input
                  id="checkbox-apply-all"
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-2.5 h-2.5 rounded accent-[#00e5ff] cursor-pointer"
                />
                <label
                  htmlFor="checkbox-apply-all"
                  className="text-[9px] text-blue-200/80 font-medium cursor-pointer select-none"
                >
                  Apply to all main captions
                </label>
              </div>
            </div>

            {/* SUB-TAB 1: BASIC */}
            {textSubTab === 'Basic' && (
              <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
                {/* Text Area for currently active/selected caption */}
                <div>
                  <textarea
                    id="input-caption-text"
                    rows={3}
                    value={currentActiveCaption ? currentActiveCaption.text : ''}
                    onChange={(e) => handleUpdateCurrentCaptionText(e.target.value)}
                    placeholder="Enter caption text..."
                    className="w-full bg-[#101b38] border border-[#1a2b54] rounded p-1.5 text-[10px] text-white focus:outline-none focus:border-[#00e5ff] resize-none"
                  />
                </div>

                {/* Font Selector */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Font</span>
                  <select
                    id="select-font-family"
                    value={captionStyle.fontFamily}
                    onChange={(e) =>
                      onStyleChange({ ...captionStyle, fontFamily: e.target.value })
                    }
                    className="flex-1 bg-[#101b38] border border-[#1a2b54] rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#00e5ff] cursor-pointer"
                  >
                    <option value="Plus Jakarta Sans">System (Plus Jakarta Sans)</option>
                    <option value="Montserrat">Montserrat (Bold Modern)</option>
                    <option value="Space Grotesk">Space Grotesk (Editorial)</option>
                    <option value="Georgia">Georgia (Serif Scripture)</option>
                    <option value="Arial">Arial (Clean Sans)</option>
                    <option value="Impact">Impact (Heavy Viral)</option>
                  </select>
                </div>

                {/* Font Size Slider & Number Box */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Size</span>
                  <input
                    id="slider-font-size"
                    type="range"
                    min="14"
                    max="56"
                    value={captionStyle.fontSize}
                    onChange={(e) =>
                      onStyleChange({
                        ...captionStyle,
                        fontSize: parseInt(e.target.value, 10),
                      })
                    }
                    className="flex-1 accent-[#00e5ff] cursor-pointer h-1 bg-[#1a2b54]"
                  />
                  <input
                    id="number-font-size"
                    type="number"
                    min="14"
                    max="56"
                    value={captionStyle.fontSize}
                    onChange={(e) =>
                      onStyleChange({
                        ...captionStyle,
                        fontSize: Math.max(14, Math.min(56, parseInt(e.target.value, 10) || 20)),
                      })
                    }
                    className="w-9 bg-[#101b38] border border-[#1a2b54] rounded px-1 py-0.5 text-center text-[10px] font-mono text-white focus:outline-none focus:border-[#00e5ff]"
                  />
                </div>

                {/* Pattern: Bold, Underline, Italic Toggles */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Pattern</span>
                  <div className="flex items-center gap-1">
                    <button
                      id="btn-toggle-bold"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          isBold: captionStyle.isBold === false ? true : false,
                        })
                      }
                      title="Bold"
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors ${
                        captionStyle.isBold !== false
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      B
                    </button>
                    <button
                      id="btn-toggle-underline"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          isUnderline: !captionStyle.isUnderline,
                        })
                      }
                      title="Underline"
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors underline ${
                        captionStyle.isUnderline
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      U
                    </button>
                    <button
                      id="btn-toggle-italic"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          isItalic: !captionStyle.isItalic,
                        })
                      }
                      title="Italic"
                      className={`w-6 h-6 rounded flex items-center justify-center italic text-[10px] transition-colors ${
                        captionStyle.isItalic
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>

                {/* Case: Uppercase, Lowercase, Title Case Toggles */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Case</span>
                  <div className="flex items-center gap-1">
                    <button
                      id="btn-case-uppercase"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          uppercase: true,
                          textCase: 'uppercase',
                        })
                      }
                      title="ALL UPPERCASE"
                      className={`px-1.5 h-6 rounded text-[10px] font-bold transition-colors ${
                        captionStyle.textCase === 'uppercase' ||
                        (captionStyle.uppercase && captionStyle.textCase !== 'lowercase')
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      TT
                    </button>
                    <button
                      id="btn-case-lowercase"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          uppercase: false,
                          textCase: 'lowercase',
                        })
                      }
                      title="all lowercase"
                      className={`px-1.5 h-6 rounded text-[10px] font-bold transition-colors ${
                        captionStyle.textCase === 'lowercase'
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      tt
                    </button>
                    <button
                      id="btn-case-title"
                      onClick={() =>
                        onStyleChange({
                          ...captionStyle,
                          uppercase: false,
                          textCase: 'title',
                        })
                      }
                      title="Title Case"
                      className={`px-1.5 h-6 rounded text-[10px] font-bold transition-colors ${
                        captionStyle.textCase === 'title'
                          ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                          : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                      }`}
                    >
                      Tt
                    </button>
                  </div>
                </div>

                {/* Color Swatch / Picker */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Color</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-[#101b38] px-1.5 py-0.5 rounded border border-[#1a2b54]">
                      <input
                        id="input-text-color"
                        type="color"
                        value={captionStyle.textColor || '#FFFFFF'}
                        onChange={(e) =>
                          onStyleChange({ ...captionStyle, textColor: e.target.value })
                        }
                        className="w-4 h-4 cursor-pointer border-0 bg-transparent rounded"
                      />
                      <span className="font-mono text-[9px] text-blue-200 uppercase">
                        {captionStyle.textColor || '#FFFFFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Position alignment in Basic */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#14213D]">
                  <span className="text-blue-300/70 text-[9px] w-12 shrink-0 uppercase tracking-wider font-semibold">Position</span>
                  <div className="flex items-center gap-1 flex-1">
                    {(['bottom', 'lower-third', 'center'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => onStyleChange({ ...captionStyle, position: pos })}
                        className={`flex-1 py-0.5 rounded capitalize text-[9px] font-medium transition-colors ${
                          captionStyle.position === pos
                            ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/60'
                            : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: TEMPLATES */}
            {textSubTab === 'Templates' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search for text templates */}
                <div className="p-1.5 pb-1 space-y-1 bg-[#0c1630] border-b border-[#14213D]">
                  <div className="flex items-center gap-1 bg-[#101b38] px-1.5 py-0.5 rounded border border-[#1a2b54]">
                    <Search className="w-2.5 h-2.5 text-blue-300/70 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search templates"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="bg-transparent border-0 text-white text-[10px] w-full focus:outline-none placeholder:text-blue-300/50"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {(['All', 'Trending', 'Classic', 'NEW', 'Hits', 'Word by word'] as const).map(
                      (cat) => {
                        const isCatActive = templateCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setTemplateCategory(cat)}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-semibold whitespace-nowrap transition-colors ${
                              isCatActive
                                ? 'bg-[#142347] text-[#00e5ff] border border-[#00e5ff]/40'
                                : 'bg-[#101b38] text-blue-300/70 hover:text-white border border-[#1a2b54]'
                            }`}
                          >
                            {cat === 'All' ? '★' : cat}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-1.5 grid grid-cols-2 gap-1.5 bg-[#0a1224]">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        onStyleChange({
                          ...captionStyle,
                          ...tpl.style,
                        });
                      }}
                      className="group relative h-16 bg-[#0e1730] rounded border border-[#1a2b54] hover:border-[#00e5ff] cursor-pointer flex flex-col items-center justify-center p-1 transition-all hover:scale-[1.01]"
                    >
                      {tpl.isPro && (
                        <div className="absolute top-0.5 left-1 text-[9px] text-[#00e5ff]">
                          💎
                        </div>
                      )}

                      <div className="flex items-center justify-center text-center">
                        {tpl.customRender(tpl.sampleText)}
                      </div>

                      <div className="absolute bottom-0.5 left-1 right-1 flex items-center justify-between text-blue-400/50 group-hover:text-blue-200">
                        <Star className="w-2 h-2 hover:text-yellow-400 transition-colors" />
                        <Download className="w-2 h-2 hover:text-[#00e5ff] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 3: EFFECTS */}
            {textSubTab === 'Effects' && (
              <div className="flex-1 overflow-y-auto p-2 bg-[#0a1224]">
                <div className="grid grid-cols-6 gap-1">
                  {AA_EFFECT_PRESETS.map((preset) => {
                    const isSelected = captionStyle.effectId === preset.id;

                    return (
                      <button
                        key={preset.id}
                        id={`effect-tile-${preset.id}`}
                        onClick={() => {
                          onStyleChange({
                            ...captionStyle,
                            ...preset.apply,
                          });
                        }}
                        title={preset.name}
                        className={`aspect-square rounded flex items-center justify-center transition-all relative select-none border ${
                          isSelected
                            ? 'ring-1 ring-[#00e5ff] border-[#00e5ff] bg-[#142347] shadow-md'
                            : 'bg-[#0e1730] border-[#1a2b54] hover:bg-[#142347] hover:border-[#00e5ff]/50'
                        }`}
                      >
                        {preset.isNone ? (
                          <Ban className="w-3.5 h-3.5 text-blue-300/60" />
                        ) : (
                          <span
                            className={`text-[11px] tracking-tight ${preset.previewClass}`}
                            style={preset.previewStyle}
                          >
                            Aa
                          </span>
                        )}

                        {isSelected && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#00e5ff] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ANIMATION */}
        {/* ========================================================= */}
        {topTab === 'Animation' && (
          <div className="p-2 space-y-2 bg-[#0a1224]">
            <h4 className="text-[10px] font-bold text-blue-200">Caption Entry &amp; Animations</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'pop', name: 'Pop & Bounce', desc: 'Punchy viral entrance' },
                { id: 'highlight', name: 'Word Highlight', desc: 'Gold active word highlight' },
                { id: 'fade', name: 'Fade In', desc: 'Cinematic opacity blend' },
                { id: 'slide-up', name: 'Slide Up', desc: 'Vertical entrance' },
                { id: 'none', name: 'Static', desc: 'No animation effect' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  onClick={() =>
                    onStyleChange({
                      ...captionStyle,
                      animation: anim.id as CaptionStyle['animation'],
                    })
                  }
                  className={`p-1.5 rounded border text-left transition-all ${
                    captionStyle.animation === anim.id
                      ? 'bg-[#142347] border-[#00e5ff] text-white shadow-sm'
                      : 'bg-[#0e1730] border-[#1a2b54] text-blue-300/70 hover:text-white hover:border-[#00e5ff]/40'
                  }`}
                >
                  <div className="font-bold text-[10px] text-white mb-0.5">{anim.name}</div>
                  <div className="text-[8.5px] text-blue-300/60 leading-tight">{anim.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: TRACKING */}
        {/* ========================================================= */}
        {topTab === 'Tracking' && (
          <div className="p-2 space-y-2 bg-[#0a1224]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-100">
              <Crosshair className="w-3 h-3 text-[#00e5ff]" />
              <span>Smart Motion Tracking</span>
            </div>
            <p className="text-[9px] text-blue-300/70">
              Anchor captions automatically to sermon speaker gestures.
            </p>

            <div className="space-y-1">
              {[
                { id: 'speaker', label: 'Speaker Face Lock' },
                { id: 'pulpit', label: 'Pulpit Lower Third Anchor' },
                { id: 'fixed', label: 'Viewport Safe Center Lock' },
              ].map((track) => (
                <div
                  key={track.id}
                  className="p-1.5 bg-[#0e1730] rounded border border-[#1a2b54] flex items-center justify-between"
                >
                  <span className="text-[10px] text-blue-100">{track.label}</span>
                  <span className="px-1.5 py-0.2 bg-[#00e5ff]/20 text-[#00e5ff] text-[8.5px] font-bold rounded">
                    Auto-Locked
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: TEXT TO SPEECH */}
        {/* ========================================================= */}
        {topTab === 'Text to speech' && (
          <div className="p-2 space-y-2 bg-[#0a1224]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-100">
              <Volume2 className="w-3 h-3 text-[#00e5ff]" />
              <span>AI Narrator Voiceover</span>
            </div>
            <p className="text-[9px] text-blue-300/70">
              Generate studio narration from selected caption text.
            </p>

            <div className="space-y-1">
              {[
                { name: 'Warm Pastor (Male)', accent: 'South African English' },
                { name: 'Clarity Host (Female)', accent: 'Broadcast Standard' },
                { name: 'Deep Resonance (Male)', accent: 'Inspiring & Reverent' },
              ].map((voice, i) => (
                <div
                  key={i}
                  className="p-1.5 bg-[#0e1730] rounded border border-[#1a2b54] flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-[10px] text-white">{voice.name}</div>
                    <div className="text-[8.5px] text-blue-300/60">{voice.accent}</div>
                  </div>
                  <button className="px-2 py-0.5 bg-[#142347] hover:bg-[#00e5ff] hover:text-black text-blue-100 rounded text-[9px] font-bold flex items-center gap-1 transition-colors border border-[#1a2b54]">
                    <Play className="w-2 h-2 fill-current" />
                    <span>Test</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
