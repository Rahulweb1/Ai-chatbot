import React, { useState } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  Play,
  Trash2,
  Square,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { TerminalTab } from '../../types';

export function TerminalView() {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: 'tab-1',
      title: 'Bash 1',
      shell: 'bash',
      cwd: '.',
      history: [
        {
          id: 'h1',
          command: 'node -v && npm -v',
          output: 'v22.14.0\n10.9.0',
          timestamp: Date.now() - 60000,
          exitCode: 0,
        },
        {
          id: 'h2',
          command: 'tsc --noEmit',
          output: '✨ Type check passed: 0 errors found.',
          timestamp: Date.now() - 30000,
          exitCode: 0,
        },
      ],
      isRunning: false,
    },
    {
      id: 'tab-2',
      title: 'PowerShell 2',
      shell: 'powershell',
      cwd: '.',
      history: [],
      isRunning: false,
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [commandInput, setCommandInput] = useState<string>('');
  const [isExecRunning, setIsExecRunning] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleRunCommand = async () => {
    if (!commandInput.trim() || isExecRunning) return;
    const cmd = commandInput;
    setCommandInput('');
    setIsExecRunning(true);

    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, cwd: activeTab.cwd }),
      });
      const data = await res.json();

      const newHistoryItem = {
        id: 'h_' + Date.now(),
        command: cmd,
        output: data.stdout || data.stderr || (data.error ? `Error: ${data.error}` : 'Process completed.'),
        timestamp: Date.now(),
        exitCode: data.exitCode || 0,
      };

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? { ...t, history: [...t.history, newHistoryItem], isRunning: false }
            : t
        )
      );
    } catch (err: any) {
      const errorHistoryItem = {
        id: 'h_' + Date.now(),
        command: cmd,
        output: `Execution error: ${err.message}`,
        timestamp: Date.now(),
        exitCode: 1,
      };

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? { ...t, history: [...t.history, errorHistoryItem], isRunning: false }
            : t
        )
      );
    } finally {
      setIsExecRunning(false);
    }
  };

  const handleAddTab = () => {
    const newId = 'tab-' + (tabs.length + 1);
    setTabs([
      ...tabs,
      {
        id: newId,
        title: `Bash ${tabs.length + 1}`,
        shell: 'bash',
        cwd: '.',
        history: [],
        isRunning: false,
      },
    ]);
    setActiveTabId(newId);
  };

  const handleClearHistory = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, history: [] } : t))
    );
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 flex flex-col overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <TerminalIcon className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Stark Tech Container Shell Terminal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  BASH HOST ACTIVE
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Real-time bash execution, multi-tab terminal instance, logs, & system diagnostic tools
              </p>
            </div>
          </div>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Shell Tabs</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">{tabs.length} Open Session(s)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">History Count</div>
            <div className="text-xs font-bold text-[#EAF1FF] mt-0.5">{activeTab.history.length} Commands Logged</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Runtime Architecture</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">Node.js Linux Container</div>
          </div>
        </div>
      </div>

      {/* Header Tabs Bar */}
      <div className="flex items-center justify-between bg-[#0A1128]/60 backdrop-blur-md p-2 rounded-xl border border-[#12275C] font-mono">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                tab.id === activeTabId
                  ? 'bg-[#2E6FF2]/20 text-[#5B9CFF] font-bold border border-[#2E6FF2]/40 shadow'
                  : 'text-[#6B7A99] hover:text-[#EAF1FF]'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5 text-[#5B9CFF]" />
              <span>{tab.title}</span>
            </button>
          ))}

          <button
            onClick={handleAddTab}
            className="p-1.5 rounded-lg hover:bg-[#2E6FF2]/20 text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
            title="New Terminal Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleClearHistory}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#030712] hover:bg-[#12275C] text-[#FF5C4D] text-xs font-mono transition-colors border border-[#12275C]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Terminal Output Window */}
      <div className="flex-1 min-h-[300px] p-4 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] overflow-y-auto space-y-4 font-mono text-xs">
        <div className="text-[#6B7A99] text-[11px] border-b border-[#12275C] pb-2">
          F.R.I.D.A.Y. Stark Tech Desktop Terminal Matrix [Cloud Container x86_64]
        </div>

        {activeTab.history.map((item) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#EAF1FF]">
              <span className="text-[#5B9CFF] font-bold">$</span>
              <span className="font-bold">{item.command}</span>
            </div>
            <pre className="p-3 rounded-xl bg-[#030712] border border-[#12275C] text-[#5B9CFF] leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
              {item.output}
            </pre>
          </div>
        ))}

        {isExecRunning && (
          <div className="flex items-center gap-2 text-[#5B9CFF] animate-pulse text-xs">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Executing command on backend...</span>
          </div>
        )}
      </div>

      {/* Command Input Bar */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] focus-within:border-[#2E6FF2] font-mono">
        <span className="text-[#5B9CFF] font-bold pl-2">$</span>
        <input
          type="text"
          placeholder="Enter shell command (e.g. npm test, ls -la, git status, python3 -v)"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
          className="flex-1 bg-transparent text-[#EAF1FF] text-xs focus:outline-none placeholder-[#6B7A99]"
        />
        <button
          onClick={handleRunCommand}
          disabled={isExecRunning || !commandInput.trim()}
          className="px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30 disabled:opacity-40 uppercase"
        >
          Run
        </button>
      </div>
    </div>
  );
}
