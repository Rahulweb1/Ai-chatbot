import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Search, Brain, Sparkles, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { MemoryFact } from '../../types';
import { getStoredFacts, addFact, deleteFact } from '../../lib/memory';

export function MemoryView() {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryFact['category']>('preference');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFacts = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const stored = await getStoredFacts();
      setFacts(stored);
    } catch (err: any) {
      setErrorMessage(err.message || "Couldn't reach memory backend — check TERMINAL_AUTH_TOKEN in Settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, []);

  const handleAddFact = async () => {
    if (!newContent.trim()) return;
    setErrorMessage(null);
    try {
      await addFact(newCategory, newContent, 'User Defined');
      await fetchFacts();
      setNewContent('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save fact');
    }
  };

  const handleDeleteFact = async (id: string) => {
    setErrorMessage(null);
    try {
      await deleteFact(id);
      await fetchFacts();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete fact');
    }
  };

  const filteredFacts = facts.filter((f) =>
    f.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <Database className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>F.R.I.D.A.Y. Memory & Neural Directives</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  PERSISTENT VECTOR STORE
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Searchable project memory, Stark Tech directives, and persistent assistant context
              </p>
            </div>
          </div>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Stored Directives</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">
              {isLoading ? 'Loading...' : `${facts.length} Memory Items`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Vector Index Status</div>
            <div className="text-xs font-bold text-[#EAF1FF] mt-0.5">Optimized (RAG ready)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Storage Engine</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">Persistent Disk (.friday_memory.json)</div>
          </div>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Add New Memory Fact Card */}
      <div className="p-5 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] shadow-lg space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B9CFF] flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#2E6FF2]" />
          <span>Add New Memory Directive</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MemoryFact['category'])}
            className="bg-[#030712] border border-[#12275C] text-[#5B9CFF] text-xs rounded-xl px-3 py-2 focus:outline-none font-mono"
          >
            <option value="preference">User Preference</option>
            <option value="project">Project Constraint</option>
            <option value="instruction">Architect Directive</option>
            <option value="fact">Context Fact</option>
          </select>

          <input
            type="text"
            placeholder="e.g. Always respond in F.R.I.D.A.Y. tone addressing user as Boss"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="flex-1 bg-[#030712] border border-[#12275C] text-[#EAF1FF] text-xs rounded-xl px-3 py-2 focus:outline-none font-mono placeholder-[#6B7A99]"
          />

          <button
            onClick={handleAddFact}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Save Fact</span>
          </button>
        </div>
      </div>

      {/* Search & List */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#6B7A99]" />
          <input
            type="text"
            placeholder="Search long-term memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0A1128] border border-[#12275C] text-xs text-[#EAF1FF] placeholder-[#6B7A99] focus:outline-none focus:border-[#2E6FF2] font-mono"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center font-mono text-xs text-[#6B7A99] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#5B9CFF]" />
            <span>Retrieving persistent memory store...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFacts.map((fact) => (
              <div
                key={fact.id}
                className="p-4 rounded-xl bg-[#030712] border border-[#12275C] hover:border-[#2E6FF2] flex items-start justify-between gap-3 shadow-md transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 font-bold">
                    {fact.category}
                  </span>
                  <p className="text-xs text-[#EAF1FF] leading-relaxed font-sans pt-1">
                    {fact.content}
                  </p>
                  <div className="text-[10px] text-[#6B7A99] font-mono">
                    Source: {fact.source} • {new Date(fact.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteFact(fact.id)}
                  className="p-1.5 rounded hover:bg-[#0A1128] text-[#6B7A99] hover:text-[#FF5C4D] transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
