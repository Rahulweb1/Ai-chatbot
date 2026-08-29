import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, ChatMessage, UserSettings } from './types';
import { WindowFrame } from './components/WindowFrame';
import { ParticleBackground } from './components/ParticleBackground';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/Chat/ChatView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { SearchModal } from './components/SearchModal';
import { getStoredSettings, saveSettings } from './lib/memory';
import { autoRouteModel } from './lib/providers';
import { stopSpeech, cleanTextForTTS } from './lib/speech';
import { ArcRingMode } from './components/ArcRing';
import {
  clientPerformWebSearch,
  streamFromNvidiaNim,
  generateClientChatGPTResponse,
} from './lib/clientAi';

const INITIAL_CONVERSATION: Conversation = {
  id: 'conv_default',
  title: 'Welcome to ChatGPT',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  activeProvider: 'openai',
  activeModelId: 'gpt-4o',
  messages: [
    {
      id: 'msg_1',
      role: 'assistant',
      content: `Hello! I'm ChatGPT, your AI assistant. How can I help you today?

Feel free to ask questions, explore ideas, write code, or try voice mode!`,
      timestamp: Date.now(),
      modelUsed: 'ChatGPT 4o',
      providerUsed: 'openai',
      latencyMs: 12,
      tokensPerSec: 110.4,
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Global Voice & Speech State
  const [isVoiceModeActive, setIsVoiceModeActive] = useState<boolean>(true);
  const [globalArcRingMode, setGlobalArcRingMode] = useState<ArcRingMode>('idle');
  const [globalAudioLevel, setGlobalAudioLevel] = useState<number>(0);

  // Ref mirrors isVoiceModeActive so TTS closures always read the LIVE value
  const isVoiceModeActiveRef = useRef<boolean>(true);
  // Global TTS queue ref so voice toggle can clear it instantly
  const ttsQueueRef = useRef<string[]>([]);
  const ttsSpeakingRef = useRef<boolean>(false);

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

    // ─── Streaming sentence-level TTS ─────────────────────────────────────────
    // Speak each sentence as soon as it finishes streaming, no waiting for full message
    // Uses module-level refs so voice toggle works instantly mid-stream
    let ttsSentenceBuffer = '';
    ttsQueueRef.current = [];
    ttsSpeakingRef.current = false;
    const SENTENCE_END = /[.!?।:;\n]{1,2}\s/;

    // Pick the best available female voice (strictly female only)
    const pickFemaleVoice = (targetLang: string): SpeechSynthesisVoice | null => {
      if (!('speechSynthesis' in window)) return null;
      const voices = window.speechSynthesis.getVoices();
      if (targetLang === 'ta-IN') {
        return (
          voices.find(
            (v) =>
              v.lang.includes('ta') &&
              (v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('pallavi') ||
                v.name.toLowerCase().includes('ananya'))
          ) ||
          voices.find((v) => v.lang.includes('ta')) ||
          null
        );
      }
      const preferredNames = [
        'Microsoft Zira', 'Google UK English Female', 'Google US English Female',
        'Samantha', 'Victoria', 'Karen', 'Moira', 'Veena',
        'Microsoft Susan', 'Microsoft Hazel', 'Microsoft Linda',
      ];
      for (const name of preferredNames) {
        const v = voices.find((v) => v.name.includes(name));
        if (v) return v;
      }
      // Fallback: any female-labeled en-US/en-GB voice
      return (
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('zira') ||
              v.name.toLowerCase().includes('susan') ||
              v.name.toLowerCase().includes('hazel'))
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        null
      );
    };

    const speakNextInQueue = () => {
      if (ttsSpeakingRef.current || ttsQueueRef.current.length === 0 || !isVoiceModeActiveRef.current) return;
      const sentence = ttsQueueRef.current.shift()!;
      const clean = sentence.replace(/[\*\_~#`]/g, '').replace(/https?:\/\/\S+/g, '').trim();
      if (!clean || clean.length < 4) { speakNextInQueue(); return; }
      ttsSpeakingRef.current = true;
      setGlobalArcRingMode('speaking');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(clean);
        const activeLang = langOverride || settings.language || 'en-US';
        utt.lang = activeLang;
        utt.rate = Math.min(2.0, Math.max(0.5, settings.voiceSpeed || 1.15));
        utt.pitch = 1.15;   // higher pitch for soft female tone
        utt.volume = 1.0;
        const femaleVoice = pickFemaleVoice(activeLang);
        if (femaleVoice) utt.voice = femaleVoice;
        utt.onend = () => {
          ttsSpeakingRef.current = false;
          if (isVoiceModeActiveRef.current) speakNextInQueue();
          else setGlobalArcRingMode('idle');
        };
        utt.onerror = () => {
          ttsSpeakingRef.current = false;
          if (isVoiceModeActiveRef.current) speakNextInQueue();
        };
        window.speechSynthesis.speak(utt);
      } else {
        ttsSpeakingRef.current = false;
      }
    };

    const flushTtsBuffer = (force = false) => {
      if (!isVoiceModeActiveRef.current) return;
      const match = ttsSentenceBuffer.search(SENTENCE_END);
      if (match !== -1 || force || ttsSentenceBuffer.length > 40) {
        const end = force ? ttsSentenceBuffer.length : (match !== -1 ? match + 2 : ttsSentenceBuffer.length);
        const sentence = ttsSentenceBuffer.slice(0, end).trim();
        ttsSentenceBuffer = ttsSentenceBuffer.slice(end);
        if (sentence.length > 3) {
          ttsQueueRef.current.push(sentence);
          speakNextInQueue();
        }
        if (!force && ttsSentenceBuffer.length > 0) flushTtsBuffer();
      }
    };
    // ─────────────────────────────────────────────────────────────────────────

    const stateUpdateTimerRef = { current: null as any };
    const pendingUpdateRef = { current: false };

    const batchedSetConversations = () => {
      pendingUpdateRef.current = true;
      if (stateUpdateTimerRef.current) return; // already scheduled
      stateUpdateTimerRef.current = setTimeout(() => {
        stateUpdateTimerRef.current = null;
        if (pendingUpdateRef.current) {
          pendingUpdateRef.current = false;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeConversationId) return c;
              const newMsgs = c.messages.map((m) => {
                if (m.id !== assistantMsgId) return m;
                return { ...m, content: accumulatedText, thinking: thinkingText || m.thinking };
              });
              return { ...c, messages: newMsgs };
            })
          );
        }
      }, 50);
    };

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

      if (!response.ok || !response.body) {
        throw new Error(`Server returned status ${response.status}`);
      }

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

              if (eventName === 'thinking' && parsed.content) {
                thinkingText = parsed.content;
              } else if (eventName === 'chunk' && parsed.text) {
                accumulatedText += parsed.text;
                // Feed incoming text into sentence-level TTS buffer
                ttsSentenceBuffer += parsed.text;
                flushTtsBuffer();
              } else if (eventName === 'error' && (parsed.error || parsed.message)) {
                accumulatedText = `⚠️ Warning: ${parsed.error || parsed.message}`;
              } else if (eventName === 'done') {
                if (parsed.latencyMs) setLatencyMs(parsed.latencyMs);
                if (parsed.tokensPerSec) setTokensPerSec(parsed.tokensPerSec);
                // Flush any remaining text in buffer when stream ends
                if (isVoiceModeActiveRef.current && ttsSentenceBuffer.trim().length > 3) {
                  ttsQueueRef.current.push(ttsSentenceBuffer.trim());
                  ttsSentenceBuffer = '';
                  speakNextInQueue();
                }
              }

              if (eventName === 'chunk') {
                batchedSetConversations();
              } else if (eventName === 'done' || eventName === 'error') {
                // Force immediate final update
                if (stateUpdateTimerRef.current) { clearTimeout(stateUpdateTimerRef.current); stateUpdateTimerRef.current = null; }
                setConversations((prev) => prev.map((c) => {
                  if (c.id !== activeConversationId) return c;
                  const newMsgs = c.messages.map((m) => {
                    if (m.id !== assistantMsgId) return m;
                    return { ...m, content: accumulatedText, thinking: thinkingText || m.thinking,
                      modelUsed: parsed.modelUsed || m.modelUsed, providerUsed: parsed.providerUsed || m.providerUsed,
                      latencyMs: parsed.latencyMs || m.latencyMs, tokensPerSec: parsed.tokensPerSec || m.tokensPerSec,
                      isStreaming: false };
                  });
                  return { ...c, messages: newMsgs };
                }));
              }
            } catch (err) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      console.warn('Backend SSE stream notice, activating client-side ChatGPT engine:', err?.message || err);

      // Client-side fallback for static deployments (Netlify / Vercel / GitHub Pages)
      const isTamilMode = (langOverride || settings.language) === 'ta-IN' || /[\u0B80-\u0BFF]/.test(text);

      try {
        const apiKey = (settings.nvidiaApiKey || '').trim() || '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';
        if (apiKey) {
          accumulatedText = '';
          await streamFromNvidiaNim(
            [...currentConv.messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
            apiKey,
            routed.model.id || 'deepseek-ai/deepseek-v4-pro-0813',
            (chunk) => {
              accumulatedText += chunk;
              ttsSentenceBuffer += chunk;
              flushTtsBuffer();
              batchedSetConversations();
            },
            abortControllerRef.current?.signal
          );
        } else {
          throw new Error('No API key configured');
        }
      } catch (clientFallbackErr) {
        // Direct client-side web search + intelligent ChatGPT synthesis
        const searchResults = await clientPerformWebSearch(text);
        const reply = generateClientChatGPTResponse(text, searchResults, isTamilMode);
        const words = reply.split(' ');
        accumulatedText = '';

        for (let i = 0; i < words.length; i++) {
          const w = (i === 0 ? '' : ' ') + words[i];
          accumulatedText += w;
          ttsSentenceBuffer += w;
          flushTtsBuffer();
          batchedSetConversations();
          await new Promise((r) => setTimeout(r, 6));
        }
      }
    } finally {
      setIsStreaming(false);
      setGlobalArcRingMode('idle');
      const isTamilMode = (langOverride || settings.language) === 'ta-IN' || /[\u0B80-\u0BFF]/.test(text);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConversationId) return c;
          const newMsgs = c.messages.map((m) => {
            if (m.id !== assistantMsgId) return m;
            return {
              ...m,
              content: m.content || accumulatedText || generateClientChatGPTResponse(text, [], isTamilMode),
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
      const newVal = !prev;
      isVoiceModeActiveRef.current = newVal;
      if (!newVal) {
        // Immediately stop everything when voice is turned OFF
        window.speechSynthesis?.cancel();
        stopSpeech();
        ttsQueueRef.current = [];   // clear pending queue
        ttsSpeakingRef.current = false;
        setGlobalArcRingMode('idle');
      }
      return newVal;
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
        voiceSpeed={settings.voiceSpeed}
        onVoiceSpeedChange={(speed) => handleSaveSettings({ ...settings, voiceSpeed: speed })}
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
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Chat Canvas */}
        <main className="flex-1 flex flex-col w-full h-full min-w-0 min-h-0 overflow-hidden relative bg-[#212121]">
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
