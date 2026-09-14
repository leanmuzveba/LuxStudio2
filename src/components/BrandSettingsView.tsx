import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Clock,
  Globe,
  Phone,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Layout,
} from 'lucide-react';
import { ChurchBranding } from '../types';
import { DEFAULT_CHURCH_BRANDING } from '../defaults';
import { LuxLogo } from './LuxLogo';

interface BrandSettingsViewProps {
  branding: ChurchBranding;
  onUpdateBranding: (branding: ChurchBranding) => void;
}

export const BrandSettingsView: React.FC<BrandSettingsViewProps> = ({
  branding,
  onUpdateBranding,
}) => {
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleReset = () => {
    onUpdateBranding(DEFAULT_CHURCH_BRANDING);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div
      id="brand-settings-view"
      className="h-full flex flex-col bg-[#070c17] text-white select-none overflow-y-auto"
    >
      {/* Top Banner */}
      <div className="p-6 border-b border-[#14213D] bg-gradient-to-r from-[#0c1426] via-[#101b33] to-[#0c1426] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 bg-[#FCA311]/20 border border-[#FCA311]/40 flex items-center justify-center text-[#FCA311]">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Brand Kit &amp; Church Information
            </h2>
          </div>
          <p className="text-gray-400 text-xs max-w-2xl leading-relaxed">
            Configure church address, service times, and brand identity once. These details are automatically applied to video lower-thirds, outro cards, and social captions across all projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-reset-branding"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            id="btn-save-branding"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FCA311] hover:bg-[#e2930f] text-black text-xs font-bold shadow-md shadow-[#FCA311]/20 transition-all active:scale-95"
          >
            {savedToast ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{savedToast ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Information Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Church Details */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FCA311]" />
              <span>Church &amp; Ministry Identity</span>
            </h3>

            {/* Ministry Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Church / Ministry Name
              </label>
              <input
                type="text"
                value={branding.churchName}
                onChange={(e) =>
                  onUpdateBranding({ ...branding, churchName: e.target.value })
                }
                className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#FCA311]"
              />
            </div>

            {/* Physical Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#FCA311]" />
                <span>Physical Address (Johannesburg)</span>
              </label>
              <input
                type="text"
                value={branding.address}
                onChange={(e) =>
                  onUpdateBranding({ ...branding, address: e.target.value })
                }
                className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#FCA311]"
              />
            </div>

            {/* Service Times */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#FCA311]" />
                <span>Service Times</span>
              </label>
              <input
                type="text"
                value={branding.serviceTimes}
                onChange={(e) =>
                  onUpdateBranding({ ...branding, serviceTimes: e.target.value })
                }
                className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#FCA311]"
              />
            </div>

            {/* Website & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#FCA311]" />
                  <span>Website URL</span>
                </label>
                <input
                  type="text"
                  value={branding.website}
                  onChange={(e) =>
                    onUpdateBranding({ ...branding, website: e.target.value })
                  }
                  className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#FCA311]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#FCA311]" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={branding.phone}
                  onChange={(e) =>
                    onUpdateBranding({ ...branding, phone: e.target.value })
                  }
                  className="w-full bg-[#060a14] border border-white/10 px-3.5 py-2 text-white text-xs focus:outline-none focus:border-[#FCA311]"
                />
              </div>
            </div>
          </div>

          {/* Placement Toggles */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#FCA311]" />
              <span>Video &amp; Audio Placement Defaults</span>
            </h3>

            {/* Lower Third Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <div className="text-xs font-bold text-white">Broadcast Lower-Third Overlay</div>
                <div className="text-[11px] text-gray-400">
                  Displays church address &amp; service times at the start of video clips
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateBranding({ ...branding, showLowerThird: !branding.showLowerThird })
                }
                className={`w-11 h-6 transition-colors relative flex items-center px-1 ${
                  branding.showLowerThird ? 'bg-[#FCA311]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black transition-transform ${
                    branding.showLowerThird ? 'translate-x-5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* End Card Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div>
                <div className="text-xs font-bold text-white">Branded End Card Outro</div>
                <div className="text-[11px] text-gray-400">
                  Shows closing invitation card with address, service times and website
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateBranding({ ...branding, showEndCard: !branding.showEndCard })
                }
                className={`w-11 h-6 transition-colors relative flex items-center px-1 ${
                  branding.showEndCard ? 'bg-[#FCA311]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black transition-transform ${
                    branding.showEndCard ? 'translate-x-5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* Social Copy Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-xs font-bold text-white">Include in Copyable Social Text</div>
                <div className="text-[11px] text-gray-400">
                  Appends church location and service hours when copying teaching summaries
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateBranding({ ...branding, includeInSocialCopy: !branding.includeInSocialCopy })
                }
                className={`w-11 h-6 transition-colors relative flex items-center px-1 ${
                  branding.includeInSocialCopy ? 'bg-[#FCA311]' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-black transition-transform ${
                    branding.includeInSocialCopy ? 'translate-x-5' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Brand Assets & Color Palette Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Logo preview */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
              Official Logo Asset
            </h3>
            <div className="p-6 bg-[#060a14] border border-white/5 flex flex-col items-center justify-center">
              <LuxLogo size="lg" />
              <span className="text-[10px] text-gray-400 mt-4">
                Vector High-DPI Logo Asset (`lux blue.png`)
              </span>
            </div>
          </div>

          {/* Color Palette from user image */}
          <div className="bg-[#0b1222] border border-[#14213D] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#FCA311]" />
                <span>Elegance Brand Palette</span>
              </h3>
              <span className="text-[10px] text-gray-400">5 Master Swatches</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white text-black font-mono text-xs font-bold shadow">
                <span>#FFFFFF (White)</span>
                <span className="text-[10px] font-sans text-gray-600">Headlines &amp; Text</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#E5E5E5] text-black font-mono text-xs font-bold shadow">
                <span>#E5E5E5 (Light Grey)</span>
                <span className="text-[10px] font-sans text-gray-600">Subtitles &amp; Borders</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#FCA311] text-black font-mono text-xs font-bold shadow">
                <span>#FCA311 (Amber Gold)</span>
                <span className="text-[10px] font-sans text-black/70">Key Accent &amp; Highlights</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#14213D] text-white font-mono text-xs font-bold shadow">
                <span>#14213D (Deep Oxford Navy)</span>
                <span className="text-[10px] font-sans text-gray-300">Containers &amp; Pills</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#000000] text-white font-mono text-xs font-bold border border-white/10 shadow">
                <span>#000000 (Black / Dark Slate)</span>
                <span className="text-[10px] font-sans text-gray-400">Studio Stage &amp; Canvas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
