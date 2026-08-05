import React, { useState, useEffect } from 'react';
import { Search, Sparkles, MessageSquare, FileCode, Database, Globe, X } from 'lucide-react';
import { Conversation } from '../types';

interface SearchModalProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onClose: () => void;
}

export function SearchModal({ conversations, onSelectConversation, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const results = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.messages.some((m) => m.content.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-[#091224] border border-[#00F0FF]/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#00F0FF]/20 flex items-center gap-3 bg-[#060D1E]">
          <Search className="w-4 h-4 text-[#00F0FF]" />
          <input
            type="text"
            placeholder="Universal Search across chats, code, memories & web..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded text-cyan-200/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-2 text-xs">
          {results.length === 0 ? (
            <div className="py-8 text-center text-cyan-200/40 font-mono">
              No matching conversations found.
            </div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectConversation(c.id);
                  onClose();
                }}
                className="p-3 rounded-xl bg-[#0B1528] border border-[#00F0FF]/20 hover:border-[#00F0FF]/60 text-white cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#00F0FF] shrink-0" />
                  <div>
                    <div className="font-bold text-white">{c.title}</div>
                    <div className="text-[11px] text-cyan-200/60 truncate max-w-sm">
                      {c.messages[c.messages.length - 1]?.content.slice(0, 80) || 'Empty chat'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-cyan-200/40 font-mono">
                  {new Date(c.updatedAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
