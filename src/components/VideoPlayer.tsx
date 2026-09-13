import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Rewind,
  FastForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Film,
} from 'lucide-react';
import { AspectRatio, CaptionSegment, CaptionStyle, ChurchBranding } from '../types';
import { drawVideoFrame } from '../utils/canvasRenderer';
import { formatTimecode } from '../utils/formatters';

interface VideoPlayerProps {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  activeCaption: CaptionSegment | null;
  captionStyle: CaptionStyle;
  branding: ChurchBranding;
  customVideoUrl?: string | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  currentTimeMs,
  durationMs,
  isPlaying,
  onTogglePlay,
  onSeek,
  aspectRatio,
  onAspectRatioChange,
  activeCaption,
  captionStyle,
  branding,
  customVideoUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [frameRate, setFrameRate] = useState<number>(30);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fullscreen might be restricted by browser policy/iframe sandbox
    }
  };

  // Render loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawVideoFrame({
            ctx,
            width: canvas.width,
            height: canvas.height,
            timeMs: currentTimeMs,
            aspectRatio,
            activeCaption,
            captionStyle,
            branding,
            customVideoElement: videoRef.current,
            showSafeZones,
          });
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentTimeMs, aspectRatio, activeCaption, captionStyle, branding, showSafeZones]);

  // Synchronize custom video element if uploaded
  useEffect(() => {
    if (videoRef.current && customVideoUrl) {
      const targetSec = currentTimeMs / 1000;
      if (Math.abs(videoRef.current.currentTime - targetSec) > 0.3) {
        videoRef.current.currentTime = targetSec;
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [currentTimeMs, isPlaying, customVideoUrl]);

  // Handle keyboard shortcuts (spacebar for play/pause, left/right for seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(0, currentTimeMs - 3000));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(durationMs, currentTimeMs + 3000));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onSeek, currentTimeMs, durationMs]);

  // Playback control actions
  const handlePlay = () => {
    if (!isPlaying) onTogglePlay();
  };

  const handlePause = () => {
    if (isPlaying) onTogglePlay();
  };

  const handleStop = () => {
    if (isPlaying) onTogglePlay();
    onSeek(0);
  };

  const handleBackward = () => {
    // Seek back by 5000ms (or 1000ms if close to start)
    onSeek(Math.max(0, currentTimeMs - 5000));
  };

  const handleFastForward = () => {
    // Seek forward by 5000ms
    onSeek(Math.min(durationMs, currentTimeMs + 5000));
  };

  // Dimensions and css aspect-ratio configuration for all supported ratios
  const getRatioConfig = (ratio: AspectRatio) => {
    switch (ratio) {
      case '9:16':
        return { width: 540, height: 960, cssRatio: '9 / 16' };
      case '16:9':
        return { width: 960, height: 540, cssRatio: '16 / 9' };
      case '4:3':
        return { width: 800, height: 600, cssRatio: '4 / 3' };
      case '2:1':
        return { width: 960, height: 480, cssRatio: '2 / 1' };
      case '3:4':
        return { width: 600, height: 800, cssRatio: '3 / 4' };
      case '1:1':
        return { width: 720, height: 720, cssRatio: '1 / 1' };
      default:
        return { width: 540, height: 960, cssRatio: '9 / 16' };
    }
  };

  const ratioConfig = getRatioConfig(aspectRatio);
  const canvasWidth = ratioConfig.width;
  const canvasHeight = ratioConfig.height;

  return (
    <div
      ref={containerRef}
      id="video-player-container"
      className="relative flex flex-col items-center justify-between h-full w-full bg-[#050811] p-1.5 select-none overflow-hidden"
    >
      {/* Hidden video element for custom uploads */}
      {customVideoUrl && (
        <video
          ref={videoRef}
          src={customVideoUrl}
          playsInline
          muted={isMuted}
          className="hidden"
        />
      )}

      {/* Expanded Video Canvas Stage Area - Maximized size for the video player rectangle */}
      <div
        id="video-stage-container"
        className="relative flex-1 min-h-0 w-full flex items-center justify-center p-1 overflow-hidden"
      >
        <div
          className="relative flex items-center justify-center transition-all duration-300 shadow-2xl shadow-black ring-1 ring-white/15 overflow-hidden"
          style={{
            aspectRatio: ratioConfig.cssRatio,
            height: '100%',
            maxHeight: '100%',
            maxWidth: '100%',
            width: 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            id="preview-canvas"
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full object-contain bg-black cursor-pointer"
            onClick={onTogglePlay}
          />

          {/* Play overlay button when paused - smaller, floating */}
          {!isPlaying && (
            <button
              id="btn-canvas-play-overlay"
              onClick={onTogglePlay}
              title="Play Video (Space)"
              className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center text-[#FCA311] hover:text-white transition-all hover:scale-125 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] pointer-events-auto"
            >
              <Play className="w-8 h-8 fill-current ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Modern Player Control Bar */}
      <div
        id="player-controls-bar"
        className="mt-1 w-full max-w-2xl bg-[#090f1d]/95 backdrop-blur-md border border-white/10 px-4 py-1.5 flex items-center justify-between gap-3 shadow-lg shrink-0"
      >
        {/* Timecode Readout with frame rate accuracy (HH:MM:SS:FF) */}
        <div className="font-mono text-xs text-gray-300 flex items-center gap-1.5 font-semibold bg-black/40 px-2 py-0.5 border border-white/5">
          <span className="text-[#00e5ff] font-bold">
            {formatTimecode(currentTimeMs, true, frameRate)}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">
            {formatTimecode(durationMs, true, frameRate)}
          </span>
        </div>

        {/* Playback Controls: Backward, Play, Pause, Stop, Fast Forward */}
        <div className="flex items-center gap-1">
          {/* Backward */}
          <button
            id="btn-ctrl-backward"
            onClick={handleBackward}
            title="Backward -5s (Left Arrow)"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <Rewind className="w-4 h-4 fill-current" />
          </button>

          {/* Play */}
          <button
            id="btn-ctrl-play"
            onClick={handlePlay}
            title="Play (Space)"
            className={`p-1.5 transition-all active:scale-95 ${
              isPlaying
                ? 'text-[#FCA311] bg-[#FCA311]/15'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>

          {/* Pause */}
          <button
            id="btn-ctrl-pause"
            onClick={handlePause}
            title="Pause (Space)"
            className={`p-1.5 transition-all active:scale-95 ${
              !isPlaying
                ? 'text-[#FCA311] bg-[#FCA311]/15'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>

          {/* Stop */}
          <button
            id="btn-ctrl-stop"
            onClick={handleStop}
            title="Stop & Reset to 0:00"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 active:scale-95 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Fast Forward */}
          <button
            id="btn-ctrl-fast-forward"
            onClick={handleFastForward}
            title="Fast Forward +5s (Right Arrow)"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          >
            <FastForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Speed, Ratio & Volume controls */}
        <div className="flex items-center gap-2">
          {/* Ratio Selector (replaces FPS dropdown) */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-semibold hidden sm:inline">Ratio</span>
            <select
              id="select-aspect-ratio"
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange?.(e.target.value as AspectRatio)}
              title="Video Aspect Ratio"
              className="bg-[#14213D]/80 border border-white/10 px-1.5 py-1 text-[11px] font-mono font-bold text-[#FCA311] hover:text-white cursor-pointer focus:outline-none"
            >
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="2:1">2:1</option>
              <option value="3:4">3:4</option>
              <option value="1:1">1:1</option>
            </select>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">Speed</span>
            <select
              id="select-playback-speed"
              value={playbackRate}
              onChange={(e) => {
                const r = parseFloat(e.target.value);
                setPlaybackRate(r);
                if (videoRef.current) videoRef.current.playbackRate = r;
              }}
              title="Playback Speed"
              className="bg-[#14213D]/80 border border-white/10 px-1.5 py-1 text-[11px] font-mono font-bold text-gray-200 hover:text-white cursor-pointer focus:outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>
          </div>

          {/* Fullscreen Toggle */}
          <button
            id="btn-toggle-fullscreen"
            onClick={handleToggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-[#00e5ff] hover:bg-white/5 transition-colors"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Volume Mute Toggle */}
          <button
            id="btn-toggle-mute"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
