import React, { useState, useRef, useEffect } from 'react';
import {
  Scissors,
  Layers,
  Trash2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Sparkles,
  Check,
  Undo2,
  Wand2,
  Split,
  Plus,
  Film,
  Music,
  Subtitles,
  Upload,
  MousePointer2,
} from 'lucide-react';
import { Track, Clip, SilenceSegment, CaptionSegment } from '../types';
import { formatTimecode } from '../utils/formatters';
import { splitTracksAtTime } from '../utils/timelineOps';
import { getDecodedAudio, computeWaveformPeaks } from '../utils/audioAnalysis';
import { getVideoThumbnails } from '../utils/videoThumbnails';

type ToolMode = 'select' | 'split';

interface TimelineEditorProps {
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
  currentTimeMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  silenceSegments: SilenceSegment[];
  isSilenceCut: boolean;
  isDetectingSilences?: boolean;
  silenceDetectionProgress?: number;
  onAutoCutSilences: () => void;
  onRestoreSilences: () => void;
  captions: CaptionSegment[];
  onCaptionsChange: (captions: CaptionSegment[]) => void;
  autoMergeEnabled: boolean;
  onToggleAutoMerge: (enabled: boolean) => void;
  onSelectTrackFile: (trackId: 'track-video' | 'track-audio', file: File) => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  tracks,
  onTracksChange,
  currentTimeMs,
  durationMs,
  onSeek,
  isPlaying,
  onTogglePlay,
  silenceSegments,
  isSilenceCut,
  isDetectingSilences = false,
  silenceDetectionProgress = 0,
  onAutoCutSilences,
  onRestoreSilences,
  captions,
  onCaptionsChange,
  autoMergeEnabled,
  onToggleAutoMerge,
  onSelectTrackFile,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 0.4x to 3.5x zoom
  const [trackHeaderWidth, setTrackHeaderWidth] = useState<number>(56);
  const [isDraggingHeader, setIsDraggingHeader] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Drag handler for track headers width
  const handleStartDragHeader = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingHeader(true);
    const startX = e.clientX;
    const startW = trackHeaderWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newW = Math.max(44, Math.min(220, startW + deltaX));
      setTrackHeaderWidth(newW);
    };

    const onMouseUp = () => {
      setIsDraggingHeader(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Drag handler for manually moving/resizing a caption segment on the timeline
  const handleCaptionDragStart = (
    e: React.MouseEvent,
    cap: CaptionSegment,
    mode: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const startClientX = e.clientX;
    const originalStart = cap.startMs;
    const originalEnd = cap.endMs;
    let moved = false;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      if (Math.abs(deltaPx) > 3) moved = true;
      const deltaMs = (deltaPx / rect.width) * durationMs;

      let newStart = originalStart;
      let newEnd = originalEnd;

      if (mode === 'move') {
        const span = originalEnd - originalStart;
        newStart = Math.max(0, Math.min(durationMs - span, originalStart + deltaMs));
        newEnd = newStart + span;
      } else if (mode === 'resize-left') {
        newStart = Math.max(0, Math.min(originalEnd - 200, originalStart + deltaMs));
      } else {
        newEnd = Math.min(durationMs, Math.max(originalStart + 200, originalEnd + deltaMs));
      }

      onCaptionsChange(
        captions.map((c) =>
          c.id === cap.id ? { ...c, startMs: Math.round(newStart), endMs: Math.round(newEnd) } : c
        )
      );
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (!moved && mode === 'move') onSeek(originalStart);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Wheel handler for CTRL + Scroll zooming on timeline and bottom bar
  useEffect(() => {
    const handleWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoomLevel((prev) => {
          const next = Math.min(3.5, Math.max(0.4, Number((prev + delta).toFixed(2))));
          return next;
        });
      }
    };

    const container = timelineContainerRef.current;
    const bottomBar = bottomBarRef.current;

    if (container) {
      container.addEventListener('wheel', handleWheelZoom, { passive: false });
    }
    if (bottomBar) {
      bottomBar.addEventListener('wheel', handleWheelZoom, { passive: false });
    }

    return () => {
      if (container) container.removeEventListener('wheel', handleWheelZoom);
      if (bottomBar) bottomBar.removeEventListener('wheel', handleWheelZoom);
    };
  }, []);

  // Split every track (video + audio) at the playhead, so a cut always stays in sync
  const handleSplitClipAtPlayhead = () => {
    onTracksChange(splitTracksAtTime(tracks, currentTimeMs));
  };

  // Merge adjacent clips
  const handleMergeAdjacentClips = () => {
    const newTracks = tracks.map((track) => {
      if (track.clips.length <= 1) return track;

      // Merge first two adjacent or merge all sequentially
      const mergedClips: Clip[] = [];
      let current = { ...track.clips[0] };

      for (let i = 1; i < track.clips.length; i++) {
        const next = track.clips[i];
        // If they are adjacent (or auto-merge joins them)
        if (autoMergeEnabled || Math.abs(current.endMs - next.startMs) < 1500) {
          current = {
            ...current,
            name: `${current.name.split(' (Merged)')[0]} + ${next.name}`,
            endMs: current.endMs + (next.endMs - next.startMs),
            sourceEndMs: current.sourceEndMs + (next.sourceEndMs - next.sourceStartMs),
          };
        } else {
          mergedClips.push(current);
          current = { ...next };
        }
      }
      mergedClips.push(current);

      return {
        ...track,
        clips: mergedClips,
      };
    });

    onTracksChange(newTracks);
  };

  // Delete selected clip
  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    const newTracks = tracks.map((track) => {
      const filtered = track.clips.filter((c) => c.id !== selectedClipId);
      if (autoMergeEnabled) {
        // Automatically close unintended gaps
        let runningTime = 0;
        const normalized = filtered.map((c) => {
          const duration = c.endMs - c.startMs;
          const updated = {
            ...c,
            startMs: runningTime,
            endMs: runningTime + duration,
          };
          runningTime += duration;
          return updated;
        });
        return { ...track, clips: normalized };
      }
      return { ...track, clips: filtered };
    });
    onTracksChange(newTracks);
    setSelectedClipId(null);
  };

  // Toggle Track Mute
  const handleToggleMute = (trackId: string) => {
    onTracksChange(
      tracks.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
  };

  // Timeline scrub calculation (or, in Split tool mode, cut every track at the click point)
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const timeMs = Math.floor(ratio * durationMs);

    if (toolMode === 'split') {
      onTracksChange(splitTracksAtTime(tracks, timeMs));
      onSeek(timeMs);
      return;
    }

    onSeek(timeMs);
    setIsScrubbing(true);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.floor(ratio * durationMs));
  };

  useEffect(() => {
    const handleMouseUp = () => setIsScrubbing(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const playheadPercent = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  return (
    <div
      id="timeline-module"
      className="flex flex-col h-full bg-[#080d19] border-t border-[#14213D] text-xs select-none"
    >
      {/* Timeline Toolbar */}
      <div
        id="timeline-toolbar"
        className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-[#0b1222]"
      >
        {/* Left: Quick action buttons - icon only as requested */}
        <div className="flex items-center gap-1.5">
          {/* Tool Mode: Select vs Split (click-to-cut across all tracks) */}
          <div className="flex items-center bg-black/40 border border-white/10 p-0.5">
            <button
              id="btn-tool-select"
              onClick={() => setToolMode('select')}
              title="Select Tool (click clips to select)"
              aria-label="Select Tool"
              aria-pressed={toolMode === 'select'}
              className={`p-1 transition-colors ${
                toolMode === 'select'
                  ? 'bg-[#FCA311]/20 text-[#FCA311]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-tool-split"
              onClick={() => setToolMode('split')}
              title="Split Tool (click the timeline to cut video + audio together)"
              aria-label="Split Tool"
              aria-pressed={toolMode === 'split'}
              className={`p-1 transition-colors ${
                toolMode === 'split'
                  ? 'bg-[#FCA311]/20 text-[#FCA311]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Split Clip Icon */}
          <button
            id="btn-split-clip"
            onClick={handleSplitClipAtPlayhead}
            className="p-1.5 bg-[#14213D] hover:bg-[#1f335e] text-white border border-white/10 transition-colors shadow-sm active:scale-95"
            title="Split All Tracks at Playhead"
            aria-label="Split Clip"
          >
            <Scissors className="w-4 h-4 text-[#FCA311]" />
          </button>

          {/* Merge Adjacent Clips Icon */}
          <button
            id="btn-merge-clips"
            onClick={handleMergeAdjacentClips}
            className="p-1.5 bg-[#14213D] hover:bg-[#1f335e] text-white border border-white/10 transition-colors shadow-sm active:scale-95"
            title="Merge Adjacent Clips (M)"
            aria-label="Merge Adjacent Clips"
          >
            <Layers className="w-4 h-4 text-[#FCA311]" />
          </button>

          {/* Auto Timeline Merge Toggle Icon */}
          <button
            id="btn-toggle-auto-merge"
            onClick={() => onToggleAutoMerge(!autoMergeEnabled)}
            title={`Auto Merge Gaps: ${autoMergeEnabled ? 'ON' : 'OFF'}`}
            aria-label="Auto Merge Gaps"
            className={`relative p-1.5 transition-all border active:scale-95 ${
              autoMergeEnabled
                ? 'bg-[#FCA311]/20 text-[#FCA311] border-[#FCA311]/50 shadow-sm shadow-[#FCA311]/20'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Split className="w-4 h-4" />
            {autoMergeEnabled && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#FCA311]" />
            )}
          </button>

          {/* Delete Clip Icon */}
          {selectedClipId && (
            <button
              id="btn-delete-clip"
              onClick={handleDeleteClip}
              className="p-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/40 transition-colors active:scale-95"
              title="Delete Selected Clip (Del)"
              aria-label="Delete Selected Clip"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          )}
        </div>

        {/* Center: Auto Cut Silence Automation */}
        <div className="flex items-center gap-2">
          {!isSilenceCut ? (
            <button
              id="btn-auto-cut-silence"
              onClick={onAutoCutSilences}
              disabled={isDetectingSilences || silenceSegments.length === 0}
              className="relative flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#FCA311] to-[#f78e05] text-black font-bold shadow-md shadow-[#FCA311]/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-90 disabled:pointer-events-none overflow-hidden"
            >
              {isDetectingSilences && (
                <span
                  className="absolute inset-y-0 left-0 bg-black/15 transition-[width]"
                  style={{ width: `${Math.round(silenceDetectionProgress * 100)}%` }}
                />
              )}
              <Wand2 className="relative w-3.5 h-3.5" />
              <span className="relative">
                {isDetectingSilences
                  ? `Detecting silences… ${Math.round(silenceDetectionProgress * 100)}%`
                  : `Auto Cut Silences (${silenceSegments.length} detected)`}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Silences Cut (Clean Speech)</span>
              </span>
              <button
                id="btn-undo-silence-cuts"
                onClick={onRestoreSilences}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-[11px] font-medium transition-colors"
              >
                Restore Original
              </button>
            </div>
          )}
        </div>

        {/* Right: Zoom Level controls & Timecode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/40 p-0.5 border border-white/5">
            <button
              id="btn-zoom-out"
              onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.25).toFixed(2))))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom Out (or Ctrl + Scroll)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-gray-400 w-9 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              id="btn-zoom-in"
              onClick={() => setZoomLevel((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom In (or Ctrl + Scroll)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="font-mono text-xs font-bold text-[#FCA311] bg-black/50 px-2 py-1 border border-white/10">
            {formatTimecode(currentTimeMs, true)}
          </div>
        </div>
      </div>

      {/* Timeline Workspace Area */}
      <div
        ref={timelineContainerRef}
        className="relative flex-1 overflow-x-auto overflow-y-auto flex"
      >
        {/* Track Headers Column (Left Fixed) - Adjustable width with splitter */}
        <div
          id="timeline-track-headers-column"
          style={{ width: `${trackHeaderWidth}px` }}
          className="shrink-0 bg-[#0a1020] border-r border-[#14213D] flex flex-col z-20 shadow-md select-none overflow-hidden transition-all duration-75"
        >
          {/* Ruler spacer */}
          <div className="h-7 border-b border-white/10 flex items-center justify-between px-2 text-gray-500" title="Tracks">
            <Layers className="w-3.5 h-3.5" />
            {trackHeaderWidth > 90 && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Tracks</span>
            )}
          </div>

          {/* Video Track Header */}
          <div
            className="h-16 border-b border-white/5 flex items-center justify-between px-2 bg-[#0e162b]/80"
            title="Video Track"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="p-1 bg-[#14213D] border border-white/10 text-[#FCA311] shrink-0">
                <Film className="w-3.5 h-3.5" />
              </div>
              {trackHeaderWidth > 85 && (
                <span className="text-[11px] font-semibold text-gray-300 truncate">Video</span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSelectTrackFile('track-video', file);
                  e.target.value = '';
                }}
              />
              <button
                id="btn-select-track-video-file"
                onClick={() => videoFileInputRef.current?.click()}
                title="Select Video Track File"
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                id="btn-mute-track-video"
                onClick={() => handleToggleMute('track-video')}
                title={tracks[0]?.muted ? 'Unmute Video Track' : 'Mute Video Track'}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {tracks[0]?.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Audio Track Header */}
          <div
            className="h-16 border-b border-white/5 flex items-center justify-between px-2 bg-[#0e162b]/80"
            title="Audio Track (Waveform)"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="p-1 bg-[#14213D] border border-white/10 text-[#2dd4bf] shrink-0">
                <Music className="w-3.5 h-3.5" />
              </div>
              {trackHeaderWidth > 85 && (
                <span className="text-[11px] font-semibold text-gray-300 truncate">Audio</span>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onSelectTrackFile('track-audio', file);
                  e.target.value = '';
                }}
              />
              <button
                id="btn-select-track-audio-file"
                onClick={() => audioFileInputRef.current?.click()}
                title="Select Audio Track File"
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Upload className="w-3 h-3" />
              </button>
              <button
                id="btn-mute-track-audio"
                onClick={() => handleToggleMute('track-audio')}
                title={tracks[1]?.muted ? 'Unmute Audio Track' : 'Mute Audio Track'}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {tracks[1]?.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3 text-[#2dd4bf]" />}
              </button>
            </div>
          </div>

          {/* Auto Captions Track Header */}
          <div
            className="h-12 border-b border-white/5 flex items-center justify-between px-2 bg-[#0e162b]/80"
            title="Auto Captions Track"
          >
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="p-1 bg-[#14213D] border border-white/10 text-[#FCA311] shrink-0">
                <Subtitles className="w-3.5 h-3.5" />
              </div>
              {trackHeaderWidth > 85 && (
                <span className="text-[11px] font-semibold text-gray-300 truncate">Captions</span>
              )}
            </div>
          </div>
        </div>

        {/* Adjustable Vertical Splitter inside Timeline */}
        <div
          id="splitter-timeline-track-header"
          onMouseDown={handleStartDragHeader}
          className={`w-2 -mx-1 z-30 cursor-col-resize group relative flex items-center justify-center transition-colors select-none ${
            isDraggingHeader ? 'bg-[#00e5ff]' : 'hover:bg-[#00e5ff]/50 bg-transparent'
          }`}
          title="Drag to resize track header column (Adjustable boundary)"
        >
          <div className="w-0.5 h-full bg-[#14213D] group-hover:bg-[#00e5ff] transition-colors flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/40 group-hover:bg-white rounded-full" />
          </div>
        </div>

        {/* Timeline Tracks & Scrubber Container (Right Scrollable) */}
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          onMouseMove={handleTimelineMouseMove}
          className={`relative flex-1 min-w-[800px] flex flex-col bg-[#060a14] overflow-hidden ${
            toolMode === 'split' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ width: `${100 * zoomLevel}%` }}
        >
          {/* Time Ruler */}
          <div className="h-7 border-b border-white/10 bg-[#080d1a] relative flex items-end select-none">
            {generateRulerMarkers(durationMs).map((marker, i) => (
              <div
                key={i}
                className="absolute text-[9px] text-gray-500 font-mono flex flex-col items-center transform -translate-x-1/2"
                style={{ left: `${(marker.ms / durationMs) * 100}%` }}
              >
                <span>{marker.label}</span>
                <div className="w-px h-1.5 bg-white/20 mt-0.5"></div>
              </div>
            ))}
          </div>

          {/* Video Track Lane */}
          <div className="h-16 border-b border-white/5 relative p-1 flex items-center bg-[#070b16]">
            {tracks[0]?.clips.map((clip) => {
              const left = (clip.startMs / durationMs) * 100;
              const width = ((clip.endMs - clip.startMs) / durationMs) * 100;
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    if (toolMode !== 'select') return;
                    e.stopPropagation();
                    setSelectedClipId(clip.id);
                  }}
                  className={`absolute h-14 px-2.5 py-1 flex flex-col justify-between transition-all border ${
                    toolMode === 'select' ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-[#FCA311] ring-2 ring-[#FCA311]/40 shadow-lg shadow-[#FCA311]/20'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: isSelected ? 'var(--surface-active)' : 'var(--bg-input)',
                  }}
                >
                  <div className="flex items-center justify-between overflow-hidden">
                    <span className="font-bold text-white text-[11px] truncate">{clip.name}</span>
                    <span className="text-[9px] font-mono text-gray-300 ml-1 shrink-0">
                      {((clip.endMs - clip.startMs) / 1000).toFixed(1)}s
                    </span>
                  </div>

                  {/* Real video frame filmstrip */}
                  <VideoClipFilmstrip clip={clip} />
                </div>
              );
            })}
          </div>

          {/* Audio Track Lane - real waveform driven by the actual decoded audio */}
          <div className="h-16 border-b border-white/5 relative p-1 flex items-center bg-[#05111a]">
            {tracks[1]?.clips.map((clip) => {
              const left = (clip.startMs / durationMs) * 100;
              const width = ((clip.endMs - clip.startMs) / durationMs) * 100;

              return (
                <div
                  key={clip.id}
                  className="absolute h-14 flex flex-col justify-between bg-[#082b33] border border-[#2dd4bf]/40 overflow-hidden"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                >
                  {/* Clip title badge at top of audio block like CapCut / Screenshot 2 */}
                  <div className="px-2 pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-cyan-200 truncate">
                      {clip.name}
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400/80">
                      {((clip.endMs - clip.startMs) / 1000).toFixed(1)}s
                    </span>
                  </div>

                  {/* Real waveform, driven by the clip's actual decoded audio */}
                  <div className="w-full pb-1 flex-1 min-h-0">
                    <ThinAudioWaveform
                      clip={clip}
                      silenceSegments={silenceSegments}
                      isSilenceCut={isSilenceCut}
                    />
                  </div>
                </div>
              );
            })}

            {/* Silence Marker Overlays on Waveform (highlighted in red if silence removal available) */}
            {!isSilenceCut &&
              silenceSegments.map((sil) => {
                const sLeft = (sil.startMs / durationMs) * 100;
                const sWidth = (sil.durationMs / durationMs) * 100;
                return (
                  <div
                    key={sil.id}
                    title={`Detected Silence Pause: ${(sil.durationMs / 1000).toFixed(1)}s (Click Auto Cut to remove)`}
                    className="absolute top-1 bottom-1 bg-red-500/25 border-x border-red-500/60 z-10 pointer-events-none flex items-center justify-center"
                    style={{
                      left: `${sLeft}%`,
                      width: `${sWidth}%`,
                    }}
                  >
                    <span className="text-[8px] font-mono text-red-300 font-bold bg-black/60 px-0.5">
                      PAUSE
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Captions Track Lane - draggable to retime, resizable from either edge */}
          <div className="h-12 border-b border-white/5 relative p-1 flex items-center bg-[#070b16]">
            {captions.map((cap) => {
              const left = (cap.startMs / durationMs) * 100;
              const width = ((cap.endMs - cap.startMs) / durationMs) * 100;
              const isActive =
                currentTimeMs >= cap.startMs && currentTimeMs <= cap.endMs;

              return (
                <div
                  key={cap.id}
                  onMouseDown={(e) => handleCaptionDragStart(e, cap, 'move')}
                  title={cap.text}
                  className={`group absolute h-8 px-2 flex items-center cursor-grab active:cursor-grabbing transition-all border text-[10px] font-medium truncate select-none ${
                    isActive
                      ? 'bg-[#FCA311] text-black font-bold border-white shadow-md'
                      : 'bg-[#14213D]/90 text-gray-200 border-white/10 hover:border-white/30'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 2)}%`,
                  }}
                >
                  <div
                    onMouseDown={(e) => handleCaptionDragStart(e, cap, 'resize-left')}
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100"
                  />
                  <span className="truncate pointer-events-none">{cap.text}</span>
                  <div
                    onMouseDown={(e) => handleCaptionDragStart(e, cap, 'resize-right')}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>

          {/* Playhead Vertical Line with Head Indicator */}
          <div
            id="timeline-playhead"
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center transform -translate-x-1/2"
            style={{ left: `${playheadPercent}%` }}
          >
            {/* Playhead Badge */}
            <div className="w-3.5 h-4 bg-[#FCA311] clip-playhead shadow-md flex items-center justify-center"></div>
            {/* Vertical Line */}
            <div className="w-0.5 flex-1 bg-[#FCA311] shadow-[0_0_8px_rgba(252,163,17,0.8)]"></div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Zoom & Navigation Bar */}
      <div
        ref={bottomBarRef}
        id="timeline-bottom-bar"
        className="h-7 px-4 bg-[#0a1020] border-t border-white/10 flex items-center justify-end text-[11px] text-gray-400 select-none cursor-ew-resize"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.4, Number((z - 0.25).toFixed(2))))}
            className="p-0.5 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="0.4"
            max="3.5"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className="w-28 h-1 bg-white/20 accent-[#FCA311] cursor-pointer"
            title="Timeline Zoom Slider"
          />
          <button
            onClick={() => setZoomLevel((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
            className="p-0.5 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/** Tracks an element's rendered width, debounced, for zoom-responsive detail. */
function useDebouncedWidth(delayMs = 120): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeout: number | undefined;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (!w) return;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setWidth(Math.round(w)), delayMs);
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [delayMs]);

  return [ref as React.RefObject<HTMLDivElement>, width];
}

/**
 * Renders the clip's real waveform (one bar per pixel of rendered width, so
 * zooming the timeline in/out reveals more or less actual detail) instead of
 * a simulated shape.
 */
const ThinAudioWaveform: React.FC<{
  clip: Clip;
  silenceSegments: SilenceSegment[];
  isSilenceCut: boolean;
}> = ({ clip, silenceSegments, isSilenceCut }) => {
  const [containerRef, width] = useDebouncedWidth();
  const [peaks, setPeaks] = useState<{ min: Float32Array; max: Float32Array } | null>(null);
  const [failed, setFailed] = useState(false);
  const sourceUrl = clip.audioUrl || clip.videoUrl;

  useEffect(() => {
    if (!sourceUrl || width <= 0) return;
    let cancelled = false;
    const bucketCount = Math.max(20, Math.min(2000, width));

    getDecodedAudio(sourceUrl)
      .then((buffer) => {
        if (cancelled) return;
        setPeaks(
          computeWaveformPeaks(
            buffer,
            bucketCount,
            clip.sourceStartMs / 1000,
            clip.sourceEndMs / 1000
          )
        );
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceUrl, clip.sourceStartMs, clip.sourceEndMs, width]);

  if (!sourceUrl || failed) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center pointer-events-none">
        <span className="text-[8px] text-cyan-200/30 font-mono uppercase tracking-wider">
          No audio
        </span>
      </div>
    );
  }

  if (!peaks) {
    return <div ref={containerRef} className="w-full h-full pointer-events-none" />;
  }

  const duration = Math.max(1000, clip.endMs - clip.startMs);
  const bucketCount = peaks.min.length;

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-end justify-between gap-[1px] px-1 overflow-hidden pointer-events-none"
    >
      {Array.from({ length: bucketCount }, (_, i) => {
        const t = clip.startMs + (i / bucketCount) * duration;
        const isSilence =
          !isSilenceCut && silenceSegments.some((sil) => t >= sil.startMs && t <= sil.endMs);
        const amplitude = Math.max(Math.abs(peaks.min[i]), Math.abs(peaks.max[i]));
        const heightPercent = isSilence ? 4 : Math.max(4, Math.min(100, amplitude * 100));

        return (
          <div
            key={i}
            className={`w-[1px] shrink-0 transition-all ${
              isSilence ? 'bg-red-400/35 h-[2px]' : 'bg-[#2dd4bf] opacity-85'
            }`}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
};

/**
 * Renders real extracted frames from the clip's source video (count scales
 * with rendered width, so zooming reveals more frames) instead of a static
 * filmstrip graphic.
 */
const VideoClipFilmstrip: React.FC<{ clip: Clip }> = ({ clip }) => {
  const [containerRef, width] = useDebouncedWidth();
  const [frames, setFrames] = useState<string[]>([]);
  const thumbCount = Math.max(1, Math.min(40, Math.round(width / 48)));

  useEffect(() => {
    if (!clip.videoUrl || width <= 0) return;
    let cancelled = false;
    getVideoThumbnails(clip.videoUrl, clip.sourceStartMs, clip.sourceEndMs, thumbCount)
      .then((thumbs) => {
        if (!cancelled) setFrames(thumbs);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      });
    return () => {
      cancelled = true;
    };
  }, [clip.videoUrl, clip.sourceStartMs, clip.sourceEndMs, thumbCount]);

  if (!clip.videoUrl) {
    return (
      <div ref={containerRef} className="flex-1 min-h-0 flex items-center overflow-hidden">
        <span className="text-[8px] text-white/30 font-mono uppercase tracking-wider">
          No preview
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 flex items-stretch gap-[1px] overflow-hidden">
      {frames.length === 0
        ? <div className="w-full h-full bg-white/10" />
        : frames.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              draggable={false}
              className="h-full flex-1 min-w-0 object-cover"
            />
          ))}
    </div>
  );
};

function generateRulerMarkers(durationMs: number) {
  const stepMs = durationMs > 120000 ? 30000 : 10000;
  const markers = [];
  for (let ms = 0; ms <= durationMs; ms += stepMs) {
    markers.push({
      ms,
      label: formatTimecode(ms, false),
    });
  }
  return markers;
}
