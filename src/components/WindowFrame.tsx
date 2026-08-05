import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Sparkles, ShieldCheck, Volume2, VolumeX, MessageSquare, Plus } from 'lucide-react';
import { ProviderId } from '../types';
import { ArcRing, ArcRingMode } from './ArcRing';

interface WindowFrameProps {
  activeProvider: ProviderId;
  activeModelName: string;
  latencyMs?: number;
  tokensPerSec?: number;
  isVoiceModeActive?: boolean;
  onToggleVoiceMode?: () => void;
  arcRingMode?: ArcRingMode;
  audioLevel?: number;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onNewChat?: () => void;
  onOpenChat?: () => void;
}

export function WindowFrame({
  activeProvider,
  activeModelName,
  latencyMs = 12,
  tokensPerSec = 84.5,
  isVoiceModeActive = true,
  onToggleVoiceMode,
  arcRingMode = 'idle',
  audioLevel = 0,
  onOpenSettings,
  onOpenSearch,
  onNewChat,
  onOpenChat,
}: WindowFrameProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(148);

  useEffect(() => {
    const interval = setInterval(() => {
      setMemoryUsage(140 + Math.floor(Math.random() * 20));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[52px] shrink-0 w-full bg-[#05070d] border-b border-[#182338] flex items-center justify-between px-6 select-none text-xs text-[#e9f0fb] z-50 overflow-x-auto no-scrollbar gap-3">
      {/* Topbar Left */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="w-[6px] h-[6px] rounded-full bg-[#8fc0ff] dot-glow shrink-0" />
        <span className="font-grotesk font-semibold text-[14px] tracking-[.04em] text-[#e9f0fb]">FRIDAY</span>
        
        <div className="font-mono text-[10.5px] text-[#6c7fa0] border border-[#182338] px-2.5 py-0.5 rounded-[20px] bg-[#0a0f1c] flex items-center gap-1.5">
          <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeModelName || 'Llama 3.3 70B'}</span>
        </div>

        {/* Quick Search trigger button */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-[20px] border border-[#182338] text-[10.5px] font-mono text-[#6c7fa0] hover:text-[#8fc0ff] hover:border-[#1e3358] transition-colors"
        >
          <Sparkles className="w-3 h-3 text-[#8fc0ff]" />
          <span>Search</span>
          <kbd className="px-1 py-0.1 text-[9px] rounded bg-[#0d1526] text-[#6c7fa0]">⌘K</kbd>
        </button>
      </div>

      {/* Topbar Center (Optional Voice Toggle) */}
      <div className="flex items-center gap-2">
        {onToggleVoiceMode && (
          <button
            onClick={onToggleVoiceMode}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-[20px] border text-[10.5px] font-mono transition-all ${
              isVoiceModeActive
                ? 'bg-[#1e3358] border-[#4c8dff] text-[#8fc0ff]'
                : 'bg-[#0a0f1c] border-[#182338] text-[#6c7fa0] hover:text-[#e9f0fb]'
            }`}
            title="Toggle automatic TTS voice replies"
          >
            {isVoiceModeActive ? <Volume2 className="w-3 h-3 text-[#8fc0ff]" /> : <VolumeX className="w-3 h-3 text-[#6c7fa0]" />}
            <span className="hidden sm:inline">Voice: {isVoiceModeActive ? 'On' : 'Off'}</span>
          </button>
        )}
      </div>

      {/* Topbar Right */}
      <div className="flex items-center gap-4 font-mono text-[10.5px] text-[#3c4a68] shrink-0">
        <span className="hidden sm:inline">
          <b className="text-[#6c7fa0] font-medium">{latencyMs}ms</b> latency
        </span>
        <span className="hidden sm:inline">
          <b className="text-[#6c7fa0] font-medium">{tokensPerSec}</b> t/s
        </span>
        <span>
          <b className="text-[#6c7fa0] font-medium">{memoryUsage}</b> mb
        </span>

        <button
          onClick={onOpenSettings}
          className="p-1 rounded-lg text-[#6c7fa0] hover:text-[#8fc0ff] transition-colors ml-1"
          title="Configure API Keys & Settings"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
