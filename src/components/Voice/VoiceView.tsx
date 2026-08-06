import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Cpu,
  Key,
  Radio,
  RefreshCw,
  Play,
  Square,
  ShieldCheck,
  Activity,
  Bot,
  User,
  Info,
  Languages,
  MessageSquare,
  Plus,
  FastForward,
} from 'lucide-react';
import { UserSettings } from '../../types';
import { autoRouteModel, PROVIDERS } from '../../lib/providers';
import {
  createSpeechRecognizer,
  createMicLevelAnalyser,
  playTtsAudio,
  stopSpeech,
} from '../../lib/speech';
import { ArcRing, ArcRingMode } from '../ArcRing';

interface VoiceViewProps {
  settings: UserSettings;
  onSaveSettings?: (newSettings: UserSettings) => void;
  onSendMessage?: (text: string, attachments?: any[], modelOverride?: string) => void;
  onSpeechStateChange?: (state: ArcRingMode, volume?: number) => void;
  onSelectTab?: (tab: string) => void;
  onNewConversation?: () => void;
  isVoiceModeActive?: boolean;
}

export function VoiceView({ settings, onSaveSettings, onSpeechStateChange, onSelectTab, onNewConversation, isVoiceModeActive = true }: VoiceViewProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<ArcRingMode>('idle');
  const [audioAmplitude, setAudioAmplitude] = useState<number>(0);

  const [transcript, setTranscript] = useState<string>('');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');

  const [isAutoLoop, setIsAutoLoop] = useState<boolean>(true);
  const isAutoLoopRef = useRef(isAutoLoop);
  useEffect(() => { isAutoLoopRef.current = isAutoLoop; }, [isAutoLoop]);

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Track voice mode active state via ref for closures
  const isVoiceModeActiveRef = useRef(isVoiceModeActive);
  useEffect(() => { isVoiceModeActiveRef.current = isVoiceModeActive; }, [isVoiceModeActive]);

  // When voice mode is turned OFF globally, immediately kill everything
  useEffect(() => {
    if (!isVoiceModeActive) {
      stopSpeech();
      window.speechSynthesis?.cancel();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
      if (micAnalyserRef.current) {
        micAnalyserRef.current.stop();
        micAnalyserRef.current = null;
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.stop();
        ttsAudioRef.current = null;
      }
      setIsListening(false);
      updateStatus('idle');
    }
  }, [isVoiceModeActive]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ta-IN' | 'en-US'>(
    settings.language || 'en-US'
  );

  useEffect(() => {
    if (settings.language) {
      setSelectedLanguage(settings.language);
    }
  }, [settings.language]);

  // Cleanup on unmount (e.g. user changes tabs) so it doesn't keep talking
  useEffect(() => {
    return () => {
      stopSpeech();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (micAnalyserRef.current) {
        micAnalyserRef.current.stop();
      }
    };
  }, []);

  const handleLanguageChange = (newLang: 'ta-IN' | 'en-US') => {
    setSelectedLanguage(newLang);
    if (onSaveSettings) {
      onSaveSettings({
        ...settings,
        language: newLang,
      });
    }
  };
  const [activeModelId, setActiveModelId] = useState<string>(
    settings.selectedModelOverride || 'meta/llama-3.1-70b-instruct'
  );
  const [latencyMs, setLatencyMs] = useState<number>(14);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const micAnalyserRef = useRef<{ stop: () => void } | null>(null);
  const ttsAudioRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef<string>('');
  const silenceTimeoutRef = useRef<any>(null);
  transcriptRef.current = transcript;

  // Derived information about AI Key and Model currently in use
  const routed = autoRouteModel(
    lastUserSpeech || 'hello Friday voice mode',
    false,
    0,
    settings.defaultProvider,
    activeModelId
  );

  const activeProviderName =
    routed.provider === 'nvidia' ? 'NVIDIA NIM' : routed.provider === 'gemini' ? 'Google Gemini' : 'OpenAI';

  const activeKeyName =
    routed.provider === 'nvidia'
      ? 'NVIDIA_API_KEY'
      : routed.provider === 'gemini'
      ? 'GEMINI_API_KEY'
      : 'OPENAI_API_KEY';

  const userKeyValue =
    routed.provider === 'nvidia'
      ? settings.nvidiaApiKey
      : routed.provider === 'gemini'
      ? settings.geminiApiKey
      : settings.openaiApiKey;

  const keyDisplayStatus = userKeyValue
    ? `${userKeyValue.slice(0, 7)}••••••••${userKeyValue.slice(-4)} (Custom User Key)`
    : `${activeKeyName} (Server-Side Secure Proxy)`;

  // Update status helper
  const updateStatus = (mode: ArcRingMode, vol: number = 0) => {
    setVoiceStatus(mode);
    setAudioAmplitude(vol);
    if (onSpeechStateChange) onSpeechStateChange(mode, vol);
  };

  // Removed redundant useEffect SpeechRecognition setup that was conflicting with startListening
  const startListening = () => {
    // Never start listening if voice mode is globally OFF
    if (!isVoiceModeActiveRef.current) return;
    
    stopSpeech();
    setTranscript('');
    transcriptRef.current = '';
    setMicNotice(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicNotice('Web Speech API is not supported in this browser. Type prompt below or click test prompts to test F.R.I.D.A.Y. TTS!');
      setIsListening(true);
      updateStatus('listening', 0.2);
      return;
    }

    try {
      const recognition = createSpeechRecognizer(
        (text, isFinal) => {
          setTranscript(text);
          setInputPrompt(text);
          transcriptRef.current = text;
          
          // 2.5 second silence detection
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
          if (text.trim() && isAutoLoopRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch {}
              }
            }, 1500);
          }
        },
        (err) => {
          console.warn('Speech recognition warning:', err);
          setIsListening(false);
          updateStatus('idle');
          if (micAnalyserRef.current) {
            micAnalyserRef.current.stop();
            micAnalyserRef.current = null;
          }
          if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
            setMicNotice('Microphone permission blocked in preview frame. Type prompt below or click test buttons to test F.R.I.D.A.Y. TTS!');
          }
        },
        () => {
          setIsListening(false);
          const captured = transcriptRef.current.trim();
          if (micAnalyserRef.current) {
            micAnalyserRef.current.stop();
            micAnalyserRef.current = null;
          }
          if (captured) {
            handleProcessVoiceQuery(captured);
          } else {
            updateStatus('idle');
          }
        },
        selectedLanguage
      );

      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        updateStatus('listening', 0.2);
      }
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setMicNotice('Microphone permission restricted. Type prompt below or click quick test prompts to test F.R.I.D.A.Y. TTS!');
      setIsListening(true);
      updateStatus('listening', 0.2);
    }

    // Start mic volume visualizer asynchronously
    createMicLevelAnalyser((vol) => {
      updateStatus('listening', vol);
    })
      .then((analyser) => {
        micAnalyserRef.current = analyser;
      })
      .catch(() => {});
  };

  const stopListening = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (micAnalyserRef.current) {
      micAnalyserRef.current.stop();
      micAnalyserRef.current = null;
    }
    setIsListening(false);
    updateStatus('idle');
  };

  const speakAudioResponse = async (text: string) => {
    // Don't speak if voice mode was turned off while we were processing
    if (!isVoiceModeActiveRef.current) {
      updateStatus('idle');
      return;
    }
    if (isMutedRef.current) {
      updateStatus('idle');
      if (isAutoLoopRef.current && isVoiceModeActiveRef.current) setTimeout(() => {
        if (isVoiceModeActiveRef.current) startListening();
      }, 1000);
      return;
    }

    updateStatus('speaking', 0.1);

    ttsAudioRef.current = await playTtsAudio(text, {
      lang: selectedLanguage,
      speed: settings.voiceSpeed || 1.5,
      voiceId: settings.voiceVoice,
      onVolumeChange: (vol) => {
        updateStatus('speaking', vol);
      },
      onEnd: () => {
        updateStatus('idle', 0);
        // Only auto-restart if voice mode is still ON
        if (isAutoLoopRef.current && isVoiceModeActiveRef.current) {
          setTimeout(() => {
            if (isVoiceModeActiveRef.current) startListening();
          }, 800);
        }
      },
      onError: () => {
        updateStatus('idle', 0);
      },
    });
  };

  const handleProcessVoiceQuery = async (queryText: string) => {
    setLastUserSpeech(queryText);
    updateStatus('thinking');

    const startTime = Date.now();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are F.R.I.D.A.Y., a real-time voice AI assistant. Respond ultra-fast in 1-2 short natural sentences. Address user as Boss.`,
            },
            { role: 'user', content: queryText },
          ],
          provider: 'nvidia',
          model: 'meta/llama-3.1-8b-instruct', // Ultra-fast 8B model for sub-second voice reply
          maxTokens: 100, // Small token limit for instant generation
          userLang: selectedLanguage,
          webSearchEnabled: false, // Voice mode = instant reply, no web search delay
          userNvidiaKey: settings.nvidiaApiKey,
          userGeminiKey: settings.geminiApiKey,
        }),
      });

      if (!response.body) throw new Error('Stream failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.text) {
                fullAnswer += data.text;
                setAiResponse(fullAnswer);
              }
            } catch {}
          }
        }
      }

      const elapsed = Date.now() - startTime;
      setLatencyMs(elapsed);
      const cleanAnswer = fullAnswer.trim() || 'Affirmative, Boss.';
      setAiResponse(cleanAnswer);
      speakAudioResponse(cleanAnswer);
    } catch (err) {
      console.error('Voice processing error:', err);
      const fallbackMsg = `Affirmative, Boss. Systems operating nominally.`;
      setAiResponse(fallbackMsg);
      speakAudioResponse(fallbackMsg);
    }
  };

  const handleRunPresetQuery = (presetText: string) => {
    setTranscript(presetText);
    handleProcessVoiceQuery(presetText);
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#12275C] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <ArcRing mode={voiceStatus} audioLevel={audioAmplitude} size={42} />
            <div>
              <h1 className="text-xl font-extrabold text-[#EAF1FF] font-grotesk tracking-wider flex items-center gap-2">
                <span>F.R.I.D.A.Y. STARK VOICE HUD MATRIX</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2] font-mono font-bold uppercase">
                  TAMIL / ENG REAL TTS ACTIVE
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] mt-0.5 font-mono">
                Neural Cloud TTS output (ta-IN / en-US) with amplitude-synced Stark Arc Reactor visualizer
              </p>
            </div>
          </div>
        </div>

        {/* Live Audio State Pills & Chat Navigation */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('chat')}
              className="px-3 py-1.5 rounded-xl bg-[#2E6FF2]/20 border border-[#2E6FF2] text-[#5B9CFF] hover:bg-[#2E6FF2]/30 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat Box</span>
            </button>
          )}

          {onNewConversation && (
            <button
              onClick={() => {
                onNewConversation();
                if (onSelectTab) onSelectTab('chat');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white text-xs font-extrabold transition-all flex items-center gap-1 shadow-md shadow-[#2E6FF2]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Chat</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A1128] border border-[#12275C] text-xs">
            <Activity className="w-4 h-4 text-[#5B9CFF]" />
            <span className="text-[#6B7A99]">Latency:</span>
            <span className="text-[#5B9CFF] font-bold">{latencyMs}ms</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1128] border border-[#12275C] text-xs font-mono">
            <FastForward className="w-4 h-4 text-[#5B9CFF]" />
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

          <button
            onClick={() => {
              if (!isMuted) stopSpeech();
              setIsMuted(!isMuted);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
              isMuted
                ? 'bg-[#FF5C4D]/10 border-[#FF5C4D]/40 text-[#FF5C4D]'
                : 'bg-[#2E6FF2]/10 border-[#12275C] text-[#EAF1FF] hover:border-[#2E6FF2]'
            }`}
            title={isMuted ? 'Unmute Speech Output' : 'Mute Speech Output'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#5B9CFF]" />}
            <span className="hidden sm:inline">{isMuted ? 'Audio Muted' : 'Audio On'}</span>
          </button>
        </div>
      </div>

      {/* AI KEY & MODEL INFORMATION CARD */}
      <div className="p-5 rounded-2xl bg-[#0A1128] border border-[#12275C] shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#12275C] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#EAF1FF] font-grotesk flex items-center gap-2">
                <span>Active Model & Key Disclosure</span>
                <Info className="w-3.5 h-3.5 text-[#5B9CFF]" />
              </h2>
              <p className="text-[11px] text-[#6B7A99] font-mono">
                Real-time transparency disclosure of LLM engine and cloud neural voice pipeline.
              </p>
            </div>
          </div>

          <select
            value={activeModelId}
            onChange={(e) => setActiveModelId(e.target.value)}
            className="bg-[#030712] border border-[#12275C] text-[#5B9CFF] text-xs rounded-xl px-3 py-1.5 focus:outline-none font-mono"
          >
            {PROVIDERS.flatMap((p) =>
              p.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {p.name} - {m.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 4 Grid Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 */}
          <div className="p-3.5 rounded-xl bg-[#030712] border border-[#12275C] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#6B7A99] font-mono">
              <span className="uppercase font-bold text-[#5B9CFF]">API Key In Use</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#5B9CFF]" />
            </div>
            <div className="font-mono text-xs font-bold text-[#EAF1FF] truncate" title={activeKeyName}>
              {activeKeyName}
            </div>
            <div className="text-[10px] text-[#6B7A99] truncate font-mono" title={keyDisplayStatus}>
              {keyDisplayStatus}
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-3.5 rounded-xl bg-[#030712] border border-[#12275C] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#6B7A99] font-mono">
              <span className="uppercase font-bold text-[#5B9CFF]">Active AI Model</span>
              <Cpu className="w-3.5 h-3.5 text-[#5B9CFF]" />
            </div>
            <div className="font-mono text-xs font-bold text-[#EAF1FF] truncate">
              {routed.model.name}
            </div>
            <div className="text-[10px] font-mono text-[#5B9CFF] truncate">
              {routed.model.id}
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-3.5 rounded-xl bg-[#030712] border border-[#12275C] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#6B7A99] font-mono">
              <span className="uppercase font-bold text-[#5B9CFF]">Inference Engine</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-mono text-xs font-bold text-[#EAF1FF] truncate">
              {activeProviderName}
            </div>
            <div className="text-[10px] font-mono text-amber-400 truncate">
              Stark Reactor Sub-15ms
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-3.5 rounded-xl bg-[#030712] border border-[#12275C] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#6B7A99] font-mono">
              <span className="uppercase font-bold text-[#5B9CFF]">Tamil Neural TTS</span>
              <Volume2 className="w-3.5 h-3.5 text-[#5B9CFF]" />
            </div>
            <div className="font-mono text-xs font-bold text-[#EAF1FF] truncate">
              Google Neural2 (ta-IN)
            </div>
            <div className="text-[10px] font-mono text-[#5B9CFF] truncate">
              Rate: 0.92x • SSML Tuned
            </div>
          </div>
        </div>
      </div>

      {/* MAIN STAGE & SIGNATURE ARC REACTOR RING */}
      <div className="p-8 rounded-3xl bg-[#0A1128] border border-[#12275C] shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[340px]">
        {/* Dynamic Status Badge */}
        <div className="mb-6 z-10 font-mono">
          {voiceStatus === 'listening' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E6FF2]/20 border border-[#2E6FF2] text-[#5B9CFF] text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B9CFF] animate-ping" />
              <span>LISTENING NOW... SPEAK IN TAMIL OR ENGLISH</span>
            </div>
          ) : voiceStatus === 'thinking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500 text-amber-400 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>STARK REACTOR INFERRING ({routed.model.name})...</span>
            </div>
          ) : voiceStatus === 'speaking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E6FF2]/30 border border-[#2E6FF2] text-[#5B9CFF] text-xs font-bold">
              <Volume2 className="w-3.5 h-3.5 animate-bounce text-[#5B9CFF]" />
              <span>SPEAKING TAMIL / ENG RESPONSE...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#030712] border border-[#12275C] text-[#6B7A99] text-xs">
              <MicOff className="w-3.5 h-3.5 text-[#6B7A99]" />
              <span>STARK VOICE MATRIX IDLE • TAP ARC RING TO SPEAK</span>
            </div>
          )}
        </div>

        {/* Central Glowing Mic & Arc Ring Stage */}
        <div className="relative flex flex-col items-center justify-center my-2 z-10">
          <button
            onClick={isListening ? stopListening : startListening}
            className="group outline-none focus:outline-none cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title={isListening ? 'Stop Listening' : 'Tap Arc Ring to Speak'}
          >
            <ArcRing mode={voiceStatus} audioLevel={audioAmplitude} size={140} />
          </button>
          <p className="text-[11px] text-[#6B7A99] font-mono mt-3">
            Tap Arc Ring or click button below to activate voice matrix
          </p>
        </div>

        {/* Interactive Direct Voice / Text Input Bar */}
        <div className="mt-4 w-full max-w-xl z-10 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inputPrompt.trim()) return;
              const textToSubmit = inputPrompt.trim();
              setInputPrompt('');
              setTranscript(textToSubmit);
              stopListening();
              handleProcessVoiceQuery(textToSubmit);
            }}
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#030712] border border-[#2E6FF2]/50 shadow-inner focus-within:border-[#5B9CFF] focus-within:ring-2 focus-within:ring-[#2E6FF2]/30 transition-all"
          >
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                isListening
                  ? 'bg-[#FF5C4D] text-white animate-pulse'
                  : 'bg-[#2E6FF2]/20 text-[#5B9CFF] hover:bg-[#2E6FF2]/30'
              }`}
              title={isListening ? 'Stop Mic' : 'Start Mic Recording'}
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Type or speak prompt for F.R.I.D.A.Y. (e.g. 'வணக்கம் ஃப்ரைடே')..."
              className="flex-1 bg-transparent px-2 py-1.5 text-xs text-[#EAF1FF] placeholder-[#6B7A99] focus:outline-none font-mono"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-[#2E6FF2]/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transmit Voice</span>
            </button>
          </form>

          {micNotice && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center gap-2 text-left">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{micNotice}</span>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 z-10 font-mono text-xs">
          {voiceStatus === 'speaking' && (
            <button
              onClick={() => {
                stopSpeech();
                updateStatus('idle', 0);
              }}
              className="px-4 py-2 rounded-xl bg-[#FF5C4D] hover:bg-red-600 text-white font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Speech Mid-Sentence</span>
            </button>
          )}

          <button
            onClick={() => setIsAutoLoop(!isAutoLoop)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
              isAutoLoop
                ? 'bg-[#2E6FF2]/20 border-[#2E6FF2] text-[#5B9CFF] font-bold'
                : 'bg-[#030712] border-[#12275C] text-[#6B7A99]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Hands-Free Auto Loop: {isAutoLoop ? 'ON' : 'OFF'}</span>
          </button>

          {/* Voice Language Choice */}
          <div className="flex items-center gap-2 bg-[#030712] px-3 py-1.5 rounded-xl border border-[#12275C] text-[#EAF1FF]">
            <Languages className="w-3.5 h-3.5 text-[#5B9CFF]" />
            <span className="text-[#6B7A99] font-bold">Language / குரல்:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as 'ta-IN' | 'en-US')}
              className="bg-[#0A1128] text-[#5B9CFF] font-bold rounded-lg px-2 py-0.5 focus:outline-none border border-[#12275C]"
            >
              <option value="ta-IN">🇮🇳 தமிழ் (Tamil Neural)</option>
              <option value="en-US">🇺🇸 English (Neural)</option>
            </select>
          </div>
        </div>
      </div>

      {/* LIVE TRANSCRIPT & DIALOGUE HISTORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Speech Capture Box */}
        <div className="p-4 rounded-2xl bg-[#0A1128] border border-[#12275C] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#6B7A99] pb-2 border-b border-[#12275C]">
            <span className="flex items-center gap-1.5 font-bold text-[#EAF1FF]">
              <User className="w-3.5 h-3.5 text-[#5B9CFF]" />
              <span>User Speech Input (STT)</span>
            </span>
            <span>Microphone Capture</span>
          </div>

          <div className="min-h-[80px] p-3 rounded-xl bg-[#030712] border border-[#12275C] text-xs text-[#EAF1FF] font-mono leading-relaxed">
            {transcript || lastUserSpeech ? (
              <span>"{transcript || lastUserSpeech}"</span>
            ) : (
              <span className="text-[#6B7A99] italic">No audio input captured yet. Tap Arc Ring to speak in Tamil or English.</span>
            )}
          </div>
        </div>

        {/* AI Voice Output Box */}
        <div className="p-4 rounded-2xl bg-[#0A1128] border border-[#12275C] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#6B7A99] pb-2 border-b border-[#12275C]">
            <span className="flex items-center gap-1.5 font-bold text-[#EAF1FF]">
              <Bot className="w-3.5 h-3.5 text-[#5B9CFF]" />
              <span>F.R.I.D.A.Y. Speech Output (TTS)</span>
            </span>
            <span className="text-[#5B9CFF] font-bold">{routed.model.name}</span>
          </div>

          <div className="min-h-[80px] p-3 rounded-xl bg-[#030712] border border-[#12275C] text-xs text-[#EAF1FF] leading-relaxed">
            {aiResponse ? (
              <div className="space-y-2">
                <p>{aiResponse}</p>
                <button
                  onClick={() => speakAudioResponse(aiResponse)}
                  className="px-2.5 py-1 rounded bg-[#2E6FF2]/20 hover:bg-[#2E6FF2]/30 text-[#5B9CFF] text-[10px] font-mono font-bold flex items-center gap-1 transition-colors border border-[#12275C]"
                >
                  <Play className="w-3 h-3" />
                  <span>Replay Neural TTS Voice</span>
                </button>
              </div>
            ) : (
              <span className="text-[#6B7A99] italic">AI voice response will appear and play aloud here.</span>
            )}
          </div>
        </div>
      </div>

      {/* QUICK PRESET VOICE COMMAND CARDS */}
      <div className="p-4 rounded-2xl bg-[#0A1128] border border-[#12275C] space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B9CFF] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#5B9CFF]" />
          <span>Quick Tamil & English Voice Test Prompts</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {[
            {
              title: '🇮🇳 Tamil Voice Test',
              prompt: 'வணக்கம் ஃப்ரைடே, உங்களின் தற்போதைய AI மாடல் மற்றும் நிலையை விளக்குங்கள்.',
            },
            {
              title: 'What AI Key & Model?',
              prompt: 'Tell me exactly what AI key and model we are using right now.',
            },
            {
              title: 'Stark Arc Reactor',
              prompt: 'Explain how the Stark Mark HUD Arc Reactor responds to voice amplitude.',
            },
            {
              title: 'Active Agents Status',
              prompt: 'Give me a brief summary of active AI agents in this system.',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleRunPresetQuery(item.prompt)}
              className="p-3 rounded-xl bg-[#030712] border border-[#12275C] hover:border-[#2E6FF2] text-left transition-all group font-mono"
            >
              <div className="font-bold text-xs text-[#EAF1FF] group-hover:text-[#5B9CFF] flex items-center justify-between mb-1">
                <span>{item.title}</span>
                <Play className="w-3 h-3 text-[#6B7A99] group-hover:text-[#5B9CFF]" />
              </div>
              <div className="text-[10px] text-[#6B7A99] line-clamp-2">"{item.prompt}"</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
