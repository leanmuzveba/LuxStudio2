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
} from 'lucide-react';
import { Track, Clip, SilenceSegment, CaptionSegment } from '../types';
import { formatTimecode } from '../utils/formatters';

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
  onAutoCutSilences: () => void;
  onRestoreSilences: () => void;
  captions: CaptionSegment[];
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
  onAutoCutSilences,
  onRestoreSilences,
  captions,
  autoMergeEnabled,
  onToggleAutoMerge,
  onSelectTrackFile,
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
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

  // Split selected clip at playhead
  const handleSplitClipAtPlayhead = () => {
    let splitOccurred = false;
    const newTracks = tracks.map((track) => {
      const clipToSplitIndex = track.clips.findIndex(
        (c) =>
          c.id === selectedClipId ||
          (selectedClipId === null &&
            currentTimeMs > c.startMs + 500 &&
            currentTimeMs < c.endMs - 500)
      );

      if (clipToSplitIndex === -1) return track;

      const clip = track.clips[clipToSplitIndex];
      // Only split if playhead is strictly inside the clip
      if (currentTimeMs <= clip.startMs + 400 || currentTimeMs >= clip.endMs - 400) {
        return track;
      }

      splitOccurred = true;
      const firstPart: Clip = {
        ...clip,
        id: `${clip.id}-a-${Date.now()}`,
        name: `${clip.name} (Part 1)`,
        endMs: currentTimeMs,
        sourceEndMs: clip.sourceStartMs + (currentTimeMs - clip.startMs),
      };

      const secondPart: Clip = {
        ...clip,
        id: `${clip.id}-b-${Date.now() + 1}`,
        name: `${clip.name} (Part 2)`,
        startMs: currentTimeMs,
        sourceStartMs: clip.sourceStartMs + (currentTimeMs - clip.startMs),
      };

      const updatedClips = [...track.clips];
      updatedClips.splice(clipToSplitIndex, 1, firstPart, secondPart);

      return {
        ...track,
        clips: updatedClips,
      };
    });

    if (splitOccurred) {
      onTracksChange(newTracks);
    }
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

  // Timeline scrub calculation
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.floor(ratio * durationMs));
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
          {/* Split Clip Icon */}
          <button
            id="btn-split-clip"
            onClick={handleSplitClipAtPlayhead}
            className="p-1.5 bg-[#14213D] hover:bg-[#1f335e] text-white border border-white/10 transition-colors shadow-sm active:scale-95"
            title="Split Clip at Playhead (S)"
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
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#FCA311] to-[#f78e05] text-black font-bold shadow-md shadow-[#FCA311]/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto Cut Silences ({silenceSegments.length} detected)</span>
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
          className="relative flex-1 min-w-[800px] flex flex-col bg-[#060a14] cursor-crosshair overflow-hidden"
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
                    e.stopPropagation();
                    setSelectedClipId(clip.id);
                  }}
                  className={`absolute h-14 px-2.5 py-1 flex flex-col justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#FCA311] ring-2 ring-[#FCA311]/40 shadow-lg shadow-[#FCA311]/20'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: isSelected ? '#1c2d54' : '#14213D',
                  }}
                >
                  <div className="flex items-center justify-between overflow-hidden">
                    <span className="font-bold text-white text-[11px] truncate">{clip.name}</span>
                    <span className="text-[9px] font-mono text-gray-300 ml-1 shrink-0">
                      {((clip.endMs - clip.startMs) / 1000).toFixed(1)}s
                    </span>
                  </div>

                  {/* Clip video filmstrip graphic thumbnail simulation */}
                  <div className="flex items-center gap-1 opacity-40 overflow-hidden h-3">
                    <div className="w-6 h-2.5 bg-white/30 shrink-0"></div>
                    <div className="w-6 h-2.5 bg-white/20 shrink-0"></div>
                    <div className="w-6 h-2.5 bg-white/30 shrink-0"></div>
                    <div className="w-6 h-2.5 bg-white/20 shrink-0"></div>
                    <div className="w-6 h-2.5 bg-white/30 shrink-0"></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audio Track Lane - High-density thin lines waveform matching screenshot 2 */}
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

                  {/* Waveform rendered as delicate thin vertical lines */}
                  <div className="w-full pb-1">
                    <ThinAudioWaveform
                      clipStartMs={clip.startMs}
                      clipEndMs={clip.endMs}
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

          {/* Captions Track Lane */}
          <div className="h-12 border-b border-white/5 relative p-1 flex items-center bg-[#070b16]">
            {captions.map((cap) => {
              const left = (cap.startMs / durationMs) * 100;
              const width = ((cap.endMs - cap.startMs) / durationMs) * 100;
              const isActive =
                currentTimeMs >= cap.startMs && currentTimeMs <= cap.endMs;

              return (
                <div
                  key={cap.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(cap.startMs);
                  }}
                  title={cap.text}
                  className={`absolute h-8 px-2 flex items-center cursor-pointer transition-all border text-[10px] font-medium truncate ${
                    isActive
                      ? 'bg-[#FCA311] text-black font-bold border-white shadow-md'
                      : 'bg-[#14213D]/90 text-gray-200 border-white/10 hover:border-white/30'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 2)}%`,
                  }}
                >
                  <span className="truncate">{cap.text}</span>
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

/**
 * Component to render realistic high-density thin waveform lines (as seen in CapCut / Screenshot 2)
 */
const ThinAudioWaveform: React.FC<{
  clipStartMs: number;
  clipEndMs: number;
  silenceSegments: SilenceSegment[];
  isSilenceCut: boolean;
}> = ({ clipStartMs, clipEndMs, silenceSegments, isSilenceCut }) => {
  const duration = Math.max(1000, clipEndMs - clipStartMs);
  // High density of thin lines: 180 vertical lines across the clip width
  const lineCount = 180;
  const bars: { id: number; height: number; isSilence: boolean }[] = [];

  for (let i = 0; i < lineCount; i++) {
    const t = clipStartMs + (i / lineCount) * duration;
    const isSilence =
      !isSilenceCut &&
      silenceSegments.some((sil) => t >= sil.startMs && t <= sil.endMs);

    let heightPercent = 6;
    if (!isSilence) {
      // Harmonic simulation of human vocal frequency & dynamic envelope
      const wave1 = Math.sin(i * 0.42) * 30;
      const wave2 = Math.cos(i * 0.88) * 25;
      const wave3 = Math.sin(i * 2.1) * 15;
      const speechEnvelope = (Math.sin(i * 0.14) + 1.2) * 14;
      heightPercent = Math.max(8, Math.min(95, 20 + wave1 + wave2 + wave3 + speechEnvelope));
    }

    bars.push({ id: i, height: heightPercent, isSilence });
  }

  return (
    <div className="w-full h-8 flex items-end justify-between gap-[1px] px-1 overflow-hidden pointer-events-none">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className={`w-[1px] shrink-0 transition-all ${
            bar.isSilence ? 'bg-red-400/35 h-[2px]' : 'bg-[#2dd4bf] opacity-85'
          }`}
          style={{ height: `${bar.height}%` }}
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
