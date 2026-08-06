import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Plus,
  Trash2,
  Edit3,
  Search,
  Paperclip,
  Mic,
  MicOff,
  Cpu,
  FileText,
  MessageSquare,
  PanelLeft,
  Download,
  FileJson,
  Volume2,
  VolumeX,
  Zap,
  FastForward,
  Globe,
} from 'lucide-react';
import { Conversation, UserSettings } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { autoRouteModel, PROVIDERS } from '../../lib/providers';
import { createSpeechRecognizer, playTtsAudio, stopSpeech } from '../../lib/speech';
import { ArcRing } from '../ArcRing';

interface ChatViewProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onSendMessage: (text: string, attachments?: any[], modelOverride?: string, langOverride?: string) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  isVoiceModeActive?: boolean;
  onToggleVoiceMode?: () => void;
  settings: UserSettings;
  onSaveSettings?: (newSettings: UserSettings) => void;
  onUpdateMetrics: (latency: number, tps: number) => void;
  onSpeechStateChange?: (state: 'idle' | 'listening' | 'thinking' | 'speaking', volume?: number) => void;
}

export function ChatView({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onSendMessage,
  onStopGeneration,
  isStreaming,
  isVoiceModeActive = true,
  onToggleVoiceMode,
  settings,
  onSaveSettings,
  onSpeechStateChange,
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [inputLang, setInputLang] = useState<'ta-IN' | 'en-US'>(settings.language || 'en-US');

  useEffect(() => {
    if (settings.language) {
      setInputLang(settings.language);
    }
  }, [settings.language]);

  const handleLanguageChange = (newLang: 'ta-IN' | 'en-US') => {
    setInputLang(newLang);
    if (onSaveSettings) {
      onSaveSettings({
        ...settings,
        language: newLang,
      });
    }
  };
  const [selectedModelOverride, setSelectedModelOverride] = useState<string>('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHeaderOpen, setIsHeaderOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRef = useRef<any>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Auto-route evaluation
  const routed = autoRouteModel(
    inputText,
    attachments.some((a) => a.type === 'image'),
    inputText.length,
    settings.defaultProvider,
    selectedModelOverride || settings.selectedModelOverride
  );

  const exportAsJSON = () => {
    if (!activeConv) return;
    const exportData = {
      conversationId: activeConv.id,
      title: activeConv.title,
      createdAt: new Date(activeConv.createdAt).toISOString(),
      updatedAt: new Date(activeConv.updatedAt).toISOString(),
      activeEngine: routed.model.name,
      activeProvider: routed.provider,
      messagesCount: activeConv.messages.length,
      messages: activeConv.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
        formattedTime: new Date(m.timestamp).toLocaleString(),
        modelUsed: m.modelUsed || routed.model.name,
        providerUsed: m.providerUsed || routed.provider,
        latencyMs: m.latencyMs,
        tokensPerSec: m.tokensPerSec,
        thinking: m.thinking,
        attachments: m.attachments,
      })),
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (activeConv.title || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    a.download = `friday-chat-${safeTitle}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    if (!activeConv) return;
    let md = `# F.R.I.D.A.Y. OS Conversation Log: ${activeConv.title}\n\n`;
    md += `- **Date Created:** ${new Date(activeConv.createdAt).toLocaleString()}\n`;
    md += `- **Last Updated:** ${new Date(activeConv.updatedAt).toLocaleString()}\n`;
    md += `- **Active Engine:** ${routed.model.name} (${routed.provider})\n`;
    md += `- **Total Messages:** ${activeConv.messages.length}\n\n`;
    md += `---\n\n`;

    activeConv.messages.forEach((m, idx) => {
      const roleLabel = m.role === 'user' ? '👤 USER (Boss)' : '🤖 F.R.I.D.A.Y. OS';
      const timeStr = new Date(m.timestamp).toLocaleString();
      md += `### ${idx + 1}. ${roleLabel} — *${timeStr}*\n`;
      if (m.modelUsed || m.latencyMs) {
        md += `> **Model:** \`${m.modelUsed || routed.model.name}\``;
        if (m.latencyMs) md += ` | **Latency:** \`${m.latencyMs}ms\``;
        if (m.tokensPerSec) md += ` | **Speed:** \`${m.tokensPerSec} t/s\``;
        md += `\n\n`;
      }

      if (m.thinking) {
        md += `> 🧠 **Thinking Process:**\n> ${m.thinking.replace(/\n/g, '\n> ')}\n\n`;
      }

      md += `${m.content}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (activeConv.title || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    a.download = `friday-chat-${safeTitle}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (settings.autoScroll) {
      scrollToBottom();
    }
  }, [activeConv?.messages, isStreaming]);

  const onSpeechStateChangeRef = useRef(onSpeechStateChange);
  useEffect(() => {
    onSpeechStateChangeRef.current = onSpeechStateChange;
  });

  useEffect(() => {
    if (!isVoiceModeActive) {
      stopSpeech();
      if (onSpeechStateChangeRef.current) onSpeechStateChangeRef.current('idle', 0);
    }
  }, [isVoiceModeActive]);

  // Old post-stream TTS playback block removed to fix double-voice issue.
  // Real-time streaming TTS is now handled exclusively in App.tsx handleSendMessage.
  const prevStreamingRef = useRef<boolean>(false);
  useEffect(() => {
    if (!prevStreamingRef.current && isStreaming && isVoiceModeActive) {
      if (onSpeechStateChangeRef.current) onSpeechStateChangeRef.current('thinking');
    } else if (prevStreamingRef.current && !isStreaming) {
       // Just reset arc ring state when stream finishes
       if (onSpeechStateChangeRef.current) onSpeechStateChangeRef.current('idle', 0);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, isVoiceModeActive]);

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isStreaming) return;
    const text = inputText;
    const atts = [...attachments];
    setInputText('');
    setAttachments([]);
    stopSpeech();
    onSendMessage(text, atts, selectedModelOverride || routed.model.id, inputLang);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      reader.onload = (event) => {
        const url = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: file.name,
            type: isImage ? 'image' : 'file',
            url,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const toggleMic = () => {
    if (isListening) {
      if (speechRef.current) speechRef.current.stop();
      setIsListening(false);
      if (onSpeechStateChange) onSpeechStateChange('idle');
    } else {
      stopSpeech();
      if (onSpeechStateChange) onSpeechStateChange('listening');
      speechRef.current = createSpeechRecognizer(
        (transcript, isFinal) => {
          setInputText((prev) => (isFinal ? (prev ? prev + ' ' + transcript : transcript) : transcript));
        },
        (err) => {
          console.error('Speech error:', err);
          setIsListening(false);
          if (onSpeechStateChange) onSpeechStateChange('idle');
        },
        () => {
          setIsListening(false);
          if (onSpeechStateChange) onSpeechStateChange('idle');
        },
        inputLang
      );
      if (speechRef.current) {
        speechRef.current.start();
        setIsListening(true);
      }
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-container flex-1 flex h-full overflow-hidden bg-[#030712] z-10 font-['Inter',sans-serif]">
      {/* Left Conversations Sidebar */}
      {isSidebarOpen && (
        <div className="w-64 bg-[#0A1128] border-r border-[#12275C] flex flex-col p-3 z-20 shrink-0">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/20 mb-3 uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Chat Session</span>
          </button>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#6B7A99]" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#030712] border border-[#12275C] text-xs text-[#EAF1FF] placeholder-[#6B7A99] focus:outline-none focus:border-[#2E6FF2] font-mono"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer font-mono ${
                    isActive
                      ? 'bg-[#2E6FF2]/15 text-[#5B9CFF] border border-[#2E6FF2] font-bold shadow-md shadow-[#2E6FF2]/10'
                      : 'text-[#6B7A99] hover:text-[#EAF1FF] hover:bg-[#030712]'
                  }`}
                >
                  {editingTitleId === c.id ? (
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={(e) => setEditTitleText(e.target.value)}
                      onBlur={() => {
                        onRenameConversation(c.id, editTitleText);
                        setEditingTitleId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameConversation(c.id, editTitleText);
                          setEditingTitleId(null);
                        }
                      }}
                      className="bg-[#030712] text-[#EAF1FF] px-1.5 py-0.5 rounded focus:outline-none text-xs w-36 border border-[#2E6FF2]"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate pr-2">{c.title}</span>
                  )}

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitleId(c.id);
                        setEditTitleText(c.title);
                      }}
                      className="p-1 hover:text-[#EAF1FF]"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    {conversations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="p-1 hover:text-[#FF5C4D]"
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
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden bg-[#030712]">
        {/* Model Router & Top Action Bar */}
        <div className="px-4 py-2.5 bg-[#0A1128] border-b border-[#12275C] flex flex-wrap items-center justify-between gap-2 text-xs text-[#EAF1FF] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg bg-[#030712] border border-[#12275C] text-[#6B7A99] hover:text-[#EAF1FF] hover:border-[#2E6FF2] transition-colors"
              title="Toggle Chats Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onNewConversation}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Chat</span>
            </button>

            <span className="text-[#12275C] hidden sm:inline">|</span>

            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-[#5B9CFF]" />
              <span className="text-[#6B7A99] hidden sm:inline">Engine:</span>
              <span className="font-bold text-[#5B9CFF]">{routed.model.name}</span>
              {settings.webSearchEnabled !== false && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40" title="Live Google Web Search Grounding Active">
                  <Search className="w-3 h-3 text-[#5B9CFF]" />
                  <span>Search Enabled</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsHeaderOpen(!isHeaderOpen)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#030712] border border-[#12275C] text-[#5B9CFF] hover:text-white transition-colors ml-2"
            >
              {isHeaderOpen ? 'Hide System Info ▲' : 'System Info & Key Disclosure ▾'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Input Language Selector */}
            <div className="flex items-center gap-1 bg-[#030712] px-2 py-0.5 rounded border border-[#12275C] text-[11px] font-mono">
              <span className="text-[#6B7A99]">STT Mic:</span>
              <select
                value={inputLang}
                onChange={(e) => handleLanguageChange(e.target.value as 'ta-IN' | 'en-US')}
                className="bg-transparent text-[#5B9CFF] font-bold focus:outline-none cursor-pointer"
              >
                <option value="ta-IN" className="bg-[#0A1128] text-white">🇮🇳 தமிழ் (ta-IN)</option>
                <option value="en-US" className="bg-[#0A1128] text-white">🇺🇸 English (en-US)</option>
              </select>
            </div>

            {/* Voice TTS Speed Selector */}
            <div className="flex items-center gap-1 bg-[#030712] px-2 py-0.5 rounded border border-[#12275C] text-[11px] font-mono">
              <FastForward className="w-3 h-3 text-[#5B9CFF]" />
              <span className="text-[#6B7A99]">Speed:</span>
              <select
                value={settings.voiceSpeed || 1.25}
                onChange={(e) => onSaveSettings && onSaveSettings({ ...settings, voiceSpeed: parseFloat(e.target.value) })}
                className="bg-transparent text-[#5B9CFF] font-bold focus:outline-none cursor-pointer"
                title="Voice TTS Playback Speed"
              >
                <option value="0.75" className="bg-[#0A1128] text-white">0.75x Slow</option>
                <option value="1.0" className="bg-[#0A1128] text-white">1.0x Normal</option>
                <option value="1.25" className="bg-[#0A1128] text-white">1.25x Fast</option>
                <option value="1.5" className="bg-[#0A1128] text-white">1.5x Speed</option>
                <option value="1.75" className="bg-[#0A1128] text-white">1.75x Fast+</option>
                <option value="2.0" className="bg-[#0A1128] text-white">2.0x Ultra ⚡</option>
              </select>
            </div>

            {/* Manual Model Select */}
            <select
              value={selectedModelOverride}
              onChange={(e) => setSelectedModelOverride(e.target.value)}
              className="bg-[#030712] border border-[#12275C] text-[#5B9CFF] text-[11px] rounded-lg px-2 py-1 focus:outline-none font-mono"
            >
              <option value="">Auto Route Engine</option>
              {PROVIDERS.flatMap((p) =>
                p.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {p.name}: {m.name}
                  </option>
                ))
              )}
            </select>

            {/* Export Conversation Log Button */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#030712] border border-[#12275C] hover:border-[#2E6FF2] text-[#5B9CFF] hover:text-white font-mono text-[11px] transition-colors"
                title="Export Conversation Log with Timestamps and Model Metadata"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Log</span>
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-[#0A1128] border border-[#12275C] rounded-xl shadow-xl z-50 p-1.5 font-mono text-xs space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#6B7A99] uppercase tracking-wider border-b border-[#12275C]/50">
                    Export Format
                  </div>
                  <button
                    onClick={() => {
                      exportAsJSON();
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#12275C] text-[#EAF1FF] text-left transition-colors group"
                  >
                    <FileJson className="w-3.5 h-3.5 text-[#5B9CFF] group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-bold">JSON Format</div>
                      <div className="text-[10px] text-[#6B7A99]">Includes raw timestamps & metadata</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      exportAsMarkdown();
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#12275C] text-[#EAF1FF] text-left transition-colors group"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#5B9CFF] group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="font-bold">Markdown Text (.md)</div>
                      <div className="text-[10px] text-[#6B7A99]">Formatted chat log with headers</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Collapsible Session Info & Active Model Disclosure Card */}
        {isHeaderOpen && (
          <div className="mx-4 mt-3 p-4 bg-[#0A1128]/90 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-[#12275C]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-grotesk font-extrabold text-sm text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                    <span>Session Info & Active Model Disclosure</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30">
                      ONLINE
                    </span>
                  </h2>
                  <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                    Real-time pipeline overview: active model engine, provider routing, and neural voice matrix
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Mono Data Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
              <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
                <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Key Route</div>
                <div className="text-xs font-bold text-[#5B9CFF] truncate mt-0.5">GEMINI_API_KEY (Server)</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
                <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Model</div>
                <div className="text-xs font-bold text-[#EAF1FF] truncate mt-0.5">{routed.model.name}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
                <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Provider Engine</div>
                <div className="text-xs font-bold text-[#5B9CFF] truncate mt-0.5">
                  {selectedModelOverride ? 'Manual Override' : 'Auto Router'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
                <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">TTS Voice Output</div>
                <div className="text-xs font-bold text-[#5B9CFF] truncate mt-0.5">
                  {inputLang === 'ta-IN' ? 'Tamil Neural2 (ta-IN)' : 'English Neural (en-US)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Log Message Thread / Empty Core State */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 bg-[#05070d] flex flex-col justify-between">
          {(!activeConv?.messages || activeConv.messages.length === 0) ? (
            /* Standby Core Arc Visualizer matching Redesign Template */
            <div className="flex-1 flex flex-col items-center justify-center py-8 select-none">
              <ArcRing mode={isListening ? 'listening' : isStreaming ? 'thinking' : 'idle'} size={150} />

              <div className="font-grotesk font-medium text-[17px] text-[#e9f0fb] mt-2 mb-1 text-center">
                Ready when you are.
              </div>
              <div className="text-[12.5px] text-[#6c7fa0] mb-6 text-center">
                Speak or type a command.
              </div>

              {/* Redesign Quick Action Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mb-4">
                <button
                  onClick={() => onSendMessage('Run system diagnostic scan and report status', [], routed.model.id)}
                  className="px-3.5 py-1.5 rounded-[20px] bg-[#0a0f1c] border border-[#182338] hover:border-[#4c8dff] text-[#6c7fa0] hover:text-[#e9f0fb] font-mono text-[11px] transition-colors flex items-center gap-1.5"
                >
                  <span>⌁ Diagnostics</span>
                </button>
                <button
                  onClick={() => onSendMessage('Search latest AI news and breakthroughs', [], routed.model.id)}
                  className="px-3.5 py-1.5 rounded-[20px] bg-[#0a0f1c] border border-[#182338] hover:border-[#4c8dff] text-[#6c7fa0] hover:text-[#e9f0fb] font-mono text-[11px] transition-colors flex items-center gap-1.5"
                >
                  <span>⌕ Search</span>
                </button>
                <button
                  onClick={onToggleVoiceMode}
                  className="px-3.5 py-1.5 rounded-[20px] bg-[#0a0f1c] border border-[#182338] hover:border-[#4c8dff] text-[#6c7fa0] hover:text-[#e9f0fb] font-mono text-[11px] transition-colors flex items-center gap-1.5"
                >
                  <span>♪ Voice mode</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 max-w-4xl mx-auto w-full">
              {activeConv.messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  lang={inputLang}
                  voiceSpeed={settings.voiceSpeed}
                  onRegenerate={() => {
                    if (activeConv.messages.length > 1) {
                      const lastUserMsg = [...activeConv.messages].reverse().find((m) => m.role === 'user');
                      if (lastUserMsg) onSendMessage(lastUserMsg.content, lastUserMsg.attachments, routed.model.id);
                    }
                  }}
                  onEditPrompt={(newPrompt) => {
                    onSendMessage(newPrompt, [], routed.model.id);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Floating Input Bar (max 640px) matching Redesign Template */}
          <div className="w-full pt-2 pb-4 px-2 shrink-0">
            {/* Attachment preview pills */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 max-w-[640px] mx-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0a0f1c] border border-[#182338] text-xs text-[#e9f0fb]"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#8fc0ff]" />
                    <span className="truncate max-w-[140px] font-mono">{att.name}</span>
                    <button
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                      className="text-[#6c7fa0] hover:text-[#FF5C4D] ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mx-auto max-w-[640px] w-full bg-[#0a0f1c] border border-[#182338] focus-within:border-[#4c8dff] rounded-[14px] p-2.5 px-4 flex items-center gap-3 transition-colors shadow-xl">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                multiple
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[#6c7fa0] hover:text-[#e9f0fb] transition-colors p-1"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (!inputText.includes('http')) {
                    setInputText((prev) => (prev ? `${prev} Analyze webpage: https://` : 'Analyze webpage: https://'));
                  }
                }}
                className="text-[#6c7fa0] hover:text-[#8fc0ff] transition-colors p-1 hidden sm:block"
                title="Analyze Web Page / Document URL"
              >
                <Globe className="w-4 h-4" />
              </button>

              <button
                onClick={toggleMic}
                className={`transition-colors p-1 ${
                  isListening ? 'text-[#FF5C4D] animate-pulse' : 'text-[#6c7fa0] hover:text-[#8fc0ff]'
                }`}
                title={isListening ? 'Stop Listening' : 'Voice Input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Command FRIDAY..."
                className="bg-transparent border-0 outline-none text-[#e9f0fb] text-[13.5px] placeholder-[#3c4a68] flex-1 font-sans resize-none py-1 min-h-[28px] max-h-32 no-scrollbar"
                rows={1}
              />

              {isStreaming ? (
                <button
                  onClick={onStopGeneration}
                  className="w-[32px] h-[32px] rounded-[9px] bg-[#FF5C4D] hover:bg-red-600 text-white flex items-center justify-center font-bold font-grotesk transition-colors shrink-0"
                  title="Stop Generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() && attachments.length === 0}
                  className="w-[32px] h-[32px] rounded-[9px] bg-[#4c8dff] hover:bg-[#8fc0ff] disabled:opacity-30 text-[#05070d] flex items-center justify-center font-bold font-grotesk transition-colors shrink-0"
                  title="Send Command"
                >
                  ↑
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
