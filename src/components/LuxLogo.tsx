import React from 'react';

interface LuxLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const LuxLogo: React.FC<LuxLogoProps> = ({
  size = 'md',
  showText = true,
  showTagline = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon Matching lux blue.png */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/40`}
        style={{
          background: 'linear-gradient(145deg, #14213D 0%, #0B101D 100%)',
          border: '1px solid rgba(252, 163, 17, 0.25)',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-4/5 h-4/5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Play Triangle Accent in Brand Gold #FCA311 */}
          <path
            d="M20 18 C20 12 28 8 34 12 L84 44 C90 48 90 52 84 56 L34 88 C28 92 20 88 20 82 Z"
            fill="#FCA311"
          />

          {/* Dark Navy Inset */}
          <path
            d="M26 24 C26 20 31 17 35 20 L76 46 C79 48 79 52 76 54 L35 80 C31 83 26 80 26 76 Z"
            fill="#14213D"
          />

          {/* Middle Grey Bar Accent */}
          <rect x="36" y="38" width="24" height="6" fill="#E5E5E5" />
          <rect x="36" y="47" width="28" height="6" fill="#080D1A" />

          {/* Bold White Letter "L" */}
          <path
            d="M25 22 H41 V62 H62 V74 H25 V22 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight ${textSizes[size]} flex items-center`}>
            <span className="text-white font-extrabold tracking-tight">Lux</span>
            <span className="text-[#FCA311] font-black tracking-tight">Studio</span>
            <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#FCA311]/15 text-[#FCA311] border border-[#FCA311]/30">
              2.0
            </span>
          </div>
          {showTagline && (
            <span className="text-[9px] tracking-[0.22em] font-bold text-gray-400 uppercase mt-0.5">
              Edit • Automate • Publish
            </span>
          )}
        </div>
      )}
    </div>
  );
};
