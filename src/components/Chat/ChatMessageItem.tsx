import React, { useState } from 'react';
import {
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Brain,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { CodeBlock } from './CodeBlock';
import { playTtsAudio, stopSpeech } from '../../lib/speech';
import { ArcRing } from '../ArcRing';

interface ChatMessageItemProps {
  key?: React.Key;
  message: ChatMessage;
  lang?: 'ta-IN' | 'en-US';
  onRegenerate?: () => void;
  onEditPrompt?: (newText: string) => void;
}

export function ChatMessageItem({ message, lang = 'ta-IN', onRegenerate, onEditPrompt }: ChatMessageItemProps) {
  const [showThinking, setShowThinking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakerAudioLevel, setSpeakerAudioLevel] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = async () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      setSpeakerAudioLevel(0);
    } else {
      setIsSpeaking(true);
      await playTtsAudio(message.content, {
        lang: lang,
        onVolumeChange: (vol) => setSpeakerAudioLevel(vol),
        onEnd: () => {
          setIsSpeaking(false);
          setSpeakerAudioLevel(0);
        },
        onError: () => {
          setIsSpeaking(false);
          setSpeakerAudioLevel(0);
        },
      });
    }
  };

  const parseContentWithCodeBlocks = (content: string) => {
    const parts = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          value: content.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        value: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex),
      });
    }

    return parts;
  };

  const contentParts = parseContentWithCodeBlocks(message.content);

  return (
    <div
      className={`py-3.5 px-4 rounded-xl transition-all my-2.5 font-['Inter',sans-serif] ${
        isUser
          ? 'bg-[#0A1128]/70 border border-[#12275C] shadow-sm'
          : 'bg-[#0A1128] border border-[#12275C] shadow-md shadow-[#2E6FF2]/5'
      }`}
    >
      {/* Header Log Info */}
      <div className="flex items-center justify-between mb-3 border-b border-[#12275C]/60 pb-2">
        <div className="flex items-center gap-2.5">
          {!isUser ? (
            <ArcRing
              mode={isSpeaking ? 'speaking' : message.isStreaming ? 'thinking' : 'idle'}
              audioLevel={speakerAudioLevel}
              size={28}
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-[#12275C] text-[#EAF1FF] flex items-center justify-center font-mono font-bold text-xs">
              <User className="w-4 h-4 text-[#5B9CFF]" />
            </div>
          )}

          <div>
            <span className="font-grotesk font-extrabold text-xs text-[#EAF1FF] uppercase tracking-wider">
              {isUser ? 'OPERATOR COMMAND' : 'F.R.I.D.A.Y. SYSTEM LOG'}
            </span>
            {!isUser && message.modelUsed && (
              <span className="ml-2.5 text-[10px] px-2 py-0.5 rounded bg-[#2E6FF2]/15 text-[#5B9CFF] font-mono border border-[#12275C] font-bold">
                {message.modelUsed}
              </span>
            )}
          </div>
        </div>

        {/* Log Metrics & Speech Action Controls */}
        <div className="flex items-center gap-3 text-xs text-[#6B7A99] font-mono">
          {!isUser && message.latencyMs && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
              <Zap className="w-3 h-3 text-[#5B9CFF]" />
              <span className="text-[#5B9CFF] font-bold">{message.latencyMs}ms</span>
              {message.tokensPerSec && (
                <>
                  <span className="text-[#12275C]">•</span>
                  <Activity className="w-3 h-3 text-[#EAF1FF]" />
                  <span className="text-[#EAF1FF]">{message.tokensPerSec} t/s</span>
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSpeak}
              className={`p-1.5 rounded transition-colors ${
                isSpeaking ? 'text-[#5B9CFF] bg-[#2E6FF2]/20 border border-[#2E6FF2]' : 'text-[#6B7A99] hover:text-[#EAF1FF]'
              }`}
              title={isSpeaking ? 'Stop Speech' : 'Play TTS Voice (Tamil / English)'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#5B9CFF]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {isUser && onEditPrompt && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1.5 rounded text-[#6B7A99] hover:text-[#EAF1FF] transition-colors"
                title="Edit prompt"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attachments if any */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {message.attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-[#030712] border border-[#12275C] text-xs text-[#EAF1FF]"
            >
              {att.type === 'image' && <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />}
              <span className="font-mono text-[11px] truncate max-w-[150px]">{att.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Thinking Accordion for Reasoning Models */}
      {!isUser && message.thinking && (
        <div className="my-2 rounded-lg bg-[#030712]/80 border border-[#12275C] overflow-hidden">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-[#6B7A99] hover:text-[#EAF1FF] bg-[#0A1128] transition-colors font-mono"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-[#5B9CFF] animate-pulse" />
              <span className="text-[#5B9CFF] font-semibold">Model Reasoning & System Logs</span>
            </div>
            {showThinking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showThinking && (
            <div className="p-3 text-xs text-[#6B7A99] font-mono leading-relaxed whitespace-pre-wrap border-t border-[#12275C] bg-[#030712]">
              {message.thinking}
            </div>
          )}
        </div>
      )}

      {/* Editing State or Content Display */}
      {isEditing ? (
        <div className="space-y-2 mt-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#030712] border border-[#12275C] text-[#EAF1FF] text-sm focus:outline-none focus:border-[#2E6FF2] font-mono"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg bg-[#12275C] text-[#6B7A99] hover:text-[#EAF1FF] text-xs font-mono"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                if (onEditPrompt) onEditPrompt(editText);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-semibold text-xs font-mono"
            >
              Resubmit Command
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-[#EAF1FF] leading-relaxed space-y-2 font-['Inter',sans-serif]">
          {contentParts.map((part, index) =>
            part.type === 'code' ? (
              <CodeBlock key={index} language={part.language} value={part.value} />
            ) : (
              <p key={index} className="whitespace-pre-wrap">
                {part.value}
              </p>
            )
          )}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-[#5B9CFF] ml-1 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}
