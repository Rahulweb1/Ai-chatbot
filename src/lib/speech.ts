export interface VoiceOption {
  id: string;
  name: string;
  lang: string;
  gender: string;
}

export const PREBUILT_VOICES: VoiceOption[] = [
  { id: 'ta-IN-Standard-A', name: 'Pallavi Neural (Tamil - Soft Female)', lang: 'ta-IN', gender: 'female' },
  { id: 'ta-IN-Wavenet-A', name: 'Valluvar Neural (Tamil - Warm Male)', lang: 'ta-IN', gender: 'male' },
  { id: 'en-US-Neural2-F', name: 'F.R.I.D.A.Y. Core (English - Clear Female)', lang: 'en-US', gender: 'female' },
  { id: 'en-US-Neural2-[#12275C]', name: 'Stark Reactor (English - Deep Male)', lang: 'en-US', gender: 'male' },
];

let globalAudioContext: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentAnimFrameId: number | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioContext = new AudioCtx();
  }
  if (globalAudioContext.state === 'suspended') {
    globalAudioContext.resume();
  }
  return globalAudioContext;
}

export function stopSpeech(): void {
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }
  if (currentAnimFrameId !== null) {
    cancelAnimationFrame(currentAnimFrameId);
    currentAnimFrameId = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Clean text before sending to TTS (remove markdown formatting, code blocks, URLs)
 */
export function cleanTextForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\*\_~#]/g, '')
    .trim();
}

export interface PlayTtsOptions {
  lang: 'ta-IN' | 'en-US';
  voiceId?: string;
  speed?: number;
  onVolumeChange?: (volume: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

/**
 * Streams real cloud TTS audio from POST /api/tts and connects Web Audio AnalyserNode
 * to track real audio amplitude for the Arc Ring visualizer breathing effect.
 */
export async function playTtsAudio(
  text: string,
  options: PlayTtsOptions
): Promise<{ stop: () => void }> {
  const { lang, voiceId, speed = 1.3, onVolumeChange, onEnd, onError } = options;

  stopSpeech(); // Stop any active speech session

  const cleanText = cleanTextForTTS(text);
  if (!cleanText) {
    if (onEnd) onEnd();
    return { stop: () => {} };
  }

  const targetSpeechLang = lang || 'en-US';

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        lang: targetSpeechLang,
        voiceId,
        speed: speed || 1.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS server returned status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioCtx = getAudioContext();

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    if (speed && speed > 0) {
      sourceNode.playbackRate.value = Math.min(2.5, Math.max(0.5, speed));
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    currentSourceNode = sourceNode;

    // Amplitude tracker loop for Arc Ring amplitude
    const updateVolume = () => {
      if (!currentSourceNode) return;
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedVol = Math.min(1, Math.max(0, avg / 128));

      if (onVolumeChange) {
        onVolumeChange(normalizedVol);
      }

      currentAnimFrameId = requestAnimationFrame(updateVolume);
    };

    sourceNode.onended = () => {
      stopSpeech();
      if (onVolumeChange) onVolumeChange(0);
      if (onEnd) onEnd();
    };

    sourceNode.start(0);
    currentAnimFrameId = requestAnimationFrame(updateVolume);

    return {
      stop: () => stopSpeech(),
    };
  } catch (err) {
    console.warn('Real Cloud TTS playback failed, activating Web Speech Synthesis fallback:', err);
    
    // Web Speech API fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang === 'ta-IN' ? 'ta-IN' : 'en-US';
      utterance.rate = Math.min(2.5, Math.max(0.5, speed || 1.3));
      
      utterance.onend = () => {
        if (onVolumeChange) onVolumeChange(0);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        if (onVolumeChange) onVolumeChange(0);
        if (onEnd) onEnd();
      };

      // Simulate subtle volume pulsing for Arc Ring visualizer during speech
      let vol = 0.5;
      const interval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(interval);
          if (onVolumeChange) onVolumeChange(0);
          return;
        }
        vol = 0.3 + Math.random() * 0.4;
        if (onVolumeChange) onVolumeChange(vol);
      }, 100);

      window.speechSynthesis.speak(utterance);

      return {
        stop: () => {
          clearInterval(interval);
          window.speechSynthesis.cancel();
          if (onVolumeChange) onVolumeChange(0);
        },
      };
    }

    if (onError) onError(err);
    if (onEnd) onEnd();
    return { stop: () => {} };
  }
}

/**
 * Creates a Web Audio mic volume analyzer using getUserMedia for real mic input visualization.
 */
export async function createMicLevelAnalyser(
  onVolumeChange: (vol: number) => void
): Promise<{ stop: () => void }> {
  let mediaStream: MediaStream | null = null;
  let animId: number | null = null;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = getAudioContext();
    const source = audioCtx.createMediaStreamSource(mediaStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedVol = Math.min(1, Math.max(0, avg / 100));

      onVolumeChange(normalizedVol);
      animId = requestAnimationFrame(checkVolume);
    };

    animId = requestAnimationFrame(checkVolume);

    return {
      stop: () => {
        if (animId) cancelAnimationFrame(animId);
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }
        onVolumeChange(0);
      },
    };
  } catch (err) {
    console.warn('Microphone stream access not granted:', err);
    return { stop: () => {} };
  }
}

/**
 * Web Speech STT Recognizer with dynamic language choice (ta-IN or en-US)
 */
export function createSpeechRecognizer(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  lang: string = 'en-US'
) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Browser does not support Speech Recognition. Please use Chrome or Edge.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang || 'en-US';

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}
