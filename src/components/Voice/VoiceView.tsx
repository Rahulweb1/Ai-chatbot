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
              content: `You are ChatGPT, a real-time voice AI assistant. Respond ultra-fast in 1-2 short natural sentences.`,
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
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#212121] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2f2f2f] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shadow-md shrink-0">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>ChatGPT Voice Mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2f2f2f] text-white border border-[#383838] font-medium">
                  {selectedLanguage === 'ta-IN' ? 'Tamil (தமிழ்)' : 'English (en-US)'}
                </span>
              </h1>
              <p className="text-xs text-[#8e8e8e] mt-0.5">
                Real-time conversational voice interaction with speech synthesis
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('chat')}
              className="px-3 py-1.5 rounded-lg bg-[#2f2f2f] hover:bg-[#383838] border border-[#383838] text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Back to Chat</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171717] border border-[#2f2f2f] text-xs">
            <FastForward className="w-3.5 h-3.5 text-[#b4b4b4]" />
            <span className="text-[#8e8e8e]">Speed:</span>
            <select
              value={settings.voiceSpeed || 1.25}
              onChange={(e) => onSaveSettings && onSaveSettings({ ...settings, voiceSpeed: parseFloat(e.target.value) })}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              title="Voice Speed"
            >
              <option value="0.75" className="bg-[#212121] text-white">0.75x Slow</option>
              <option value="1.0" className="bg-[#212121] text-white">1.0x Normal</option>
              <option value="1.25" className="bg-[#212121] text-white">1.25x Fast</option>
              <option value="1.5" className="bg-[#212121] text-white">1.5x Speed</option>
              <option value="2.0" className="bg-[#212121] text-white">2.0x Ultra</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (!isMuted) stopSpeech();
              setIsMuted(!isMuted);
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1.5 ${
              isMuted
                ? 'bg-red-950/40 border-red-800 text-red-300'
                : 'bg-[#2f2f2f] border-[#383838] text-white hover:bg-[#383838]'
            }`}
            title={isMuted ? 'Unmute Speech' : 'Mute Speech'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-white" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>
        </div>
      </div>

      {/* Main Voice Orb Stage */}
      <div className="p-8 rounded-3xl bg-[#171717] border border-[#2f2f2f] shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[320px]">
        {/* Dynamic Status Badge */}
        <div className="mb-6 z-10">
          {voiceStatus === 'listening' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>Listening... Speak in {selectedLanguage === 'ta-IN' ? 'Tamil' : 'English'}</span>
            </div>
          ) : voiceStatus === 'thinking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2f2f2f] border border-[#444444] text-white text-xs font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Thinking ({routed.model.name})...</span>
            </div>
          ) : voiceStatus === 'speaking' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black text-xs font-semibold shadow-md">
              <Volume2 className="w-3.5 h-3.5 animate-bounce text-black" />
              <span>Speaking response...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#212121] border border-[#2f2f2f] text-[#8e8e8e] text-xs">
              <Mic className="w-3.5 h-3.5 text-[#8e8e8e]" />
              <span>Tap Orb or Microphone to start speaking</span>
            </div>
          )}
        </div>

        {/* Central Orb */}
        <div className="relative flex flex-col items-center justify-center my-4 z-10">
          <button
            onClick={isListening ? stopListening : startListening}
            className="outline-none focus:outline-none cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title={isListening ? 'Stop listening' : 'Tap to speak'}
          >
            <ArcRing mode={voiceStatus} audioLevel={audioAmplitude} size={150} />
          </button>
          <p className="text-xs text-[#8e8e8e] mt-4">
            Tap the orb to start or stop listening
          </p>
        </div>

        {/* Input prompt fallback */}
        <div className="mt-4 w-full max-w-lg z-10">
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
            className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#212121] border border-[#383838] focus-within:border-[#555555] transition-colors"
          >
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-xl transition-colors ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-[#2f2f2f] text-white hover:bg-[#383838]'
              }`}
              title={isListening ? 'Stop mic' : 'Start microphone'}
            >
              <Mic className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Or type a question for voice reply..."
              className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-[#737373] focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-200 text-black font-medium text-xs flex items-center gap-1 transition-all disabled:opacity-40"
            >
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Control bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 z-10 text-xs">
          {voiceStatus === 'speaking' && (
            <button
              onClick={() => {
                stopSpeech();
                updateStatus('idle', 0);
              }}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Speaking</span>
            </button>
          )}

          <button
            onClick={() => setIsAutoLoop(!isAutoLoop)}
            className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              isAutoLoop
                ? 'bg-white text-black border-white font-medium'
                : 'bg-[#212121] border-[#2f2f2f] text-[#8e8e8e]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Hands-Free Auto Loop: {isAutoLoop ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#212121] px-3 py-1.5 rounded-lg border border-[#2f2f2f] text-white">
            <Languages className="w-3.5 h-3.5 text-[#b4b4b4]" />
            <span className="text-[#8e8e8e]">Voice Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as 'ta-IN' | 'en-US')}
              className="bg-[#171717] text-white font-medium rounded px-2 py-0.5 focus:outline-none border border-[#2f2f2f]"
            >
              <option value="en-US">English (en-US)</option>
              <option value="ta-IN">தமிழ் (ta-IN)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transcript & Response Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User STT */}
        <div className="p-4 rounded-2xl bg-[#171717] border border-[#2f2f2f] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8e8e8e] pb-2 border-b border-[#2f2f2f]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <User className="w-3.5 h-3.5 text-white" />
              <span>You said</span>
            </span>
            <span>Microphone capture</span>
          </div>

          <div className="min-h-[70px] p-3 rounded-xl bg-[#212121] border border-[#2f2f2f] text-xs text-white leading-relaxed">
            {transcript || lastUserSpeech ? (
              <span>"{transcript || lastUserSpeech}"</span>
            ) : (
              <span className="text-[#737373] italic">No voice input captured yet. Speak into the microphone.</span>
            )}
          </div>
        </div>

        {/* AI TTS Response */}
        <div className="p-4 rounded-2xl bg-[#171717] border border-[#2f2f2f] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8e8e8e] pb-2 border-b border-[#2f2f2f]">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <Bot className="w-3.5 h-3.5 text-white" />
              <span>ChatGPT voice reply</span>
            </span>
            <span className="text-white font-medium">{routed.model.name}</span>
          </div>

          <div className="min-h-[70px] p-3 rounded-xl bg-[#212121] border border-[#2f2f2f] text-xs text-white leading-relaxed">
            {aiResponse ? (
              <div className="space-y-2">
                <p>{aiResponse}</p>
                <button
                  onClick={() => speakAudioResponse(aiResponse)}
                  className="px-2.5 py-1 rounded bg-[#2f2f2f] hover:bg-[#383838] text-white text-[11px] font-medium flex items-center gap-1 transition-colors border border-[#383838]"
                >
                  <Play className="w-3 h-3" />
                  <span>Replay voice</span>
                </button>
              </div>
            ) : (
              <span className="text-[#737373] italic">Assistant voice response will appear and play aloud here.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
