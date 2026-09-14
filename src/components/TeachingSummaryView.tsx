import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  RotateCw,
  Hash,
  Sparkles,
  Building2,
  Share2,
  Instagram,
  CheckCircle2,
} from 'lucide-react';
import { TeachingSummary, ChurchBranding } from '../types';
import { copyToClipboard } from '../utils/formatters';

interface TeachingSummaryViewProps {
  summaryData: TeachingSummary;
  onRegenerate: () => void;
  isRegenerating: boolean;
  branding: ChurchBranding;
  onUpdateSummary: (data: TeachingSummary) => void;
}

export const TeachingSummaryView: React.FC<TeachingSummaryViewProps> = ({
  summaryData,
  onRegenerate,
  isRegenerating,
  branding,
  onUpdateSummary,
}) => {
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedSummaryOnly, setCopiedSummaryOnly] = useState<boolean>(false);
  const [copiedHashtagsOnly, setCopiedHashtagsOnly] = useState<boolean>(false);
  const [includeChurchFooter, setIncludeChurchFooter] = useState<boolean>(true);

  // Compile full social post text
  const fullPostText = `${summaryData.title.toUpperCase()}\n\n${summaryData.summary}\n\n${
    includeChurchFooter
      ? `🏛 ${branding.churchName}\n📍 ${branding.address}\n⏰ Service Times: ${branding.serviceTimes}\n🌐 ${branding.website}\n\n`
      : ''
  }${summaryData.hashtags.join(' ')}`;

  const handleCopyFull = async () => {
    const ok = await copyToClipboard(fullPostText);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  const handleCopySummaryOnly = async () => {
    const ok = await copyToClipboard(summaryData.summary);
    if (ok) {
      setCopiedSummaryOnly(true);
      setTimeout(() => setCopiedSummaryOnly(false), 2500);
    }
  };

  const handleCopyHashtagsOnly = async () => {
    const ok = await copyToClipboard(summaryData.hashtags.join(' '));
    if (ok) {
      setCopiedHashtagsOnly(true);
      setTimeout(() => setCopiedHashtagsOnly(false), 2500);
    }
  };

  return (
    <div
      id="teaching-summary-view"
      className="h-full flex flex-col bg-[#070c17] text-white select-none overflow-y-auto"
    >
      {/* Top Banner */}
      <div className="p-6 border-b border-[#14213D] bg-gradient-to-r from-[#0c1426] via-[#101b33] to-[#0c1426] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 bg-[#FCA311]/20 border border-[#FCA311]/40 flex items-center justify-center text-[#FCA311]">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Teaching Summary &amp; 5 Hashtags
            </h2>
          </div>
          <p className="text-gray-400 text-xs max-w-2xl leading-relaxed">
            AI-crafted sermon summary and exactly five high-engagement hashtags formatted for instant 1-click clipboard copying to Instagram Reels, TikTok, YouTube Shorts, and Facebook.
          </p>
        </div>

        {/* Regenerate Action */}
        <button
          id="btn-regenerate-summary"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14213D] hover:bg-[#1f335e] text-white font-semibold text-xs border border-white/15 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RotateCw className={`w-3.5 h-3.5 text-[#FCA311] ${isRegenerating ? 'animate-spin' : ''}`} />
          <span>{isRegenerating ? 'Generating New Angle...' : 'Regenerate Alternative'}</span>
        </button>
      </div>

      {/* Main Two-Column Layout: Editor on Left, Live Social Preview on Right */}
      <div className="p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Summary & Hashtag Cards (8 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Teaching Title & Summary Card */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FCA311]" />
                <span>Teaching Title &amp; Core Summary</span>
              </span>

              <button
                id="btn-copy-summary-only"
                onClick={handleCopySummaryOnly}
                className="text-[11px] text-gray-400 hover:text-[#FCA311] flex items-center gap-1 transition-colors"
              >
                {copiedSummaryOnly ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSummaryOnly ? 'Copied' : 'Copy Summary'}</span>
              </button>
            </div>

            {/* Editable Title */}
            <input
              type="text"
              value={summaryData.title}
              onChange={(e) => onUpdateSummary({ ...summaryData, title: e.target.value })}
              className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2.5 text-white font-bold text-sm mb-3 focus:outline-none focus:border-[#FCA311]"
              placeholder="Teaching Title"
            />

            {/* Editable Summary Body */}
            <textarea
              rows={4}
              value={summaryData.summary}
              onChange={(e) => onUpdateSummary({ ...summaryData, summary: e.target.value })}
              className="w-full bg-[#060a14] border border-white/10 p-3 text-gray-200 text-xs leading-relaxed focus:outline-none focus:border-[#FCA311] resize-none"
              placeholder="Summary text..."
            />
          </div>

          {/* Exactly 5 Relevant Hashtags Card */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#FCA311]" />
                <span>5 Targeted Hashtags (Strict Requirement)</span>
              </span>

              <button
                id="btn-copy-hashtags-only"
                onClick={handleCopyHashtagsOnly}
                className="text-[11px] text-gray-400 hover:text-[#FCA311] flex items-center gap-1 transition-colors"
              >
                {copiedHashtagsOnly ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHashtagsOnly ? 'Copied' : 'Copy Hashtags'}</span>
              </button>
            </div>

            {/* Hashtags Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {summaryData.hashtags.map((tag, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#14213D] border border-[#FCA311]/30 text-[#FCA311] font-bold text-xs shadow-sm"
                >
                  <span>{tag}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400">
              Verified: exactly 5 targeted hashtags matching sermon revelation &amp; short-form discoverability.
            </p>
          </div>

          {/* Church Info Inclusion Option */}
          <div className="bg-[#0b1222] border border-[#14213D] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-[#FCA311]" />
              <div>
                <h4 className="text-xs font-bold text-white">Include Church Address &amp; Service Times</h4>
                <p className="text-[11px] text-gray-400">
                  Appends Kew, Johannesburg address and Sunday/Thursday service times to copied text
                </p>
              </div>
            </div>

            <button
              id="btn-toggle-church-footer"
              onClick={() => setIncludeChurchFooter(!includeChurchFooter)}
              className={`w-11 h-6 transition-colors relative flex items-center px-1 ${
                includeChurchFooter ? 'bg-[#FCA311]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 bg-black transition-transform ${
                  includeChurchFooter ? 'translate-x-5' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Large Master Copy Button */}
          <button
            id="btn-copy-full-post"
            onClick={handleCopyFull}
            className={`w-full py-3.5 px-5 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-98 ${
              copiedAll
                ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                : 'bg-gradient-to-r from-[#FCA311] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black shadow-[#FCA311]/30'
            }`}
          >
            {copiedAll ? (
              <>
                <CheckCircle2 className="w-5 h-5 fill-current" />
                <span>Copied to Clipboard! Ready to Paste on Instagram/TikTok</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>1-Click Copy Full Post &amp; 5 Hashtags</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Social Post Mockup (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-[#FCA311]" />
                <span>Social Media Preview</span>
              </span>
              <span className="text-[10px] font-semibold text-[#FCA311] bg-[#FCA311]/10 px-2 py-0.5 border border-[#FCA311]/20">
                Instagram / TikTok / YouTube
              </span>
            </div>

            {/* Mock Social Post Card */}
            <div className="bg-[#050811] border border-white/10 p-4 flex-1 flex flex-col justify-between font-sans text-xs">
              <div className="space-y-3">
                {/* Church Profile Header */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                  <div className="w-8 h-8 bg-[#14213D] border border-[#FCA311] flex items-center justify-center text-[10px] font-black text-[#FCA311]">
                    {getChurchInitials(branding.churchName)}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">
                      {branding.churchName || 'Your Church'}
                    </div>
                    {branding.address && (
                      <div className="text-[10px] text-gray-400">{branding.address}</div>
                    )}
                  </div>
                </div>

                {/* Post Title */}
                <div className="font-extrabold text-[#FCA311] text-xs leading-snug">
                  {summaryData.title}
                </div>

                {/* Summary */}
                <p className="text-gray-300 leading-relaxed text-[11px]">
                  {summaryData.summary}
                </p>

                {/* Church details if included */}
                {includeChurchFooter && (
                  <div className="p-2.5 bg-[#0e172a] border border-[#14213D] text-[10px] text-gray-300 space-y-0.5">
                    <div className="font-bold text-white">📍 Location:</div>
                    <div className="text-gray-400">{branding.address}</div>
                    <div className="font-bold text-[#FCA311] mt-1">⏰ Service Times:</div>
                    <div className="text-gray-400">{branding.serviceTimes}</div>
                  </div>
                )}

                {/* 5 Hashtags */}
                <div className="text-blue-400 font-semibold text-[11px] leading-relaxed">
                  {summaryData.hashtags.join(' ')}
                </div>
              </div>

              {/* Instant Quick Copy in Preview */}
              <div className="pt-4 border-t border-white/5 mt-4">
                <button
                  onClick={handleCopyFull}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-[#FCA311]" />
                  <span>Copy Formatted Caption</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function getChurchInitials(churchName: string): string {
  const initials = churchName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return initials.slice(0, 3) || '—';
}
