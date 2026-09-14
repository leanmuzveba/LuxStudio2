import React from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Undo2,
  Redo2,
  Sun,
  Moon,
} from 'lucide-react';
import { LuxLogo } from './LuxLogo';
import { useTheme } from '../contexts/ThemeContext';

export type AppView = 'editor' | 'clips' | 'summary' | 'brand' | 'export';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: any) => void;
  aiClipsCount: number;
  onOpenUpload: () => void;
  onResetSample: () => void;
  onExportClick: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  aiClipsCount,
  onOpenUpload,
  onResetSample,
  onExportClick,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      id="app-header"
      className="h-14 px-4 shrink-0 flex items-center justify-between z-30 border-b border-[#14213D]/80 select-none"
      style={{ background: 'var(--header-gradient)' }}
    >
      {/* Left: Brand & Logo + Undo/Redo */}
      <div className="flex items-center gap-4">
        <LuxLogo size="md" />

        {/* Undo / Redo controls */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/10">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Controls: Upload, Reset, Export (9:16 and 16:9 removed to Ratio dropdown) */}
      <div className="flex items-center gap-2.5">
        {/* Upload Video Button */}
        <button
          id="btn-open-upload"
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-200 bg-[#14213D]/60 hover:bg-[#14213D] border border-white/10 hover:border-white/25 transition-all"
        >
          <Upload className="w-3.5 h-3.5 text-gray-300" />
          <span className="hidden sm:inline">Upload Video</span>
        </button>

        {/* Reset / Reload Sample */}
        <button
          id="btn-reset-sample"
          onClick={onResetSample}
          title="Reload 1-2hr Teaching Sample"
          className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          id="btn-toggle-theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
          className="p-2 text-gray-400 hover:text-[#FCA311] bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Export Button */}
        <button
          id="btn-export-trigger"
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-black bg-[#FCA311] hover:bg-[#e2930f] shadow-md shadow-[#FCA311]/20 transition-all transform active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
