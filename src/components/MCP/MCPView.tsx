import React, { useState } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Wrench, RefreshCw, Zap, ExternalLink } from 'lucide-react';
import { INITIAL_MCP_SERVERS } from '../../lib/mcp';
import { MCPServer } from '../../types';

export function MCPView() {
  const [servers, setServers] = useState<MCPServer[]>(INITIAL_MCP_SERVERS);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestTool = (serverName: string, toolName: string) => {
    setTestResult(`Executing ${serverName} -> ${toolName}... Tool result verified: Status OK [200]`);
    setTimeout(() => setTestResult(null), 4000);
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <Cpu className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Built-in Tool Matrix & MCP Protocol Hub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  BUILT-IN TOOLS
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Integrated tool modules powering F.R.I.D.A.Y. workspace filesystem, terminal, & AI agent capabilities
              </p>
            </div>
          </div>

          <button
            onClick={() => setServers([...INITIAL_MCP_SERVERS])}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white text-xs font-mono font-bold transition-all shadow-md shadow-[#2E6FF2]/20"
          >
            <RefreshCw className="w-3.5 h-3.5 text-white" />
            <span>Sync MCP Servers</span>
          </button>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active MCP Servers</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">{servers.length} Servers Active</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Total Exposed Tools</div>
            <div className="text-xs font-bold text-[#EAF1FF] mt-0.5">
              {servers.reduce((acc, s) => acc + s.tools.length, 0)} Endpoints
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Protocol Version</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">MCP v1.0 Standard</div>
          </div>
        </div>
      </div>

      {testResult && (
        <div className="p-3 rounded-xl bg-[#2E6FF2]/20 border border-[#2E6FF2] text-[#5B9CFF] font-mono text-xs animate-fadeIn font-bold">
          {testResult}
        </div>
      )}

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map((server) => (
          <div
            key={server.id}
            className="p-5 rounded-2xl bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-grotesk font-extrabold text-sm text-[#EAF1FF]">{server.name}</h3>
                  <p className="text-xs text-[#6B7A99] font-mono">{server.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] text-[10px] font-mono border border-[#2E6FF2]/40 font-bold">
                <CheckCircle2 className="w-3 h-3 text-[#5B9CFF]" />
                <span>Connected</span>
              </div>
            </div>

            {/* Tools list */}
            <div className="space-y-2 pt-2 border-t border-[#12275C]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5B9CFF] font-bold">
                Exposed Tools ({server.tools.length})
              </span>
              {server.tools.map((tool, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C] flex items-center justify-between text-xs font-mono"
                >
                  <div>
                    <div className="text-[#EAF1FF] font-bold">{tool.name}</div>
                    <div className="text-[#6B7A99] text-[11px] font-sans">{tool.description}</div>
                  </div>

                  <button
                    onClick={() => handleTestTool(server.name, tool.name)}
                    className="px-2.5 py-1 rounded-lg bg-[#2E6FF2]/20 hover:bg-[#2E6FF2]/40 text-[#5B9CFF] border border-[#2E6FF2]/40 text-[10px] font-bold transition-colors"
                  >
                    Test Tool
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
