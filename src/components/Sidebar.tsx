import React from 'react';
import {
  MessageSquare,
  Mic,
  FolderTree,
  Terminal,
  Database,
  Settings,
  Activity,
  Zap,
  Plus,
} from 'lucide-react';

export type NavigationTab =
  | 'chat'
  | 'voice'
  | 'telemetry'
  | 'automation'
  | 'files'
  | 'terminal'
  | 'memory'
  | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onNewChat?: () => void;
  unseenAgents?: boolean;
}

export function Sidebar({ activeTab, onSelectTab, onNewChat }: SidebarProps) {
  const items: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'chat', label: 'AI Chat Box', icon: MessageSquare },
    { id: 'telemetry', label: 'System Telemetry', icon: Activity },
    { id: 'voice', label: 'Voice Mode', icon: Mic },
    { id: 'automation', label: 'Desktop & YouTube', icon: Zap },
    { id: 'files', label: 'File Workspace', icon: FolderTree },
    { id: 'terminal', label: 'Terminal Host', icon: Terminal },
    { id: 'memory', label: 'Neural Memory', icon: Database },
  ];

  return (
    <aside className="w-[64px] h-full shrink-0 bg-[#0a0f1c] border-r border-[#182338] flex flex-col items-center py-5 gap-2 select-none z-20 overflow-y-auto no-scrollbar">
      {/* Rail Logo */}
      <div
        onClick={() => onSelectTab('chat')}
        className="w-8 h-8 rounded-full border border-[#1e3358] flex items-center justify-center font-grotesk font-semibold text-xs text-[#8fc0ff] mb-[28px] cursor-pointer hover:border-[#8fc0ff] transition-colors"
        title="F.R.I.D.A.Y. STARK OS"
      >
        F
      </div>

      {/* Quick + New Chat Button if provided */}
      {onNewChat && (
        <button
          onClick={() => {
            onNewChat();
            onSelectTab('chat');
          }}
          title="Start New Chat Session"
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[#4c8dff] hover:text-[#8fc0ff] hover:bg-[#0d1526] transition-all mb-1 group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
        </button>
      )}

      {/* Main Navigation Icons */}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            title={item.label}
            className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all ${
              isActive
                ? 'text-[#8fc0ff] bg-[#1e3358] rail-glow'
                : 'text-[#3c4a68] hover:text-[#6c7fa0] hover:bg-[#0d1526]'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Settings Button */}
      <button
        onClick={() => onSelectTab('settings')}
        title="Settings & Credentials"
        className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all ${
          activeTab === 'settings'
            ? 'text-[#8fc0ff] bg-[#1e3358] rail-glow'
            : 'text-[#3c4a68] hover:text-[#6c7fa0] hover:bg-[#0d1526]'
        }`}
      >
        <Settings className="w-4 h-4" />
      </button>
    </aside>
  );
}
