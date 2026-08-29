import React from 'react';

export type ArcRingMode = 'idle' | 'thinking' | 'speaking' | 'listening';

interface ArcRingProps {
  mode?: ArcRingMode;
  audioLevel?: number; // 0.0 to 1.0 amplitude
  size?: number; // default size
  className?: string;
}

export function ArcRing({ mode = 'idle', audioLevel = 0, size = 120, className = '' }: ArcRingProps) {
  const scaleFactor = mode === 'speaking' || mode === 'listening' ? 1 + Math.min(0.35, audioLevel * 0.4) : 1;

  return (
    <div className={`relative flex flex-col items-center justify-center shrink-0 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center transition-transform duration-150 ease-out"
        style={{
          width: size,
          height: size,
          transform: `scale(${scaleFactor})`,
        }}
      >
        {/* Glowing Ambient Outer Halo */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            mode === 'listening'
              ? 'bg-white/20 blur-xl scale-110 animate-pulse'
              : mode === 'thinking'
              ? 'bg-white/15 blur-lg animate-spin-slow'
              : mode === 'speaking'
              ? 'bg-white/25 blur-xl'
              : 'bg-white/5 blur-md'
          }`}
        />

        {/* Dynamic Concentric Rings */}
        <svg viewBox="0 0 120 120" className="w-full h-full relative z-10">
          {/* Subtle Outer Border */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
          />

          {/* Thinking / Active animated pulse ring */}
          {mode === 'thinking' && (
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="24 16"
              className="animate-spin-slow"
              style={{ transformOrigin: '60px 60px' }}
            />
          )}

          {/* Inner Listening / Speaking Wave Rings */}
          {(mode === 'speaking' || mode === 'listening') && (
            <circle
              cx="60"
              cy="60"
              r={36 + audioLevel * 14}
              fill="none"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="1.5"
              className="transition-all duration-75"
            />
          )}

          {/* Core Central Solid / Gradient Orb */}
          <circle
            cx="60"
            cy="60"
            r={size > 60 ? (mode === 'speaking' ? 24 + audioLevel * 8 : mode === 'listening' ? 22 : 18) : (size / 3.5)}
            fill={mode === 'idle' ? 'rgba(255, 255, 255, 0.75)' : '#ffffff'}
            className={`transition-all duration-100 ${
              mode === 'listening' ? 'animate-orb-pulse' : ''
            }`}
          />
        </svg>
      </div>
    </div>
  );
}

