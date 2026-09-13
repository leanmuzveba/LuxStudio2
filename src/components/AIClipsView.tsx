import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Film,
  Download,
  Share2,
  Flame,
  Check,
  Clock,
  Wand2,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { AIClipCandidate, CaptionStyle, ChurchBranding } from '../types';
import { formatTimecode, formatDuration, copyToClipboard } from '../utils/formatters';

interface AIClipsViewProps {
  candidates: AIClipCandidate[];
  onSelectClip: (clip: AIClipCandidate) => void;
  onExportClip: (clip: AIClipCandidate) => void;
  onGenerateMore: () => void;
  isGenerating: boolean;
  onUpdateCandidate: (clip: AIClipCandidate) => void;
  onDeleteCandidate: (id: string) => void;
  branding: ChurchBranding;
}

export const AIClipsView: React.FC<AIClipsViewProps> = ({
  candidates,
  onSelectClip,
  onExportClip,
  onGenerateMore,
  isGenerating,
  onUpdateCandidate,
  onDeleteCandidate,
  branding,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const handleCopyTranscript = async (clip: AIClipCandidate) => {
    const text = `🔥 "${clip.hook}"\n\n📌 Key Takeaway: ${clip.keyTakeaway}\n\n📍 Higher Life Commission: ${branding.address}\n⏰ ${branding.serviceTimes}\n\n#DivinePurpose #FaithInAction #SundayTeaching #Shorts`;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleStartRename = (clip: AIClipCandidate) => {
    setEditingId(clip.id);
    setEditTitle(clip.title);
  };

  const handleSaveRename = (clip: AIClipCandidate) => {
    if (editTitle.trim()) {
      onUpdateCandidate({ ...clip, title: editTitle.trim() });
    }
    setEditingId(null);
  };

  return (
    <div
      id="ai-clips-view"
      className="h-full flex flex-col bg-[#070c17] text-white select-none overflow-y-auto"
    >
      {/* View Header */}
      <div className="p-6 border-b border-[#14213D] bg-gradient-to-r from-[#0c1426] via-[#101b33] to-[#0c1426] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 bg-[#FCA311]/20 border border-[#FCA311]/40 flex items-center justify-center text-[#FCA311]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              AI Short-Clip Generator
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-[#FCA311] text-black">
              9:16 Vertical
            </span>
          </div>
          <p className="text-gray-400 text-xs max-w-2xl leading-relaxed">
            Automatically scans 1–2 hour teaching and sermon recordings to identify high-retention moments with strong opening hooks, complete scriptural revelations, and high viral potential.
          </p>
        </div>

        {/* Action Button: Generate More with Gemini */}
        <button
          id="btn-generate-more-clips"
          onClick={onGenerateMore}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FCA311] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black font-bold text-xs shadow-lg shadow-[#FCA311]/20 transition-all transform active:scale-95 disabled:opacity-50 shrink-0"
        >
          <Wand2 className="w-4 h-4" />
          <span>{isGenerating ? 'Analyzing Full Sermon...' : 'Scan For More AI Clips'}</span>
        </button>
      </div>

      {/* Grid of Candidate Clips */}
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
            <span>Ready-To-Publish Clips ({candidates.length})</span>
          </h3>
          <span className="text-xs text-gray-400">
            Click any clip to load into timeline or export immediately
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {candidates.map((clip, index) => (
            <div
              key={clip.id}
              className="bg-[#0b1222] border border-[#14213D] hover:border-[#FCA311]/50 p-4 flex flex-col justify-between transition-all duration-300 shadow-xl shadow-black/40 group relative overflow-hidden"
            >
              {/* Top Accent Gradient & Score Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#14213D] border border-white/10 text-xs">
                  <Flame className="w-3.5 h-3.5 text-[#FCA311] fill-current" />
                  <span className="font-extrabold text-[#FCA311]">{clip.score}%</span>
                  <span className="text-[10px] text-gray-400">Virality</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400 bg-black/40 px-2 py-0.5 border border-white/5">
                  <Clock className="w-3 h-3 text-[#FCA311]" />
                  <span>{formatDuration(clip.durationMs)}</span>
                </div>
              </div>

              {/* Title & Hook */}
              <div className="mb-4">
                {editingId === clip.id ? (
                  <div className="flex items-center gap-1 mb-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-[#050811] border border-[#FCA311] px-2 py-1 text-xs text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(clip)}
                      className="px-2 py-1 bg-[#FCA311] text-black text-xs font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1 group/title">
                    <h4 className="font-bold text-white text-sm leading-snug mb-1 group-hover:text-[#FCA311] transition-colors">
                      {clip.title}
                    </h4>
                    <button
                      onClick={() => handleStartRename(clip)}
                      className="opacity-0 group-hover/title:opacity-100 text-gray-400 hover:text-white transition-opacity p-0.5"
                      title="Rename Clip"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Hook quote */}
                <div className="p-2.5 bg-[#060a13] border border-white/5 text-xs text-gray-300 italic mb-2.5 leading-relaxed">
                  "{clip.hook}"
                </div>

                {/* Teaching takeaway */}
                <div className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-gray-300">Takeaway:</strong> {clip.keyTakeaway}
                </div>
              </div>

              {/* Timecode bounds */}
              <div className="text-[10px] font-mono text-gray-400 mb-4 flex items-center justify-between border-t border-white/5 pt-2">
                <span>Start: {formatTimecode(clip.startMs, false)}</span>
                <span>End: {formatTimecode(clip.endMs, false)}</span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => onSelectClip(clip)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#14213D] hover:bg-[#1e325c] text-white font-semibold text-xs border border-white/10 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-[#FCA311]" />
                  <span>Timeline</span>
                </button>

                <button
                  onClick={() => onExportClip(clip)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FCA311] hover:bg-[#e2930f] text-black font-bold text-xs shadow-md shadow-[#FCA311]/20 transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export 9:16</span>
                </button>
              </div>

              {/* Sub-actions: Copy text & Delete */}
              <div className="mt-2.5 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => handleCopyTranscript(clip)}
                  className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedId === clip.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3 text-gray-400" />
                      <span>Copy Caption &amp; Church Info</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onDeleteCandidate(clip.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Remove candidate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
