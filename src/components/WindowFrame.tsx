import React from 'react';
import { Sparkles, Settings, Volume2, VolumeX, Plus, FastForward, ChevronDown, Bot } from 'lucide-react';
import { ProviderId } from '../types';
import { ArcRingMode } from './ArcRing';

interface WindowFrameProps {
  activeProvider: ProviderId;
  activeModelName: string;
  latencyMs?: number;
  tokensPerSec?: number;
  isVoiceModeActive?: boolean;
  onToggleVoiceMode?: () => void;
  voiceSpeed?: number;
  onVoiceSpeedChange?: (speed: number) => void;
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
  voiceSpeed = 1.25,
  onVoiceSpeedChange,
  onOpenSettings,
  onOpenSearch,
  onNewChat,
}: WindowFrameProps) {
  return (
    <header className="h-[52px] shrink-0 w-full bg-[#212121] border-b border-[#2f2f2f] flex items-center justify-between px-4 select-none text-xs text-[#ececec] z-50 overflow-x-auto no-scrollbar gap-3">
      {/* Topbar Left (ChatGPT Model Pill & Search) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2f2f2f] hover:bg-[#383838] text-white font-medium text-xs transition-colors border border-[#383838]"
        >
          <Bot className="w-4 h-4 text-white" />
          <span className="font-semibold">{activeModelName || 'ChatGPT 4o'}</span>
          <ChevronDown className="w-3 h-3 text-[#b4b4b4]" />
        </button>

        {/* Quick Search Shortcut */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#333333] text-[11px] text-[#b4b4b4] hover:text-white hover:border-[#444444] transition-colors"
        >
          <Sparkles className="w-3 h-3 text-white" />
          <span>Search</span>
          <kbd className="px-1 py-0.5 text-[9px] rounded bg-[#2f2f2f] text-[#b4b4b4]">⌘K</kbd>
        </button>
      </div>

      {/* Topbar Center (Voice Assistant Controls) */}
      <div className="flex items-center gap-2">
        {onToggleVoiceMode && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleVoiceMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium transition-all ${
                isVoiceModeActive
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-[#2f2f2f] border-[#383838] text-[#b4b4b4] hover:text-white'
              }`}
              title="Toggle automatic voice speech replies"
            >
              {isVoiceModeActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Voice {isVoiceModeActive ? 'On' : 'Off'}</span>
            </button>

            {onVoiceSpeedChange && (
              <div className="flex items-center gap-1 bg-[#2f2f2f] border border-[#383838] px-2 py-0.5 rounded-full text-[11px]">
                <FastForward className="w-3 h-3 text-[#b4b4b4]" />
                <select
                  value={voiceSpeed || 1.25}
                  onChange={(e) => onVoiceSpeedChange(parseFloat(e.target.value))}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                  title="Voice Speed"
                >
                  <option value="0.75" className="bg-[#212121] text-white">0.75x</option>
                  <option value="1.0" className="bg-[#212121] text-white">1.0x</option>
                  <option value="1.25" className="bg-[#212121] text-white">1.25x</option>
                  <option value="1.5" className="bg-[#212121] text-white">1.5x</option>
                  <option value="2.0" className="bg-[#212121] text-white">2.0x</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topbar Right (Settings & Quick Action) */}
      <div className="flex items-center gap-3 text-[11px] text-[#8e8e8e] shrink-0">
        {latencyMs > 0 && (
          <span className="hidden md:inline font-mono">
            {latencyMs}ms
          </span>
        )}

        <button
          onClick={onNewChat}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2f2f2f] hover:bg-[#383838] text-white transition-colors border border-[#383838]"
          title="New Chat"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New chat</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-[#b4b4b4] hover:text-white hover:bg-[#2f2f2f] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

