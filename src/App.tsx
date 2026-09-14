import React, { useState, useEffect, useRef } from 'react';
import { Header, AppView } from './components/Header';
import { LeftNav } from './components/LeftNav';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineEditor } from './components/TimelineEditor';
import { CaptionsEditor } from './components/CaptionsEditor';
import { AIClipsView } from './components/AIClipsView';
import { TeachingSummaryView } from './components/TeachingSummaryView';
import { BrandSettingsView } from './components/BrandSettingsView';
import { ExportModal } from './components/ExportModal';
import { UploadModal } from './components/UploadModal';
import {
  Track,
  Clip,
  SilenceSegment,
  CaptionSegment,
  CaptionStyle,
  AIClipCandidate,
  TeachingSummary,
  ChurchBranding,
  AspectRatio,
} from './types';
import {
  SAMPLE_PROJECT,
  SAMPLE_TEACHING_SUMMARY,
  DEFAULT_CHURCH_BRANDING,
  DEFAULT_CAPTION_STYLES,
} from './sampleData';
import { decodeAudioSource, detectSilenceRanges } from './utils/audioAnalysis';
import { removeRangesFromTracks } from './utils/timelineOps';

export function App() {
  // Navigation View
  const [currentView, setCurrentView] = useState<AppView>('editor');

  // Timeline & Playback State
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(SAMPLE_PROJECT.durationMs);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [autoMergeEnabled, setAutoMergeEnabled] = useState<boolean>(true);

  // Tracks and Undo/Redo history
  const [tracks, setTracks] = useState<Track[]>(SAMPLE_PROJECT.tracks);
  const [historyPast, setHistoryPast] = useState<Track[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Track[][]>([]);

  // Silence Segments & Auto-Cut State
  const [silenceSegments, setSilenceSegments] = useState<SilenceSegment[]>(
    SAMPLE_PROJECT.silenceSegments
  );
  const [isSilenceCut, setIsSilenceCut] = useState<boolean>(false);
  const [isDetectingSilences, setIsDetectingSilences] = useState<boolean>(false);
  const originalTracksRef = useRef<Track[]>(SAMPLE_PROJECT.tracks);

  // Decode the given source's real audio and replace silenceSegments with
  // whatever silent stretches actually exist across its full duration.
  const runSilenceDetection = async (sourceUrl: string) => {
    setIsDetectingSilences(true);
    try {
      const buffer = await decodeAudioSource(sourceUrl);
      const ranges = detectSilenceRanges(buffer);
      setSilenceSegments(
        ranges.map((r, i) => ({
          id: `sil-${i}-${Math.round(r.startMs)}`,
          startMs: r.startMs,
          endMs: r.endMs,
          durationMs: r.endMs - r.startMs,
        }))
      );
    } catch (e) {
      console.warn('Silence detection failed:', e);
      setSilenceSegments([]);
    } finally {
      setIsDetectingSilences(false);
    }
  };

  // Captions & Caption Style (3 Templates)
  const [captions, setCaptions] = useState<CaptionSegment[]>(SAMPLE_PROJECT.captions);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    DEFAULT_CAPTION_STYLES['bold-impact']
  );

  // AI Generated Clips & Teaching Summary
  const [aiClipCandidates, setAiClipCandidates] = useState<AIClipCandidate[]>(
    SAMPLE_PROJECT.aiClipCandidates
  );
  const [teachingSummary, setTeachingSummary] = useState<TeachingSummary>(
    SAMPLE_TEACHING_SUMMARY
  );

  // Church Branding State
  const [branding, setBranding] = useState<ChurchBranding>(DEFAULT_CHURCH_BRANDING);

  // Resizable Panels State (Draggable Boundaries)
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(360);
  const [timelineHeight, setTimelineHeight] = useState<number>(230);
  const [isDraggingH, setIsDraggingH] = useState<boolean>(false);
  const [isDraggingV, setIsDraggingV] = useState<boolean>(false);

  // Dragging right panel width (vertical boundary between Video Player and Captions Panel)
  const handleStartDragRightPanel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingH(true);
    const startX = e.clientX;
    const startW = rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Moving mouse left increases right panel width, moving right decreases it
      const newW = Math.max(260, Math.min(680, startW - deltaX));
      setRightPanelWidth(newW);
    };

    const onMouseUp = () => {
      setIsDraggingH(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Dragging timeline height (horizontal boundary between Upper Area and Timeline Editor)
  const handleStartDragTimeline = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingV(true);
    const startY = e.clientY;
    const startH = timelineHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      // Moving mouse up increases timeline height, moving down decreases it
      const newH = Math.max(140, Math.min(520, startH - deltaY));
      setTimelineHeight(newH);
    };

    const onMouseUp = () => {
      setIsDraggingV(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Modals & Async Loaders
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isGeneratingClips, setIsGeneratingClips] = useState<boolean>(false);
  const [isRegeneratingSummary, setIsRegeneratingSummary] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);

  // Calculate Active Caption at current playhead time
  const activeCaption =
    captions.find(
      (c) => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs
    ) || null;

  // Playback Loop (requestAnimationFrame for smooth 60fps playhead movement)
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (isPlaying) {
        setCurrentTimeMs((prev) => {
          const next = prev + delta;
          if (next >= durationMs) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, durationMs]);

  // Track Update with History Recording
  const updateTracksWithHistory = (newTracks: Track[]) => {
    setHistoryPast((prev) => [...prev.slice(-20), tracks]);
    setHistoryFuture([]);
    setTracks(newTracks);

    // Recalculate duration from latest clip end
    let maxEnd = 0;
    newTracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.endMs > maxEnd) maxEnd = c.endMs;
      });
    });
    if (maxEnd > 0) setDurationMs(maxEnd);
  };

  // Undo / Redo handlers
  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [tracks, ...prev]);
    setTracks(previous);
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, tracks]);
    setTracks(next);
  };

  // Play / Pause Toggle
  const handleTogglePlay = () => {
    lastTimeRef.current = performance.now();
    setIsPlaying(!isPlaying);
  };

  // Seek handler
  const handleSeek = (ms: number) => {
    setCurrentTimeMs(Math.max(0, Math.min(durationMs, ms)));
  };

  // Auto-Cut Silences Logic — removes every detected silent range from every
  // track using the same cut points, so video and audio stay in sync.
  const handleAutoCutSilences = () => {
    if (silenceSegments.length === 0) return;
    originalTracksRef.current = tracks;
    setIsSilenceCut(true);
    const cutTracks = removeRangesFromTracks(tracks, silenceSegments);
    updateTracksWithHistory(cutTracks);
  };

  const handleRestoreSilences = () => {
    setIsSilenceCut(false);
    updateTracksWithHistory(originalTracksRef.current);
  };

  // Auto-Generate / Transcribe Captions
  const handleAutoGenerateCaptions = async () => {
    setIsTranscribing(true);
    try {
      // Simulate transcription with server call or fallback
      await new Promise((r) => setTimeout(r, 1200));
      // Re-align sample captions to active timeline
      setCaptions(SAMPLE_PROJECT.captions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranscribing(false);
    }
  };

  // AI Short Clip Selection -> Loads into timeline
  const handleSelectAIClip = (clip: AIClipCandidate) => {
    setCurrentTimeMs(clip.startMs);
    setAspectRatio('9:16');
    setCurrentView('editor');
  };

  // AI Generate More Clips (calling Gemini backend)
  const handleGenerateMoreAIClips = async () => {
    setIsGeneratingClips(true);
    try {
      const response = await fetch('/api/gemini/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: SAMPLE_PROJECT.transcriptText,
          durationMs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.clips && data.clips.length > 0) {
          setAiClipCandidates((prev) => [...data.clips, ...prev]);
        }
      }
    } catch (err) {
      console.warn('AI generate clips fallback used:', err);
    } finally {
      setIsGeneratingClips(false);
    }
  };

  // AI Regenerate Teaching Summary
  const handleRegenerateSummary = async () => {
    setIsRegeneratingSummary(true);
    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: SAMPLE_PROJECT.transcriptText,
          churchName: branding.churchName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.title && data.hashtags) {
          setTeachingSummary({
            title: data.title,
            summary: data.summary,
            hashtags: data.hashtags.slice(0, 5),
            keyScriptures: data.keyScriptures || [],
          });
        }
      }
    } catch (err) {
      console.warn('AI summarize fallback used:', err);
    } finally {
      setIsRegeneratingSummary(false);
    }
  };

  // Upload Video handler
  const handleUploadSuccess = (file: File, newDurationMs: number) => {
    const url = URL.createObjectURL(file);
    setCustomVideoUrl(url);
    setDurationMs(newDurationMs);
    setCurrentTimeMs(0);

    // Update tracks with newly uploaded video clip
    const updatedTracks: Track[] = [
      {
        id: 'track-video',
        name: 'Video',
        type: 'video',
        muted: false,
        orderIndex: 0,
        clips: [
          {
            id: `clip-upload-${Date.now()}`,
            trackId: 'track-video',
            name: file.name,
            startMs: 0,
            endMs: newDurationMs,
            sourceStartMs: 0,
            sourceEndMs: newDurationMs,
            videoUrl: url,
          },
        ],
      },
      {
        id: 'track-audio',
        name: 'Vocal Audio',
        type: 'audio',
        muted: false,
        orderIndex: 1,
        clips: [
          {
            id: `clip-audio-${Date.now()}`,
            trackId: 'track-audio',
            name: 'Extracted Voice',
            startMs: 0,
            endMs: newDurationMs,
            sourceStartMs: 0,
            sourceEndMs: newDurationMs,
            // Same file as the video clip — decodeAudioData only needs the
            // audio track, so this drives the real waveform + silence detection.
            audioUrl: url,
          },
        ],
      },
    ];

    updateTracksWithHistory(updatedTracks);
    setIsSilenceCut(false);
    void runSilenceDetection(url);
  };

  // Select a replacement file for a track (Video or Audio), reading its real duration
  const handleSelectTrackFile = (trackId: 'track-video' | 'track-audio', file: File) => {
    const url = URL.createObjectURL(file);
    const mediaEl = document.createElement(trackId === 'track-video' ? 'video' : 'audio');
    mediaEl.preload = 'metadata';

    const applyClip = (clipDurationMs: number) => {
      if (trackId === 'track-video') {
        setCustomVideoUrl(url);
        setDurationMs(clipDurationMs);
        setCurrentTimeMs(0);
      }
      const newTracks = tracks.map((track) => {
        if (track.id !== trackId) return track;
        const existing = track.clips[0];
        const newClip: Clip = {
          id: existing?.id ?? `clip-${trackId}-${Date.now()}`,
          trackId,
          name: file.name,
          startMs: 0,
          endMs: clipDurationMs,
          sourceStartMs: 0,
          sourceEndMs: clipDurationMs,
          color: existing?.color,
          ...(trackId === 'track-video' ? { videoUrl: url } : { audioUrl: url }),
        };
        return { ...track, clips: [newClip] };
      });
      updateTracksWithHistory(newTracks);
      setIsSilenceCut(false);
      void runSilenceDetection(url);
    };

    mediaEl.onloadedmetadata = () => {
      applyClip(Math.round((mediaEl.duration || durationMs / 1000) * 1000));
    };
    mediaEl.onerror = () => {
      applyClip(durationMs);
    };
    mediaEl.src = url;
  };

  // Load Preset Sermon handler
  const handleLoadPreset = (presetType: '1hr' | '2hr') => {
    const dur = presetType === '1hr' ? 3600000 : 7200000;
    setDurationMs(SAMPLE_PROJECT.durationMs);
    setCurrentTimeMs(0);
    setTracks(SAMPLE_PROJECT.tracks);
    setCaptions(SAMPLE_PROJECT.captions);
    setSilenceSegments(SAMPLE_PROJECT.silenceSegments);
    setIsSilenceCut(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070c17] text-white font-sans antialiased">
      {/* Top Application Bar */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        aiClipsCount={aiClipCandidates.length}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetSample={() => handleLoadPreset('1hr')}
        onExportClick={() => setIsExportOpen(true)}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Workspace Area with Left Navigation Bar below Logo */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Upper Row: Left Nav + Active View (Timeline row lives outside this row so it can span full width) */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Vertical Navigation Bar (Timeline Editor, AI Short Clips, Teaching Summary, Brand Kit) */}
          <LeftNav
            currentView={currentView}
            onViewChange={setCurrentView}
            aiClipsCount={aiClipCandidates.length}
          />

          {/* View Workspace Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
            {/* VIEW 1: Video Stage + Captions Editor (Timeline rendered full-width below) */}
            {currentView === 'editor' && (
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative select-none">
                {/* Video Player Canvas Stage - Maximized space */}
                <div className="flex-1 h-full min-h-[200px] relative overflow-hidden">
                  <VideoPlayer
                    currentTimeMs={currentTimeMs}
                    durationMs={durationMs}
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                    onSeek={handleSeek}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                    activeCaption={activeCaption}
                    captionStyle={captionStyle}
                    customVideoUrl={customVideoUrl}
                  />
                </div>

                {/* Adjustable Vertical Splitter (Drag to resize Video vs Captions) */}
                <div
                  id="splitter-vertical-captions"
                  onMouseDown={handleStartDragRightPanel}
                  className={`hidden md:flex w-2.5 -mx-1 z-30 cursor-col-resize group relative items-center justify-center transition-colors select-none ${
                    isDraggingH ? 'bg-[#00e5ff]' : 'hover:bg-[#00e5ff]/50 bg-transparent'
                  }`}
                  title="Drag to resize Captions panel (Adjustable boundary)"
                >
                  <div className="w-1 h-full bg-[#14213D] group-hover:bg-[#00e5ff] transition-colors flex items-center justify-center">
                    <div className="w-1 h-8 bg-white/40 group-hover:bg-white rounded-full" />
                  </div>
                </div>

                {/* Right Captions Customizer & Transcript Drawer (Adjustable Width) */}
                <div
                  id="captions-panel-container"
                  style={{ width: `${rightPanelWidth}px` }}
                  className="w-full shrink-0 h-64 md:h-full border-t md:border-t-0 flex flex-col overflow-hidden"
                >
                  <CaptionsEditor
                    captions={captions}
                    onCaptionsChange={setCaptions}
                    captionStyle={captionStyle}
                    onStyleChange={setCaptionStyle}
                    currentTimeMs={currentTimeMs}
                    onSeek={handleSeek}
                    onAutoGenerateCaptions={handleAutoGenerateCaptions}
                    isTranscribing={isTranscribing}
                  />
                </div>
              </div>
            )}

            {/* VIEW 2: AI SHORT CLIPS */}
            {currentView === 'clips' && (
              <div className="w-full h-full">
                <AIClipsView
                  candidates={aiClipCandidates}
                  onSelectClip={handleSelectAIClip}
                  onExportClip={(clip) => {
                    setCurrentTimeMs(clip.startMs);
                    setAspectRatio('9:16');
                    setIsExportOpen(true);
                  }}
                  onGenerateMore={handleGenerateMoreAIClips}
                  isGenerating={isGeneratingClips}
                  onUpdateCandidate={(updated) =>
                    setAiClipCandidates((prev) =>
                      prev.map((c) => (c.id === updated.id ? updated : c))
                    )
                  }
                  onDeleteCandidate={(id) =>
                    setAiClipCandidates((prev) => prev.filter((c) => c.id !== id))
                  }
                  branding={branding}
                />
              </div>
            )}

            {/* VIEW 3: TEACHING SUMMARY & 5 HASHTAGS */}
            {currentView === 'summary' && (
              <div className="w-full h-full">
                <TeachingSummaryView
                  summaryData={teachingSummary}
                  onRegenerate={handleRegenerateSummary}
                  isRegenerating={isRegeneratingSummary}
                  branding={branding}
                  onUpdateSummary={setTeachingSummary}
                />
              </div>
            )}

            {/* VIEW 4: BRAND SETTINGS & CHURCH INFO */}
            {currentView === 'brand' && (
              <div className="w-full h-full">
                <BrandSettingsView
                  branding={branding}
                  onUpdateBranding={setBranding}
                />
              </div>
            )}
          </div>
        </div>

        {/* Full-Width Timeline Row - extends left under the Views nav to maximize space */}
        {currentView === 'editor' && (
          <>
            {/* Adjustable Horizontal Splitter (Drag to resize Timeline height) */}
            <div
              id="splitter-horizontal-timeline"
              onMouseDown={handleStartDragTimeline}
              className={`h-2.5 -my-1 z-30 cursor-row-resize group relative flex items-center justify-center transition-colors select-none ${
                isDraggingV ? 'bg-[#00e5ff]' : 'hover:bg-[#00e5ff]/50 bg-transparent'
              }`}
              title="Drag to adjust Timeline height (Adjustable boundary)"
            >
              <div className="h-1 w-full bg-[#14213D] group-hover:bg-[#00e5ff] transition-colors flex items-center justify-center">
                <div className="h-1 w-14 bg-white/40 group-hover:bg-white rounded-full" />
              </div>
            </div>

            {/* Full-Width Multi-Track Timeline Editor (Adjustable Height) */}
            <div
              id="timeline-panel-container"
              style={{ height: `${timelineHeight}px` }}
              className="shrink-0 w-full overflow-hidden"
            >
              <TimelineEditor
                tracks={tracks}
                onTracksChange={updateTracksWithHistory}
                currentTimeMs={currentTimeMs}
                durationMs={durationMs}
                onSeek={handleSeek}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                silenceSegments={silenceSegments}
                isSilenceCut={isSilenceCut}
                isDetectingSilences={isDetectingSilences}
                onAutoCutSilences={handleAutoCutSilences}
                onRestoreSilences={handleRestoreSilences}
                captions={captions}
                autoMergeEnabled={autoMergeEnabled}
                onToggleAutoMerge={setAutoMergeEnabled}
                onSelectTrackFile={handleSelectTrackFile}
              />
            </div>
          </>
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title={teachingSummary.title}
        durationMs={durationMs}
        aspectRatio={aspectRatio}
        captionStyle={captionStyle}
        branding={branding}
      />

      {/* Upload Video Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
export default App;
