import React from 'react';
import {
  Film,
  Sparkles,
  FileText,
  Building2,
} from 'lucide-react';
import { AppView } from './Header';

interface LeftNavProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  aiClipsCount: number;
}

export const LeftNav: React.FC<LeftNavProps> = ({
  currentView,
  onViewChange,
  aiClipsCount,
}) => {
  const navItems = [
    {
      id: 'editor' as AppView,
      label: 'Timeline Editor',
      shortLabel: 'Editor',
      icon: Film,
    },
    {
      id: 'clips' as AppView,
      label: 'AI Short Clips',
      shortLabel: 'AI Clips',
      icon: Sparkles,
      badge: aiClipsCount > 0 ? aiClipsCount : null,
    },
    {
      id: 'summary' as AppView,
      label: 'Teaching Summary',
      shortLabel: 'Summary',
      icon: FileText,
    },
    {
      id: 'brand' as AppView,
      label: 'Brand Kit',
      shortLabel: 'Brand',
      icon: Building2,
    },
  ];

  return (
    <aside
      id="left-vertical-navigation"
      className="w-14 md:w-44 shrink-0 bg-[#070d1a] border-r border-[#14213D] flex flex-col py-3 select-none z-20 transition-all"
    >
      <div className="px-2 pb-2 mb-1 border-b border-[#14213D]/60 hidden md:block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Views
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`left-nav-${item.id}`}
              data-nav-id={`nav-tab-${item.id}`}
              onClick={() => onViewChange(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[#14213D] text-white shadow-sm border border-[#00e5ff]/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#0e172e] border border-transparent'
              }`}
            >
              <div
                className={`p-1 rounded shrink-0 transition-colors ${
                  isActive ? 'bg-[#00e5ff]/15 text-[#00e5ff]' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <span
                className={`text-xs font-medium truncate hidden md:inline ${
                  isActive ? 'font-semibold text-white' : 'text-slate-300'
                }`}
              >
                {item.label}
              </span>

              {item.badge !== null && item.badge !== undefined && (
                <span className="ml-auto px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#FCA311] text-black shrink-0 hidden md:inline">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
