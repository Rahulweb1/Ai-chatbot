import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Clipboard,
  CheckSquare,
  Plus,
  Trash2,
  Bell,
  FileText,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { ProductivityItem } from '../../types';

export function ProductivityView() {
  const [items, setItems] = useState<ProductivityItem[]>([
    {
      id: 'prod_1',
      title: 'Review Arc Reactor CAD Schematic',
      type: 'task',
      content: 'Confirm voltage tolerance thresholds on central coil.',
      timestamp: Date.now() - 7200000,
      completed: false,
    },
    {
      id: 'prod_2',
      title: 'NVIDIA NIM API Key Rotation',
      type: 'reminder',
      content: 'Ensure primary key credentials updated in settings.',
      timestamp: Date.now() - 3600000,
      completed: true,
    },
    {
      id: 'prod_3',
      title: 'Quick Scratchpad Note',
      type: 'note',
      content: 'GLM-5.2 beast engine achieves sub-10ms response loops on local container.',
      timestamp: Date.now() - 1800000,
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<ProductivityItem['type']>('task');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ProductivityItem = {
      id: 'prod_' + Date.now(),
      title: newTitle,
      type: newType,
      content: newContent,
      timestamp: Date.now(),
      completed: false,
    };

    setItems((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewContent('');
  };

  const toggleComplete = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i))
    );
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <Calendar className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Productivity, Calendar & Reminders Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  SCHEDULER ACTIVE
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Quick notes, task management board, clipboard history, & scheduled assistant reminders
              </p>
            </div>
          </div>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Entries</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">{items.length} Workspace Items</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Completed Tasks</div>
            <div className="text-xs font-bold text-[#EAF1FF] mt-0.5">
              {items.filter((i) => i.completed).length} Tasks Done
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Sync Protocol</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">Local Reactive State</div>
          </div>
        </div>
      </div>

      {/* Add New Item Form */}
      <div className="p-5 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] shadow-lg space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#5B9CFF] uppercase tracking-wider">
          Create Reminder, Note, or Task
        </h2>

        <form onSubmit={handleAddItem} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as ProductivityItem['type'])}
              className="bg-[#030712] border border-[#12275C] text-[#5B9CFF] text-xs rounded-xl px-3 py-2.5 focus:outline-none font-mono"
            >
              <option value="task">Task Item</option>
              <option value="reminder">Scheduled Reminder</option>
              <option value="note">Scratchpad Note</option>
            </select>

            <input
              type="text"
              placeholder="Title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="md:col-span-2 bg-[#030712] border border-[#12275C] text-[#EAF1FF] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#2E6FF2] font-mono placeholder-[#6B7A99]"
            />
          </div>

          <textarea
            placeholder="Additional details or description..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full h-20 p-3 bg-[#030712] border border-[#12275C] text-[#EAF1FF] text-xs rounded-xl focus:outline-none focus:border-[#2E6FF2] resize-none font-mono placeholder-[#6B7A99]"
          />

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30 flex items-center gap-2 uppercase tracking-wider disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Save Productivity Entry</span>
          </button>
        </form>
      </div>

      {/* Items List Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono font-bold text-[#5B9CFF] uppercase tracking-wider">
          Active Workspace Entries ({items.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all shadow-lg space-y-3 flex flex-col justify-between ${
                item.completed
                  ? 'bg-[#030712]/60 border-[#12275C] opacity-60'
                  : 'bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] hover:border-[#2E6FF2]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 uppercase font-bold">
                    {item.type}
                  </span>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1 rounded text-[#6B7A99] hover:text-[#FF5C4D]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3
                  className={`font-grotesk font-extrabold text-sm text-[#EAF1FF] ${
                    item.completed ? 'line-through text-[#6B7A99]' : ''
                  }`}
                >
                  {item.title}
                </h3>
                {item.content && (
                  <p className="text-xs text-[#6B7A99] leading-relaxed font-sans">
                    {item.content}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#12275C] pt-2.5">
                <span className="text-[10px] text-[#6B7A99] font-mono">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>

                {item.type === 'task' && (
                  <button
                    onClick={() => toggleComplete(item.id)}
                    className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                      item.completed ? 'text-[#5B9CFF]' : 'text-[#5B9CFF] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{item.completed ? 'Done' : 'Mark Done'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
