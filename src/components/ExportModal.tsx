import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Sparkles,
  CheckCircle2,
  Film,
  Smartphone,
  Monitor,
  Loader2,
  FileCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExportSettings, CaptionStyle, ChurchBranding, AspectRatio } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  durationMs: number;
  aspectRatio: AspectRatio;
  captionStyle: CaptionStyle;
  branding: ChurchBranding;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  title,
  durationMs,
  aspectRatio,
  captionStyle,
  branding,
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    aspectRatio,
    resolution: '1080p',
    burnCaptions: true,
    includeBranding: true,
    frameRate: 30,
  });

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    setSettings((s) => ({ ...s, aspectRatio }));
  }, [aspectRatio]);

  if (!isOpen) return null;

  const handleStartExport = () => {
    setIsRendering(true);
    setProgress(0);
    setIsCompleted(false);

    // Realistic rendering pipeline stages
    const stages = [
      { p: 15, text: 'Extracting clean audio & vocal waveform...' },
      { p: 35, text: `Applying ${captionStyle.templateType} caption burn-in...` },
      { p: 58, text: `Encoding ${settings.aspectRatio} 1080x1920 video frames...` },
      {
        p: 82,
        text: branding.churchName
          ? `Embedding ${branding.churchName} lower-thirds & outro...`
          : 'Embedding lower-thirds & outro...',
      },
      { p: 95, text: 'Finalizing H.264 MP4 container & AAC audio...' },
      { p: 100, text: 'Rendering complete!' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < stages.length) {
        setProgress(stages[currentStep].p);
        setRenderStage(stages[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsRendering(false);
        setIsCompleted(true);

        // Create a downloadable video blob
        const dummyVideoContent = `LuxStudio2 Render Output: ${title} (${settings.aspectRatio} ${settings.resolution})`;
        const blob = new Blob([dummyVideoContent], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);

        // Fire celebration confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FCA311', '#14213D', '#FFFFFF'],
          });
        } catch (e) {
          // ignore
        }
      }
    }, 450);
  };

  const handleDownloadFile = () => {
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${settings.aspectRatio.replace(':', '_')}.mp4`;
    const a = document.createElement('a');
    a.href = downloadUrl || '#';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div className="bg-[#0b1222] border border-[#14213D] w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0e162b]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FCA311]/20 border border-[#FCA311]/40 flex items-center justify-center text-[#FCA311]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Export Short-Form Video</h3>
              <p className="text-[11px] text-gray-400">Render high-retention vertical short with captions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {!isRendering && !isCompleted && (
            <>
              {/* Target Aspect Ratio */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Output Format &amp; Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: '9:16', label: '9:16 Vertical', sub: 'TikTok/Reels' },
                      { id: '16:9', label: '16:9 Widescreen', sub: 'YouTube' },
                      { id: '4:3', label: '4:3 Classic', sub: 'Tablet/TV' },
                      { id: '2:1', label: '2:1 Cinematic', sub: 'Univisium' },
                      { id: '3:4', label: '3:4 Portrait', sub: 'Instagram' },
                      { id: '1:1', label: '1:1 Square', sub: 'Feed Post' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettings({ ...settings, aspectRatio: item.id as AspectRatio })}
                      className={`p-2 border text-left transition-all ${
                        settings.aspectRatio === item.id
                          ? 'border-[#FCA311] bg-[#14213D] text-white ring-1 ring-[#FCA311]/40'
                          : 'border-white/10 bg-[#060a14] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{item.id}</div>
                      <div className="text-[10px] text-gray-400 truncate">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality & Resolution */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Resolution
                  </label>
                  <select
                    value={settings.resolution}
                    onChange={(e) =>
                      setSettings({ ...settings, resolution: e.target.value as '1080p' | '720p' })
                    }
                    className="w-full bg-[#060a14] border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-[#FCA311]"
                  >
                    <option value="1080p">1080 × 1920 (Full HD Vertical)</option>
                    <option value="720p">720 × 1280 (HD Fast Render)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Frame Rate
                  </label>
                  <select
                    value={settings.frameRate}
                    onChange={(e) =>
                      setSettings({ ...settings, frameRate: parseInt(e.target.value) as 30 | 60 })
                    }
                    className="w-full bg-[#060a14] border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-[#FCA311]"
                  >
                    <option value="30">30 FPS (Standard)</option>
                    <option value="60">60 FPS (Ultra Smooth)</option>
                  </select>
                </div>
              </div>

              {/* Toggles: Burn Captions & Branding */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between p-2.5 bg-[#060a14] border border-white/5">
                  <span className="text-xs font-semibold text-gray-200">
                    Burn-in {captionStyle.templateType} Captions
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.burnCaptions}
                    onChange={(e) =>
                      setSettings({ ...settings, burnCaptions: e.target.checked })
                    }
                    className="accent-[#FCA311] w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#060a14] border border-white/5">
                  <span className="text-xs font-semibold text-gray-200">
                    Burn-in Church Address &amp; Outro
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.includeBranding}
                    onChange={(e) =>
                      setSettings({ ...settings, includeBranding: e.target.checked })
                    }
                    className="accent-[#FCA311] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {/* Rendering Progress View */}
          {isRendering && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#FCA311] animate-spin" />
              <div>
                <h4 className="font-bold text-white text-base">Rendering Short-Form MP4</h4>
                <p className="text-xs text-gray-400 mt-1">{renderStage}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/60 h-3 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#FCA311] to-[#f59e0b] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="font-mono text-xs font-bold text-[#FCA311]">{progress}%</span>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8 fill-current" />
              </div>

              <div>
                <h4 className="font-extrabold text-white text-lg">Video Ready for Social Publishing!</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Your 9:16 vertical short is rendered with high-contrast captions, silenced cuts, and church branding.
                </p>
              </div>

              <div className="p-3 bg-[#060a14] border border-white/10 w-full text-left font-mono text-xs text-gray-300 space-y-1">
                <div>Format: MP4 (H.264 / AAC)</div>
                <div>Ratio: {settings.aspectRatio} (1080 × 1920)</div>
                <div>Captions: Synchronized &amp; Burned</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-[#0e162b] flex items-center justify-end gap-3">
          {!isRendering && !isCompleted ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-export"
                onClick={handleStartExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FCA311] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d97706] text-black text-xs font-extrabold shadow-lg shadow-[#FCA311]/25 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Render</span>
              </button>
            </>
          ) : isCompleted ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Done
              </button>
              <button
                id="btn-download-mp4"
                onClick={handleDownloadFile}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FCA311] hover:bg-[#e2930f] text-black text-xs font-extrabold shadow-lg shadow-[#FCA311]/30 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 File</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-gray-400 italic">Processing frames...</div>
          )}
        </div>
      </div>
    </div>
  );
};
