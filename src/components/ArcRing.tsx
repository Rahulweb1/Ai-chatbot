import React from 'react';

export type ArcRingMode = 'idle' | 'thinking' | 'speaking' | 'listening';

interface ArcRingProps {
  mode?: ArcRingMode;
  audioLevel?: number; // 0.0 to 1.0 amplitude
  size?: number; // default 40px
  className?: string;
}

export function ArcRing({ mode = 'idle', audioLevel = 0, size = 150, className = '' }: ArcRingProps) {
  // Mode label text
  let centerText = 'STANDBY';
  if (mode === 'thinking') centerText = 'THINKING';
  else if (mode === 'speaking') centerText = 'SPEAKING';
  else if (mode === 'listening') centerText = 'LISTENING';

  const scaleFactor = mode === 'speaking' || mode === 'listening' ? 1 + audioLevel * 0.15 : 1;

  return (
    <div className={`relative flex flex-col items-center justify-center shrink-0 ${className}`}>
      <div
        className="relative flex items-center justify-center transition-transform duration-100"
        style={{
          width: size,
          height: size,
          transform: `scale(${scaleFactor})`,
        }}
      >
        <svg viewBox="0 0 150 150" className="w-full h-full">
          {/* Static Background Rings */}
          <circle cx="75" cy="75" r="70" fill="none" stroke="#1e3358" strokeWidth="1" />
          <circle cx="75" cy="75" r="55" fill="none" stroke="#1e3358" strokeWidth="1" />

          {/* Forward Pulsing Spinning Ring */}
          <circle
            cx="75"
            cy="75"
            r="62"
            fill="none"
            stroke="#8fc0ff"
            strokeWidth="1.4"
            strokeDasharray="6 10"
            className="animate-spin-slow ring-glow"
            style={{ transformOrigin: '75px 75px' }}
          />

          {/* Reverse Pulsing Spinning Ring */}
          <circle
            cx="75"
            cy="75"
            r="47"
            fill="none"
            stroke="#8fc0ff"
            strokeWidth="1.4"
            strokeDasharray="6 10"
            className="animate-spin-reverse ring-glow opacity-50"
            style={{ transformOrigin: '75px 75px' }}
          />

          {/* Center Dot or Nodes */}
          {mode === 'speaking' && (
            <circle cx="75" cy="75" r={8 + audioLevel * 10} fill="#8fc0ff" className="transition-all duration-75 ring-glow" />
          )}
        </svg>

        {/* Core Center Label */}
        <div className="absolute inset-0 flex items-center justify-center font-grotesk font-medium text-[11px] text-[#8fc0ff] tracking-[.08em] pointer-events-none">
          {centerText}
        </div>
      </div>
    </div>
  );
}
