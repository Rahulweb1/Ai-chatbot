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
  FastForward,
  Globe,
  Bot,
  Sparkles,
  ArrowUp,
} from 'lucide-react';
import { Conversation, UserSettings } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { autoRouteModel, PROVIDERS } from '../../lib/providers';
import { createSpeechRecognizer, stopSpeech } from '../../lib/speech';

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
      messages: activeConv.messages,
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (activeConv.title || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    a.download = `chatgpt-session-${safeTitle}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsMarkdown = () => {
    if (!activeConv) return;
    let md = `# Conversation: ${activeConv.title}\n\n`;
    md += `- **Date Created:** ${new Date(activeConv.createdAt).toLocaleString()}\n`;
    md += `- **Model:** ${routed.model.name}\n\n---\n\n`;

    activeConv.messages.forEach((m, idx) => {
      const roleLabel = m.role === 'user' ? '👤 User' : '🤖 Assistant';
      md += `### ${idx + 1}. ${roleLabel}\n`;
      md += `${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (activeConv.title || 'chat').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    a.download = `chatgpt-session-${safeTitle}-${Date.now()}.md`;
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

  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const url = event.target?.result as string;
            setAttachments((prev) => [
              ...prev,
              {
                id: 'att_paste_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: file.name || `Pasted Image ${new Date().toLocaleTimeString()}`,
                type: 'image',
                url,
                size: file.size,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }

    if (hasImage) {
      e.preventDefault();
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      reader.onload = (event) => {
        const url = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: 'att_drop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
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

  return (
    <div className="chat-container flex-1 flex h-full overflow-hidden bg-[#212121] z-10 font-['Inter',sans-serif]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden bg-[#212121]">
        {/* Top Minimal Toolbar */}
        <div className="px-4 py-2.5 border-b border-[#2f2f2f] flex items-center justify-between gap-2 text-xs text-[#ececec] shrink-0 bg-[#212121]">
          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            <select
              value={selectedModelOverride}
              onChange={(e) => setSelectedModelOverride(e.target.value)}
              className="bg-[#2f2f2f] border border-[#383838] text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none font-medium cursor-pointer"
            >
              <option value="">Auto Route: {routed.model.name}</option>
              {PROVIDERS.flatMap((p) =>
                p.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({p.name})
                  </option>
                ))
              )}
            </select>

            {settings.webSearchEnabled !== false && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#2f2f2f] text-[#b4b4b4] border border-[#3a3a3a]">
                <Globe className="w-3 h-3 text-white" />
                <span>Web Grounding Active</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Input Speech Language */}
            <div className="flex items-center gap-1 bg-[#2f2f2f] px-2 py-1 rounded-lg border border-[#383838] text-[11px]">
              <span className="text-[#8e8e8e]">Language:</span>
              <select
                value={inputLang}
                onChange={(e) => handleLanguageChange(e.target.value as 'ta-IN' | 'en-US')}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="en-US" className="bg-[#212121] text-white">English (en-US)</option>
                <option value="ta-IN" className="bg-[#212121] text-white">தமிழ் (ta-IN)</option>
              </select>
            </div>

            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] text-white text-xs transition-colors"
                title="Export Conversation"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {isExportOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-[#171717] border border-[#383838] rounded-xl shadow-xl z-50 p-1 text-xs space-y-1">
                  <button
                    onClick={() => {
                      exportAsMarkdown();
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#2f2f2f] text-left transition-colors text-[#ececec]"
                  >
                    <FileText className="w-3.5 h-3.5 text-white" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportAsJSON();
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#2f2f2f] text-left transition-colors text-[#ececec]"
                  >
                    <FileJson className="w-3.5 h-3.5 text-white" />
                    <span>JSON File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Thread Container */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 flex flex-col justify-between">
          {(!activeConv?.messages || activeConv.messages.length === 0) ? (
            /* ChatGPT Style Hero Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center py-12 select-none max-w-2xl mx-auto w-full text-center">
              <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg mb-6">
                <Bot className="w-7 h-7 text-black" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-8 tracking-tight">
                What can I help with today?
              </h1>

              {/* 4 Clean ChatGPT Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                <button
                  onClick={() => onSendMessage('What is the release date of Avengers: Doomsday?')}
                  className="p-3.5 rounded-2xl bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] hover:border-[#555555] transition-all text-xs text-[#ececec] group shadow-sm flex flex-col justify-between"
                >
                  <span className="font-semibold text-white mb-1">Release Date</span>
                  <span className="text-[#b4b4b4] group-hover:text-white transition-colors">"What is the release date of Avengers: Doomsday?"</span>
                </button>

                <button
                  onClick={() => onSendMessage('Hi, what can I do Rahul?')}
                  className="p-3.5 rounded-2xl bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] hover:border-[#555555] transition-all text-xs text-[#ececec] group shadow-sm flex flex-col justify-between"
                >
                  <span className="font-semibold text-white mb-1">Personal Assistant</span>
                  <span className="text-[#b4b4b4] group-hover:text-white transition-colors">"Hi, what can I do Rahul?"</span>
                </button>

                <button
                  onClick={() => onSendMessage('Write a clean React TypeScript component with Tailwind CSS')}
                  className="p-3.5 rounded-2xl bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] hover:border-[#555555] transition-all text-xs text-[#ececec] group shadow-sm flex flex-col justify-between"
                >
                  <span className="font-semibold text-white mb-1">Code Assistant</span>
                  <span className="text-[#b4b4b4] group-hover:text-white transition-colors">"Write a clean React TypeScript component"</span>
                </button>

                <button
                  onClick={() => onSendMessage('Search and summarize latest AI & technology breakthroughs')}
                  className="p-3.5 rounded-2xl bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] hover:border-[#555555] transition-all text-xs text-[#ececec] group shadow-sm flex flex-col justify-between"
                >
                  <span className="font-semibold text-white mb-1">Search & Research</span>
                  <span className="text-[#b4b4b4] group-hover:text-white transition-colors">"Search and summarize latest AI news"</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 max-w-3xl mx-auto w-full">
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

          {/* Floating ChatGPT Input Bar */}
          <div className="w-full pt-3 pb-2 px-2 shrink-0">
            {/* Attachment preview pills */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 max-w-[760px] mx-auto">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#2f2f2f] border border-[#383838] text-xs text-white shadow-sm"
                  >
                    {att.type === 'image' ? (
                      <img src={att.url} alt="thumbnail" className="w-6 h-6 rounded object-cover border border-[#555555]" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-white" />
                    )}
                    <span className="truncate max-w-[140px] text-xs">{att.name}</span>
                    <button
                      onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                      className="text-[#8e8e8e] hover:text-white hover:bg-[#383838] rounded p-0.5 ml-1 transition-colors"
                      title="Remove attachment"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mx-auto max-w-[760px] w-full bg-[#2f2f2f] border border-[#383838] focus-within:border-[#555555] rounded-3xl p-2 px-4 flex items-center gap-3 transition-colors shadow-lg">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.py,.csv"
                multiple
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[#b4b4b4] hover:text-white transition-colors p-1.5 rounded-full hover:bg-[#383838]"
                title="Attach file or photo"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (!inputText.includes('http')) {
                    setInputText((prev) => (prev ? `${prev} https://` : 'https://'));
                  }
                }}
                className="text-[#b4b4b4] hover:text-white transition-colors p-1.5 rounded-full hover:bg-[#383838]"
                title="Web Search & URL Analyzer"
              >
                <Globe className="w-4 h-4" />
              </button>

              <button
                onClick={toggleMic}
                className={`transition-colors p-1.5 rounded-full ${
                  isListening
                    ? 'text-white bg-red-600 animate-pulse'
                    : 'text-[#b4b4b4] hover:text-white hover:bg-[#383838]'
                }`}
                title={isListening ? 'Stop microphone' : 'Voice input (Speech to Text)'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                onPaste={handlePaste}
                placeholder="Message ChatGPT or paste (Ctrl+V) images..."
                className="bg-transparent border-0 outline-none text-white text-sm placeholder-[#737373] flex-1 font-sans resize-none py-1.5 min-h-[28px] max-h-36 no-scrollbar"
                rows={1}
              />

              {isStreaming ? (
                <button
                  onClick={onStopGeneration}
                  className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold transition-all shrink-0 hover:bg-gray-200"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() && attachments.length === 0}
                  className="w-8 h-8 rounded-full bg-white disabled:bg-[#444444] disabled:text-[#888888] text-black flex items-center justify-center font-bold transition-all shrink-0 hover:bg-gray-100 disabled:opacity-40"
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            <div className="text-center text-[11px] text-[#737373] mt-2">
              ChatGPT can make mistakes. Check important info.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

