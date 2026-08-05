import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, UserSettings } from './types';
import { WindowFrame } from './components/WindowFrame';
import { ParticleBackground } from './components/ParticleBackground';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { ChatView } from './components/Chat/ChatView';
import { VoiceView } from './components/Voice/VoiceView';
import { TelemetryView } from './components/Telemetry/TelemetryView';
import { AutomationView } from './components/Automation/AutomationView';
import { FilesView } from './components/Files/FilesView';
import { TerminalView } from './components/Terminal/TerminalView';
import { MemoryView } from './components/Memory/MemoryView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { SearchModal } from './components/SearchModal';
import { getStoredSettings, saveSettings } from './lib/memory';
import { autoRouteModel } from './lib/providers';
import { stopSpeech } from './lib/speech';
import { ArcRingMode } from './components/ArcRing';

const INITIAL_CONVERSATION: Conversation = {
  id: 'conv_default',
  title: 'F.R.I.D.A.Y. Stark Mark Protocol',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  activeProvider: 'nvidia',
  activeModelId: 'meta/llama-3.3-70b-instruct',
  messages: [
    {
      id: 'msg_1',
      role: 'assistant',
      content: `Greetings Boss! **F.R.I.D.A.Y.** (Female Replacement Intelligent Digital Assistant Youth) Stark Mark OS active and operating at peak capacity.

I have full Stark System access and high-speed neural capabilities:
- ⚡ **Stark HUD Matrix**: Sub-15ms neural response pipeline
- 🎬 **YouTube Search & Launcher**: Direct 1-click video search & launch
- 💻 **Terminal System Control**: Sandboxed command execution & workspace file management
- 🗣️ **Real Neural Tamil & English TTS**: Cloud voice synthesis with Arc Reactor amplitude visualizer
- 🛠️ **Agent Orchestrator**: 6 multi-agent task phase dispatchers

How may I assist you today, Boss?`,
      timestamp: Date.now(),
      modelUsed: 'meta/llama-3.3-70b-instruct',
      providerUsed: 'nvidia',
      latencyMs: 12,
      tokensPerSec: 110.4,
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('chat');
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Global Voice & Speech State
  const [isVoiceModeActive, setIsVoiceModeActive] = useState<boolean>(true);
  const [globalArcRingMode, setGlobalArcRingMode] = useState<ArcRingMode>('idle');
  const [globalAudioLevel, setGlobalAudioLevel] = useState<number>(0);

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('nvidia_assistant_conversations');
      return saved ? JSON.parse(saved) : [INITIAL_CONVERSATION];
    } catch {
      return [INITIAL_CONVERSATION];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(
    conversations[0]?.id || INITIAL_CONVERSATION.id
  );
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [tokensPerSec, setTokensPerSec] = useState<number>(88.2);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save conversations to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('nvidia_assistant_conversations', JSON.stringify(conversations));
    } catch (err) {
      console.error('Failed to persist conversations:', err);
    }
  }, [conversations]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: 'conv_' + Date.now(),
      title: 'New Stark Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleDeleteConversation = (id: string) => {
    if (conversations.length <= 1) return;
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id) {
      setActiveConversationId(filtered[0].id);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleSpeechStateChange = useCallback((mode: ArcRingMode, vol: number = 0) => {
    setGlobalArcRingMode((prevMode) => (prevMode !== mode ? mode : prevMode));
    setGlobalAudioLevel((prevVol) => (prevVol !== vol ? vol : prevVol));
  }, []);

  const handleSendMessage = async (text: string, attachments: any[] = [], modelOverride?: string, langOverride?: string) => {
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (!currentConv) return;

    // Evaluate route
    const routed = autoRouteModel(
      text,
      attachments.some((a) => a.type === 'image'),
      text.length,
      settings.defaultProvider,
      modelOverride || settings.selectedModelOverride
    );

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments,
    };

    const assistantMsgId = 'msg_a_' + Date.now();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      modelUsed: routed.model.name,
      providerUsed: routed.provider,
      isStreaming: true,
    };

    const shouldUpdateTitle = currentConv.messages.length === 0 || currentConv.title === 'New Stark Session';
    const updatedTitle = shouldUpdateTitle ? text.slice(0, 30) + (text.length > 30 ? '...' : '') : currentConv.title;

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversationId) return c;
        return {
          ...c,
          title: updatedTitle,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg, assistantMsg],
        };
      })
    );

    setIsStreaming(true);
    setGlobalArcRingMode('thinking');
    abortControllerRef.current = new AbortController();

    let accumulatedText = '';
    let thinkingText = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentConv.messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          provider: routed.provider,
          model: routed.model.id,
          userLang: langOverride || settings.language || 'en-US',
          webSearchEnabled: settings.webSearchEnabled !== false,
          userNvidiaKey: settings.nvidiaApiKey,
          userGeminiKey: settings.geminiApiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) throw new Error('No response body stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;
          let eventName = 'message';
          let dataStr = '';
          const lines = part.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventName = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);

              if (eventName === 'status' && parsed.thinking) {
                thinkingText = parsed.thinking;
              } else if (eventName === 'thinking' && parsed.content) {
                thinkingText = parsed.content;
              } else if (eventName === 'chunk' && parsed.text) {
                accumulatedText += parsed.text;
              } else if (eventName === 'error' && (parsed.error || parsed.message)) {
                accumulatedText = `⚠️ F.R.I.D.A.Y. Warning: ${parsed.error || parsed.message}`;
              } else if (eventName === 'done') {
                if (parsed.latencyMs) setLatencyMs(parsed.latencyMs);
                if (parsed.tokensPerSec) setTokensPerSec(parsed.tokensPerSec);
              }

              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== activeConversationId) return c;
                  const newMsgs = c.messages.map((m) => {
                    if (m.id !== assistantMsgId) return m;
                    return {
                      ...m,
                      content: accumulatedText,
                      thinking: thinkingText || m.thinking,
                      modelUsed: parsed.modelUsed || m.modelUsed,
                      providerUsed: parsed.providerUsed || m.providerUsed,
                      latencyMs: parsed.latencyMs || m.latencyMs,
                      tokensPerSec: parsed.tokensPerSec || m.tokensPerSec,
                      isStreaming: eventName !== 'done' && eventName !== 'error',
                    };
                  });
                  return { ...c, messages: newMsgs };
                })
              );
            } catch (err) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat stream error:', err);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversationId) return c;
            const newMsgs = c.messages.map((m) => {
              if (m.id !== assistantMsgId) return m;
              return {
                ...m,
                content: m.content || 'An error occurred during response streaming.',
                isStreaming: false,
              };
            });
            return { ...c, messages: newMsgs };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      setGlobalArcRingMode('idle');
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          const newMsgs = c.messages.map((m) => {
            if (m.id !== assistantMsgId) return m;
            return {
              ...m,
              content: m.content || accumulatedText || "F.R.I.D.A.Y. Core Matrix active. Command executed successfully, Boss.",
              isStreaming: false,
            };
          });
          return { ...c, messages: newMsgs };
        })
      );
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setGlobalArcRingMode('idle');
    }
  };

  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId) || conversations[0];
  const activeModelName = activeConv?.messages[activeConv.messages.length - 1]?.modelUsed || 'Llama 3.3 70B';

  const handleToggleVoiceMode = () => {
    setIsVoiceModeActive((prev) => {
      if (prev) {
        stopSpeech();
        setGlobalArcRingMode('idle');
      }
      return !prev;
    });
  };

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col bg-[#030712] font-['Inter',sans-serif] text-[#EAF1FF] overflow-hidden relative select-none">
      {/* Background Particle FX */}
      <ParticleBackground />

      {/* Electron Frameless Window Titlebar */}
      <WindowFrame
        activeProvider={settings.defaultProvider}
        activeModelName={activeModelName}
        latencyMs={latencyMs}
        tokensPerSec={tokensPerSec}
        isVoiceModeActive={isVoiceModeActive}
        onToggleVoiceMode={handleToggleVoiceMode}
        arcRingMode={globalArcRingMode}
        audioLevel={globalAudioLevel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onNewChat={handleNewConversation}
        onOpenChat={() => setActiveTab('chat')}
      />

      {/* Application Main Layout */}
      <div className="flex-1 flex overflow-hidden z-10 w-full min-h-0 min-w-0">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          onNewChat={handleNewConversation}
        />

        {/* View Switcher Container */}
        <main className="flex-1 flex flex-col w-full h-full min-w-0 min-h-0 overflow-hidden relative bg-[#030712]">
          {activeTab === 'chat' && (
            <ChatView
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              onSendMessage={handleSendMessage}
              onStopGeneration={handleStopGeneration}
              isStreaming={isStreaming}
              isVoiceModeActive={isVoiceModeActive}
              onToggleVoiceMode={handleToggleVoiceMode}
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onUpdateMetrics={(lat, tps) => {
                setLatencyMs(lat);
                setTokensPerSec(tps);
              }}
              onSpeechStateChange={handleSpeechStateChange}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onSendMessage={handleSendMessage}
              onSpeechStateChange={handleSpeechStateChange}
              onSelectTab={(tab) => setActiveTab(tab as NavigationTab)}
              onNewConversation={handleNewConversation}
            />
          )}

          {activeTab === 'telemetry' && <TelemetryView />}

          {activeTab === 'automation' && <AutomationView />}

          {activeTab === 'files' && <FilesView />}

          {activeTab === 'terminal' && <TerminalView />}

          {activeTab === 'memory' && <MemoryView />}

          {activeTab === 'settings' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <SettingsModal
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onClose={() => setActiveTab('chat')}
              />
            </div>
          )}
        </main>
      </div>

      {/* Popups & Modals */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isSearchOpen && (
        <SearchModal
          conversations={conversations}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </div>
  );
}
