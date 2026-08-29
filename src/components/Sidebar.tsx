import React, { useState } from 'react';
import {
  Settings,
  Plus,
  Bot,
  Trash2,
  Edit2,
  Search,
} from 'lucide-react';
import { Conversation } from '../types';

export type NavigationTab = 'chat' | 'settings';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-[260px] h-full shrink-0 bg-[#171717] border-r border-[#2f2f2f] flex flex-col justify-between select-none z-20 overflow-hidden text-xs text-[#ececec]">
      {/* Top Section */}
      <div className="p-3 flex flex-col gap-3 min-h-0 flex-1">
        {/* Brand & New Chat */}
        <div className="flex items-center justify-between gap-2">
          <div
            onClick={onNewChat}
            className="flex items-center gap-2 cursor-pointer group"
            title="ChatGPT"
          >
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">ChatGPT</span>
          </div>

          <button
            onClick={onNewChat}
            className="p-1.5 rounded-lg bg-[#212121] hover:bg-[#2f2f2f] text-white border border-[#2f2f2f] transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#737373]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-[#212121] border border-[#2f2f2f] text-[#ececec] rounded-lg pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:border-[#444444] placeholder-[#737373]"
          />
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1 no-scrollbar">
          <div className="text-[11px] font-medium text-[#737373] px-2 py-1">Recent chats</div>

          {filtered.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#212121] text-white font-medium shadow-sm'
                    : 'text-[#b4b4b4] hover:text-white hover:bg-[#212121]'
                }`}
              >
                {editingId === c.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => {
                      if (editTitle.trim()) onRenameConversation(c.id, editTitle.trim());
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editTitle.trim()) onRenameConversation(c.id, editTitle.trim());
                        setEditingId(null);
                      }
                    }}
                    className="bg-[#171717] text-white px-1.5 py-0.5 rounded focus:outline-none text-xs w-36 border border-[#555555]"
                    autoFocus
                  />
                ) : (
                  <span className="truncate flex-1 pr-2">{c.title || 'New Chat'}</span>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(c.id);
                      setEditTitle(c.title);
                    }}
                    className="p-1 hover:text-white text-[#8e8e8e]"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="p-1 hover:text-red-400 text-[#8e8e8e]"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className="p-2 border-t border-[#2f2f2f] bg-[#171717]">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#212121] transition-colors text-left"
          title="Settings & Profile"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#333333] text-white flex items-center justify-center font-bold text-xs shrink-0">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-xs text-white">Rahul</span>
              <span className="text-[10px] text-[#737373]">Free Plan</span>
            </div>
          </div>
          <Settings className="w-4 h-4 text-[#8e8e8e] hover:text-white transition-colors" />
        </button>
      </div>
    </aside>
  );
}
