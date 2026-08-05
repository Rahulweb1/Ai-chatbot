import React, { useState } from 'react';
import { Check, Copy, Code, Play, Terminal, ExternalLink, RefreshCw } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';

interface CodeBlockProps {
  key?: React.Key;
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{ stdout?: string; stderr?: string; error?: string } | null>(null);

  if (language === 'mermaid') {
    return <MermaidDiagram chart={value} />;
  }

  const isTerminalCommand =
    ['bash', 'sh', 'zsh', 'terminal', 'cmd', 'powershell', 'shell'].includes(language.toLowerCase()) ||
    value.trim().startsWith('npm ') ||
    value.trim().startsWith('git ') ||
    value.trim().startsWith('node ') ||
    value.trim().startsWith('python') ||
    value.trim().startsWith('ls ') ||
    value.trim().startsWith('cat ');

  const isUrl = value.trim().startsWith('http://') || value.trim().startsWith('https://');
  const isYouTube = isUrl && value.includes('youtube.com');

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCommand = async () => {
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: value.trim() }),
      });
      const data = await res.json();
      setExecResult(data);
    } catch (err: any) {
      setExecResult({ error: err.message || 'Execution failed' });
    } finally {
      setExecuting(false);
    }
  };

  const handleOpenUrl = () => {
    const target = value.trim();
    window.open(target, '_blank');
  };

  if (isYouTube) {
    return (
      <div className="my-3 rounded-2xl bg-[#0F0F0F] border border-red-500/30 overflow-hidden shadow-2xl font-mono text-xs">
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-950/30 border-b border-red-500/20 text-red-400">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-red-500" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">
              YouTube Action Launcher
            </span>
          </div>

          <button
            onClick={handleOpenUrl}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/30"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open YouTube Now</span>
          </button>
        </div>

        <div className="p-4 bg-black/60 flex flex-col gap-2">
          <div className="text-white/80 font-mono text-xs break-all bg-black/40 p-2.5 rounded-xl border border-white/10">
            {value.trim()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 rounded-2xl bg-[#0F0F0F] border border-white/10 overflow-hidden shadow-2xl font-mono text-xs">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] border-b border-white/10 text-white/70">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-[#76B900]" />
          <span className="text-white font-bold uppercase text-[11px] tracking-wider">
            {language || 'code'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isUrl && (
            <button
              onClick={handleOpenUrl}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#76B900] hover:bg-[#88d600] text-black font-bold text-[11px] transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Link</span>
            </button>
          )}

          {isTerminalCommand && (
            <button
              onClick={handleRunCommand}
              disabled={executing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#76B900] hover:bg-[#88d600] text-black font-bold text-[11px] transition-all shadow-md shadow-[#76B900]/20 disabled:opacity-50"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>Run in Terminal</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors text-[11px] border border-white/10"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#76B900]" />
                <span className="text-[#76B900]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-white/90 leading-relaxed font-mono bg-black/40">
        <code>{value}</code>
      </pre>

      {/* Terminal Execution Result Drawer */}
      {execResult && (
        <div className="p-3 bg-[#0A0A0A] border-t border-white/10 space-y-1 font-mono text-[11px]">
          <div className="flex items-center justify-between text-[#76B900] font-bold pb-1 border-b border-white/5">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              <span>Terminal Output Execution</span>
            </span>
            <button onClick={() => setExecResult(null)} className="text-white/40 hover:text-white">
              ✕
            </button>
          </div>
          {execResult.stdout && (
            <pre className="text-white/90 whitespace-pre-wrap p-2 bg-black rounded-lg border border-white/5 max-h-48 overflow-y-auto">
              {execResult.stdout}
            </pre>
          )}
          {execResult.stderr && (
            <pre className="text-rose-400 whitespace-pre-wrap p-2 bg-black rounded-lg border border-rose-500/20 max-h-48 overflow-y-auto">
              {execResult.stderr}
            </pre>
          )}
          {execResult.error && (
            <div className="text-rose-400 font-bold p-1">{execResult.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
