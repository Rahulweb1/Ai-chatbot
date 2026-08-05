import React, { useState } from 'react';
import {
  Puzzle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  Cpu,
  Layers,
  Power
} from 'lucide-react';
import { PluginExtension } from '../../types';

export function PluginsView() {
  const [plugins, setPlugins] = useState<PluginExtension[]>([
    {
      id: 'plugin_spotify',
      name: 'Stark Media & Spotify Controller',
      description: 'Voice control playback, playlists, and volume via F.R.I.D.A.Y.',
      version: '1.2.0',
      author: 'Stark Industries',
      enabled: true,
      category: 'media',
      permissions: ['audio_playback', 'media_control'],
    },
    {
      id: 'plugin_weather',
      name: 'Global Satellite Weather HUD',
      description: 'Real-time satellite atmospheric data & radar widgets.',
      version: '2.0.4',
      author: 'JARVIS Labs',
      enabled: true,
      category: 'system',
      permissions: ['location', 'network_fetch'],
    },
    {
      id: 'plugin_github',
      name: 'GitHub CI/CD Action Monitor',
      description: 'Auto-detect failing builds, pull requests, and commit releases.',
      version: '1.0.8',
      author: 'Stark Tech',
      enabled: true,
      category: 'developer',
      permissions: ['github_oauth', 'webhook_listen'],
    },
    {
      id: 'plugin_workspace',
      name: 'Google Workspace Sync',
      description: 'Gmail, Calendar, Drive & Docs integration with OAuth.',
      version: '3.1.2',
      author: 'Google Cloud',
      enabled: false,
      category: 'workspace',
      permissions: ['google_oauth', 'calendar_read_write'],
    },
  ]);

  const [selfImprovementLog, setSelfImprovementLog] = useState<string[]>([
    '[Auto-Optimizer] Analyzed 142 chat interactions.',
    '[Prompt Engine] Latency reduced by 14% via system prompt compression.',
    '[Self-Heal] Zero runtime exceptions encountered in current session.',
  ]);

  const [isOptimizing, setIsOptimizing] = useState(false);

  const togglePlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setSelfImprovementLog((prev) => [
        `[${new Date().toLocaleTimeString()}] Optimized vector memory indexing for sub-10ms lookup.`,
        ...prev,
      ]);
      setIsOptimizing(false);
    }, 1000);
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <Puzzle className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Self-Improvement Framework & Plugins Matrix</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  PLUGINS ONLINE
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Autonomous prompt optimizer, diagnostic log healing, & sandboxed extension manager
              </p>
            </div>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30 uppercase tracking-wider disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Run Self-Optimization</span>
          </button>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Enabled Plugins</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">
              {plugins.filter((p) => p.enabled).length} / {plugins.length} Extensions
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Self-Heal Engine</div>
            <div className="text-xs font-bold text-[#EAF1FF] mt-0.5">{isOptimizing ? 'Optimizing...' : 'Active (Zero Errors)'}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Sandbox Isolator</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">Secure V8 Isolates</div>
          </div>
        </div>
      </div>

      {/* Grid: Plugin Extension List */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono font-bold text-[#5B9CFF] uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2E6FF2]" />
          <span>Active Sandboxed Extensions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="p-5 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] shadow-lg space-y-3 flex flex-col justify-between hover:border-[#2E6FF2] transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40">
                    <Puzzle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-grotesk font-extrabold text-sm text-[#EAF1FF] flex items-center gap-2">
                      <span>{plugin.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#030712] text-[#5B9CFF] border border-[#12275C]">
                        v{plugin.version}
                      </span>
                    </h3>
                    <p className="text-xs text-[#6B7A99] font-mono mt-0.5">{plugin.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => togglePlugin(plugin.id)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    plugin.enabled
                      ? 'bg-[#2E6FF2]/20 border-[#2E6FF2] text-[#5B9CFF]'
                      : 'bg-[#030712] border-[#12275C] text-[#6B7A99]'
                  }`}
                  title={plugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Permissions list */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#12275C]">
                {plugin.permissions.map((perm, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#030712] text-[#5B9CFF] border border-[#12275C]"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Improvement Engine Log */}
      <div className="p-5 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] shadow-lg space-y-3">
        <div className="flex items-center gap-2 border-b border-[#12275C] pb-2">
          <Cpu className="w-4 h-4 text-[#5B9CFF]" />
          <h2 className="text-sm font-grotesk font-extrabold text-[#EAF1FF]">Autonomous Self-Improvement Stream</h2>
        </div>

        <div className="p-4 rounded-xl bg-[#030712] border border-[#12275C] font-mono text-xs text-[#EAF1FF] space-y-2">
          {selfImprovementLog.map((log, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5B9CFF] shrink-0" />
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
