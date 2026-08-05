import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  Cpu,
  Volume2,
  Sliders,
  CheckCircle2,
  X,
  Zap,
  Download,
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
  Palette,
  RotateCcw,
  FastForward,
  Terminal,
} from 'lucide-react';
import { UserSettings, ProviderId } from '../../types';
import { PREBUILT_VOICES } from '../../lib/speech';
import { PROVIDERS } from '../../lib/providers';

interface SettingsModalProps {
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, onSaveSettings, onClose }: SettingsModalProps) {
  const [formData, setFormData] = useState<UserSettings>({
    ...settings,
    nvidiaApiKey: (settings.nvidiaApiKey || '').trim(),
    geminiApiKey: (settings.geminiApiKey || '').trim(),
    openaiApiKey: (settings.openaiApiKey || '').trim(),
    terminalAuthToken: (settings.terminalAuthToken || '').trim(),
  });

  const [activeTab, setActiveTab] = useState<'keys' | 'models' | 'voice' | 'appearance' | 'diagnostics'>('keys');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showTerminalToken, setShowTerminalToken] = useState(false);

  const [testResult, setTestResult] = useState<{
    ok: boolean;
    status: string;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Flatten models from PROVIDERS for model selector
  const allModels = PROVIDERS.flatMap((p) => p.models);
  const filteredModels = allModels.filter((m) => m.provider === formData.defaultProvider);

  const handleSave = () => {
    const cleaned: UserSettings = {
      ...formData,
      nvidiaApiKey: formData.nvidiaApiKey.trim(),
      geminiApiKey: formData.geminiApiKey.trim(),
      openaiApiKey: formData.openaiApiKey.trim(),
      terminalAuthToken: (formData.terminalAuthToken || '').trim(),
      defaultProvider: formData.defaultProvider || 'nvidia',
    };
    onSaveSettings(cleaned);
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();
    try {
      const selectedModel = formData.selectedModelOverride || (filteredModels[0]?.id || 'meta/llama-3.3-70b-instruct');
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.defaultProvider,
          nvidiaApiKey: formData.nvidiaApiKey.trim(),
          geminiApiKey: formData.geminiApiKey.trim(),
          model: selectedModel,
        }),
      });

      const data = await res.json();
      const latencyMs = data.latencyMs || Date.now() - start;

      setTestResult({
        ok: !!data.ok,
        status: data.status || (data.ok ? 'Connected' : 'Connection Failed'),
        message: data.message || (data.ok ? 'API Key verified successfully.' : 'Check API credentials.'),
        latencyMs,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        status: 'Connection Error',
        message: err.message || 'Failed to reach server test endpoint.',
        latencyMs: Date.now() - start,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const [toolDiagnosticResult, setToolDiagnosticResult] = useState<{
    pingOk: boolean;
    pingOutput: string;
    pingLatencyMs: number;
    nvidiaOk: boolean;
    nvidiaStatus: string;
    nvidiaMessage: string;
    nvidiaModel: string;
    nvidiaLatencyMs: number;
    lsOk: boolean;
    lsOutput: string;
    filesOk: boolean;
    fileCount: number;
    totalLatencyMs: number;
  } | null>(null);
  const [isTestingTools, setIsTestingTools] = useState(false);

  const handleTestSystemTools = async () => {
    setIsTestingTools(true);
    const start = Date.now();
    try {
      // 1. Test terminal 'ping' command execution (platform-aware)
      const pingStart = Date.now();
      const isWin = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('win');
      const pingCmd = isWin ? 'ping -n 1 127.0.0.1' : 'ping -c 1 127.0.0.1';
      const pingRes = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: pingCmd }),
      });
      const pingData = await pingRes.json();
      const pingLatencyMs = Date.now() - pingStart;

      // 2. Test NVIDIA API Connectivity and measure latency
      const nvidiaStart = Date.now();
      const selectedModel = formData.selectedModelOverride || (filteredModels[0]?.id || 'meta/llama-3.3-70b-instruct');
      const nvidiaRes = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'nvidia',
          nvidiaApiKey: formData.nvidiaApiKey.trim(),
          model: selectedModel,
        }),
      });
      const nvidiaData = await nvidiaRes.json();
      const nvidiaLatencyMs = nvidiaData.latencyMs || (Date.now() - nvidiaStart);

      // 3. Test terminal 'ls' command execution
      const lsRes = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'ls -la' }),
      });
      const lsData = await lsRes.json();

      // 4. Test virtual filesystem tree endpoint
      const filesRes = await fetch('/api/files/tree');
      const filesData = await filesRes.json();
      const count = Array.isArray(filesData?.tree) ? filesData.tree.length : (Array.isArray(filesData) ? filesData.length : 0);

      setToolDiagnosticResult({
        pingOk: pingRes.ok && pingData.exitCode === 0,
        pingOutput: pingData.stdout || pingData.stderr || pingData.error || 'Ping command executed.',
        pingLatencyMs,
        nvidiaOk: !!nvidiaData.ok,
        nvidiaStatus: nvidiaData.status || (nvidiaData.ok ? 'NVIDIA NIM Connected' : 'NVIDIA Connection Failed'),
        nvidiaMessage: nvidiaData.message || (nvidiaData.ok ? 'NVIDIA microservices verified' : 'NVIDIA API key check failed'),
        nvidiaModel: nvidiaData.model || selectedModel,
        nvidiaLatencyMs,
        lsOk: lsRes.ok && lsData.exitCode === 0,
        lsOutput: lsData.stdout ? lsData.stdout.split('\n').slice(0, 4).join('\n') : lsData.error || 'LS command executed.',
        filesOk: filesRes.ok,
        fileCount: count,
        totalLatencyMs: Date.now() - start,
      });
    } catch (err: any) {
      setToolDiagnosticResult({
        pingOk: false,
        pingOutput: err.message || 'Ping failed',
        pingLatencyMs: 0,
        nvidiaOk: false,
        nvidiaStatus: 'Diagnostic Error',
        nvidiaMessage: err.message || 'Failed to complete NVIDIA API check.',
        nvidiaModel: 'meta/llama-3.3-70b-instruct',
        nvidiaLatencyMs: 0,
        lsOk: false,
        lsOutput: err.message || 'LS failed',
        filesOk: false,
        fileCount: 0,
        totalLatencyMs: Date.now() - start,
      });
    } finally {
      setIsTestingTools(false);
    }
  };

  const handleExportSettings = () => {
    const safeData = {
      ...formData,
      nvidiaApiKey: formData.nvidiaApiKey ? '***' : '',
      geminiApiKey: formData.geminiApiKey ? '***' : '',
      openaiApiKey: formData.openaiApiKey ? '***' : '',
      terminalAuthToken: formData.terminalAuthToken ? '***' : '',
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'nvidia_ai_assistant_settings.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-['Inter',sans-serif]">
      <div className="w-full max-w-2xl bg-[#0A1128] border border-[#12275C] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#030712] border-b border-[#12275C] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <ShieldCheck className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h2 className="text-base font-grotesk font-extrabold text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Stark System & API Configuration</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  SECURE VAULT
                </span>
              </h2>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                Configure NVIDIA NIM, Gemini, Models, Voice & System Preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#0A1128] text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#12275C] bg-[#030712] px-6 gap-2 text-xs font-mono overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('keys')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'keys'
                ? 'border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'border-transparent text-[#6B7A99] hover:text-[#EAF1FF]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Provider Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'models'
                ? 'border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'border-transparent text-[#6B7A99] hover:text-[#EAF1FF]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Models & Routing</span>
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'border-transparent text-[#6B7A99] hover:text-[#EAF1FF]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Speech & Audio</span>
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'border-transparent text-[#6B7A99] hover:text-[#EAF1FF]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'border-transparent text-[#6B7A99] hover:text-[#EAF1FF]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs bg-[#030712] font-mono">
          {/* TAB 1: API KEYS */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              {/* NVIDIA NIM Key */}
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#EAF1FF] font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#5B9CFF]" />
                    <span>NVIDIA NIM API Key</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono font-bold border border-[#2E6FF2]/30">
                      Primary Engine
                    </span>
                  </label>
                  {formData.nvidiaApiKey && (
                    <button
                      onClick={() => setFormData({ ...formData, nvidiaApiKey: '' })}
                      className="text-[10px] text-[#FF5C4D] hover:underline"
                    >
                      Clear Key
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showNvidiaKey ? 'text' : 'password'}
                    placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.nvidiaApiKey}
                    onChange={(e) => setFormData({ ...formData, nvidiaApiKey: e.target.value })}
                    className="w-full p-2.5 pr-10 rounded-xl bg-[#030712] border border-[#12275C] text-[#EAF1FF] font-mono focus:outline-none focus:border-[#2E6FF2] placeholder-[#6B7A99]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                    className="absolute right-3 top-2.5 text-[#6B7A99] hover:text-[#EAF1FF]"
                  >
                    {showNvidiaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7A99]">
                  Powers Llama 3.3 70B, DeepSeek R1, Qwen 2.5 Coder, Llama 3.2 Vision & Nemotron microservices.
                </p>
              </div>

              {/* Gemini Key */}
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#EAF1FF] font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Google Gemini API Key</span>
                  </label>
                  {formData.geminiApiKey && (
                    <button
                      onClick={() => setFormData({ ...formData, geminiApiKey: '' })}
                      className="text-[10px] text-[#FF5C4D] hover:underline"
                    >
                      Clear Key
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    placeholder="AIzaSyXXXXXXXXXXXXXXXXXX"
                    value={formData.geminiApiKey}
                    onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
                    className="w-full p-2.5 pr-10 rounded-xl bg-[#030712] border border-[#12275C] text-[#EAF1FF] font-mono focus:outline-none focus:border-[#2E6FF2] placeholder-[#6B7A99]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-2.5 text-[#6B7A99] hover:text-[#EAF1FF]"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7A99]">
                  Optionally used for Google Gemini 3.6 Flash & 3.1 Pro backend inference.
                </p>
              </div>

              {/* OpenAI Key */}
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2 opacity-80">
                <div className="flex items-center justify-between">
                  <label className="text-[#EAF1FF] font-bold flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#6B7A99]" />
                    <span>OpenAI API Key (Optional)</span>
                  </label>
                  <span className="text-[10px] text-[#F59E0B] font-mono font-bold">Not yet connected in backend</span>
                </div>
                <div className="relative">
                  <input
                    type={showOpenaiKey ? 'text' : 'password'}
                    placeholder="sk-proj-XXXXXXXXXXXXXXXX"
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                    className="w-full p-2.5 pr-10 rounded-xl bg-[#030712] border border-[#12275C] text-[#EAF1FF] font-mono focus:outline-none focus:border-[#2E6FF2] placeholder-[#6B7A99]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-3 top-2.5 text-[#6B7A99] hover:text-[#EAF1FF]"
                  >
                    {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Terminal Auth Token */}
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#EAF1FF] font-bold flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Terminal Auth Token</span>
                  </label>
                  {formData.terminalAuthToken && (
                    <button
                      onClick={() => setFormData({ ...formData, terminalAuthToken: '' })}
                      className="text-[10px] text-[#FF5C4D] hover:underline"
                    >
                      Clear Token
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showTerminalToken ? 'text' : 'password'}
                    placeholder="Enter TERMINAL_AUTH_TOKEN"
                    value={formData.terminalAuthToken || ''}
                    onChange={(e) => setFormData({ ...formData, terminalAuthToken: e.target.value })}
                    className="w-full p-2.5 pr-10 rounded-xl bg-[#030712] border border-[#12275C] text-[#EAF1FF] font-mono focus:outline-none focus:border-[#2E6FF2] placeholder-[#6B7A99]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTerminalToken(!showTerminalToken)}
                    className="absolute right-3 top-2.5 text-[#6B7A99] hover:text-[#EAF1FF]"
                  >
                    {showTerminalToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#6B7A99]">
                  Must match TERMINAL_AUTH_TOKEN in your .env — required for Terminal, Files, and Memory tabs to work once that env var is set.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MODELS & ROUTING */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <label className="block text-[#EAF1FF] font-bold mb-1">Default AI Provider</label>
                <select
                  value={formData.defaultProvider}
                  onChange={(e) => {
                    const newProv = e.target.value as ProviderId;
                    const provInfo = PROVIDERS.find((p) => p.id === newProv);
                    const defaultMod = provInfo?.models.find((m) => m.isDefault) || provInfo?.models[0];
                    setFormData({
                      ...formData,
                      defaultProvider: newProv,
                      selectedModelOverride: defaultMod?.id,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#030712] border border-[#12275C] text-[#5B9CFF] font-mono font-bold focus:outline-none focus:border-[#2E6FF2]"
                >
                  <option value="nvidia">NVIDIA NIM (Recommended Default)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (Preview)</option>
                </select>
                <p className="text-[11px] text-[#6B7A99]">
                  Primary engine used for all prompt dispatches and chat messages.
                </p>
              </div>

              {/* Auto Router Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C]">
                <div>
                  <div className="font-bold text-[#EAF1FF] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Auto-Route Prompt Intent (Recommended)</span>
                  </div>
                  <div className="text-[11px] text-[#6B7A99] mt-0.5">
                    Dynamically dispatches coding prompts to Qwen Coder, deep reasoning to DeepSeek R1, vision to Llama 3.2 90B Vision.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoRouterEnabled}
                  onChange={(e) => setFormData({ ...formData, autoRouterEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#2E6FF2] rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Web Search Grounding Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C]">
                <div>
                  <div className="font-bold text-[#EAF1FF] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Real-Time Web Search Grounding</span>
                  </div>
                  <div className="text-[11px] text-[#6B7A99] mt-0.5">
                    Enable live Google search result grounding for time-sensitive queries (release dates, news, current events).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.webSearchEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, webSearchEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#2E6FF2] rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Model Override Select */}
              <div className={`p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2 ${formData.autoRouterEnabled ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center">
                  <label className="block text-[#EAF1FF] font-bold">Manual Model Override</label>
                  {formData.autoRouterEnabled && (
                    <span className="text-[10px] text-[#5B9CFF]">Disabled while Auto-router is ON</span>
                  )}
                </div>
                <select
                  disabled={formData.autoRouterEnabled}
                  value={formData.selectedModelOverride || ''}
                  onChange={(e) => setFormData({ ...formData, selectedModelOverride: e.target.value || undefined })}
                  className="w-full p-2.5 rounded-xl bg-[#030712] border border-[#12275C] text-[#EAF1FF] font-mono focus:outline-none focus:border-[#2E6FF2] disabled:cursor-not-allowed"
                >
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE & SPEECH */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <label className="block text-[#EAF1FF] font-bold mb-1">System Language Mode</label>
                <select
                  value={formData.language || 'en-US'}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as 'ta-IN' | 'en-US' })}
                  className="w-full p-2.5 rounded-xl bg-[#030712] border border-[#12275C] text-[#5B9CFF] font-mono focus:outline-none"
                >
                  <option value="en-US">🇺🇸 English (en-US)</option>
                  <option value="ta-IN">🇮🇳 தமிழ் (Tamil - ta-IN)</option>
                </select>
                <p className="text-[11px] text-[#6B7A99]">
                  Sets default language for AI chat responses, speech recognition (STT), and text-to-speech synthesis (TTS).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <label className="block text-[#EAF1FF] font-bold mb-1">Default Neural Synthesis Voice</label>
                <select
                  value={formData.voiceVoice}
                  onChange={(e) => setFormData({ ...formData, voiceVoice: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#030712] border border-[#12275C] text-[#5B9CFF] font-mono focus:outline-none"
                >
                  {PREBUILT_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <div className="flex justify-between font-bold text-[#EAF1FF]">
                  <span className="flex items-center gap-2">
                    <FastForward className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Global TTS Speech Rate Slider</span>
                  </span>
                  <span className="text-[#5B9CFF] font-mono text-sm px-2 py-0.5 rounded bg-[#2E6FF2]/20 border border-[#2E6FF2]/40">
                    {formData.voiceSpeed || 1.3}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={formData.voiceSpeed || 1.3}
                  onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-[#2E6FF2] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6B7A99] font-mono">
                  <span>0.5x Slow</span>
                  <span>1.0x Normal</span>
                  <span>1.3x Fast</span>
                  <span>2.0x Ultra Speed ⚡</span>
                </div>
                <p className="text-[11px] text-[#6B7A99]">
                  Adjust neural voice playback speed from 0.5x to 2.0x to synchronize speech reading rate with streaming output.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <div className="flex justify-between font-bold text-[#EAF1FF]">
                  <span>Speech Pitch Offset</span>
                  <span className="text-[#5B9CFF]">{formData.voicePitch > 0 ? `+${formData.voicePitch}` : formData.voicePitch}</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={formData.voicePitch}
                  onChange={(e) => setFormData({ ...formData, voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-[#2E6FF2] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENCES */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-2">
                <label className="block text-[#EAF1FF] font-bold mb-1">System UI Theme</label>
                <select
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-[#030712] border border-[#12275C] text-[#5B9CFF] font-mono focus:outline-none"
                >
                  <option value="dark">Stark Dark (Default)</option>
                  <option value="midnight">Midnight OLED</option>
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="light">High Contrast Light</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C]">
                <div>
                  <div className="font-bold text-[#EAF1FF]">Interface Sound Effects</div>
                  <div className="text-[11px] text-[#6B7A99]">Play subtle futuristic audio cues on message send and voice activity</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.soundEffects}
                  onChange={(e) => setFormData({ ...formData, soundEffects: e.target.checked })}
                  className="w-5 h-5 accent-[#2E6FF2] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C]">
                <div>
                  <div className="font-bold text-[#EAF1FF]">Auto Scroll Chat Stream</div>
                  <div className="text-[11px] text-[#6B7A99]">Automatically follow streaming AI output down the chat log</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoScroll}
                  onChange={(e) => setFormData({ ...formData, autoScroll: e.target.checked })}
                  className="w-5 h-5 accent-[#2E6FF2] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C]">
                <div>
                  <div className="font-bold text-[#EAF1FF]">Enable MCP Server Hub</div>
                  <div className="text-[11px] text-[#6B7A99]">Expose local Model Context Protocol tool definitions to AI assistant</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.mcpEnabled}
                  onChange={(e) => setFormData({ ...formData, mcpEnabled: e.target.checked })}
                  className="w-5 h-5 accent-[#2E6FF2] rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 5: DIAGNOSTICS & TEST CONNECTION */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0A1128]/70 border border-[#12275C] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EAF1FF] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#5B9CFF]" />
                    <span>Real-time Provider Ping Test</span>
                  </span>
                  <span className="text-[10px] text-[#6B7A99]">Target: {formData.defaultProvider.toUpperCase()}</span>
                </div>

                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full py-3 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#2E6FF2]/30 uppercase tracking-wider disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Provider Latency...' : `Test ${formData.defaultProvider.toUpperCase()} Connection`}</span>
                </button>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border font-mono text-xs space-y-1 ${
                      testResult.ok
                        ? 'bg-[#2E6FF2]/10 border-[#2E6FF2]/50 text-[#5B9CFF]'
                        : 'bg-[#FF5C4D]/10 border-[#FF5C4D]/50 text-[#FF5C4D]'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-[#5B9CFF]" /> : <AlertCircle className="w-4 h-4 text-[#FF5C4D]" />}
                      <span>{testResult.status}</span>
                    </div>
                    {testResult.message && <p className="text-[11px] text-[#EAF1FF] leading-relaxed">{testResult.message}</p>}
                    {testResult.latencyMs !== undefined && (
                      <p className="text-[10px] text-[#6B7A99]">Response Latency: {testResult.latencyMs}ms</p>
                    )}
                  </div>
                )}
              </div>

              {/* System Diagnostics Section (Terminal Tool Ping & NVIDIA API Latency Test) */}
              <div className="p-4 rounded-xl bg-[#0A1128]/80 border border-[#12275C] space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#12275C] pb-2.5">
                  <div>
                    <h3 className="font-bold text-[#EAF1FF] text-sm flex items-center gap-2 font-grotesk">
                      <Terminal className="w-4 h-4 text-[#2E6FF2]" />
                      <span>System Diagnostics & Health Verification</span>
                    </h3>
                    <p className="text-[11px] text-[#6B7A99] mt-0.5">
                      Executes terminal tool ping command and verifies NVIDIA API connectivity with latency measurement.
                    </p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono font-bold border border-[#2E6FF2]/40 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#5B9CFF]" />
                    <span>PRO DIAGNOSTICS</span>
                  </span>
                </div>

                <button
                  onClick={handleTestSystemTools}
                  disabled={isTestingTools}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2E6FF2] to-[#1A52C8] hover:from-[#5B9CFF] hover:to-[#2E6FF2] text-white font-grotesk font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#2E6FF2]/30 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  <Terminal className={`w-4 h-4 ${isTestingTools ? 'animate-spin' : ''}`} />
                  <span>{isTestingTools ? 'Executing System Diagnostics...' : 'Run System Diagnostics (Terminal Ping & NVIDIA API Latency)'}</span>
                </button>

                {toolDiagnosticResult && (
                  <div className="p-3.5 rounded-xl bg-[#030712] border border-[#12275C] font-mono text-[11px] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#12275C] pb-2 text-[10px]">
                      <span className="text-[#6B7A99]">Diagnostic Run Complete</span>
                      <span className="text-[#5B9CFF] font-bold">Total Execution: {toolDiagnosticResult.totalLatencyMs}ms</span>
                    </div>

                    {/* 1. Terminal Tool 'ping' Command Test */}
                    <div className="p-2.5 rounded-lg bg-[#0A1128] border border-[#12275C]/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-white font-bold">
                          {toolDiagnosticResult.pingOk ? (
                            <CheckCircle2 className="w-4 h-4 text-[#5B9CFF]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#FF5C4D]" />
                          )}
                          <span>Terminal 'ping' Command Test</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          toolDiagnosticResult.pingOk ? 'bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40' : 'bg-[#FF5C4D]/20 text-[#FF5C4D] border border-[#FF5C4D]/40'
                        }`}>
                          {toolDiagnosticResult.pingOk ? `PASSED (${toolDiagnosticResult.pingLatencyMs}ms)` : 'FAILED'}
                        </span>
                      </div>
                      <pre className="p-2 rounded bg-[#030712] text-[10px] text-[#A0AEC0] overflow-x-auto max-h-20 whitespace-pre-wrap border border-[#12275C]">
                        {toolDiagnosticResult.pingOutput}
                      </pre>
                    </div>

                    {/* 2. NVIDIA API Connectivity & Latency Measurement */}
                    <div className="p-2.5 rounded-lg bg-[#0A1128] border border-[#12275C]/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-white font-bold">
                          {toolDiagnosticResult.nvidiaOk ? (
                            <CheckCircle2 className="w-4 h-4 text-[#5B9CFF]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#FF5C4D]" />
                          )}
                          <span>NVIDIA API Connectivity & Latency</span>
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          toolDiagnosticResult.nvidiaOk ? 'bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40' : 'bg-[#FF5C4D]/20 text-[#FF5C4D] border border-[#FF5C4D]/40'
                        }`}>
                          {toolDiagnosticResult.nvidiaOk ? `${toolDiagnosticResult.nvidiaLatencyMs}ms` : 'ERROR'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#EAF1FF] flex justify-between items-center bg-[#030712] p-2 rounded border border-[#12275C]">
                        <div>
                          <div className="font-bold text-[#5B9CFF]">{toolDiagnosticResult.nvidiaStatus}</div>
                          <div className="text-[10px] text-[#A0AEC0] mt-0.5">{toolDiagnosticResult.nvidiaMessage}</div>
                        </div>
                        <div className="text-[10px] text-[#6B7A99] font-mono text-right pl-2 border-l border-[#12275C]">
                          Model: <span className="text-[#EAF1FF] font-bold">{toolDiagnosticResult.nvidiaModel.split('/').pop()}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Terminal Sandbox 'ls -la' & Filesystem Tree */}
                    <div className="p-2.5 rounded-lg bg-[#0A1128] border border-[#12275C]/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-white font-bold">
                          {toolDiagnosticResult.lsOk ? (
                            <CheckCircle2 className="w-4 h-4 text-[#5B9CFF]" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-[#FF5C4D]" />
                          )}
                          <span>Terminal Sandbox 'ls -la' & Filesystem</span>
                        </span>
                        <span className="text-[10px] text-[#5B9CFF]">
                          {toolDiagnosticResult.fileCount} filesystem nodes
                        </span>
                      </div>
                      <pre className="p-2 rounded bg-[#030712] text-[10px] text-[#A0AEC0] overflow-x-auto max-h-16 whitespace-pre-wrap border border-[#12275C]">
                        {toolDiagnosticResult.lsOutput}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#12275C] flex justify-between items-center">
                <button
                  onClick={handleExportSettings}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A1128] text-[#5B9CFF] hover:text-white border border-[#12275C] text-xs font-mono transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Backup Config JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#030712] border-t border-[#12275C] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0A1128] hover:bg-[#12275C] text-[#6B7A99] hover:text-[#EAF1FF] font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-lg shadow-[#2E6FF2]/30 uppercase tracking-wider"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

