import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  Bot,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { CodeBlock } from './CodeBlock';
import { playTtsAudio, stopSpeech } from '../../lib/speech';

interface ChatMessageItemProps {
  key?: React.Key;
  message: ChatMessage;
  lang?: 'ta-IN' | 'en-US';
  voiceSpeed?: number;
  onRegenerate?: () => void;
  onEditPrompt?: (newText: string) => void;
}

export function ChatMessageItem({ message, lang = 'en-US', voiceSpeed = 1.25, onRegenerate, onEditPrompt }: ChatMessageItemProps) {
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
    } else {
      setIsSpeaking(true);
      await playTtsAudio(message.content, {
        lang: lang,
        speed: voiceSpeed || 1.25,
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4 w-full">
        <div className="max-w-[85%] md:max-w-[70%] bg-[#2f2f2f] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm border border-[#3a3a3a] text-sm">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att) => (
                <div key={att.id} className="p-1.5 rounded-lg bg-[#212121] border border-[#444444] text-xs flex items-center gap-2">
                  {att.type === 'image' && <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" />}
                  <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 my-4 w-full text-sm text-[#ececec]">
      {/* Assistant Avatar */}
      <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
        <Bot className="w-4 h-4 text-black" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Thinking Accordion (Only for genuine reasoning models) */}
        {message.thinking && message.thinking.trim().length > 40 && !message.thinking.includes('Synthesizing') && !message.thinking.includes('Connecting') && (
          <div className="mb-2 rounded-lg bg-[#171717] border border-[#2f2f2f] overflow-hidden">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#b4b4b4] hover:text-white bg-[#1e1e1e] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="font-medium">Reasoning process</span>
              </div>
              {showThinking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showThinking && (
              <div className="p-3 text-xs text-[#8e8e8e] font-mono leading-relaxed whitespace-pre-wrap border-t border-[#2f2f2f]">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Content Stream with full GitHub Markdown parsing */}
        <div className="chatgpt-markdown text-sm leading-relaxed space-y-2 text-[#ececec]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-3 mb-1.5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-2.5 mb-1">{children}</h3>,
              p: ({ children }) => <p className="leading-relaxed my-1.5">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-outside pl-5 space-y-1 my-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-outside pl-5 space-y-1 my-2">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed text-[#ececec]">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-[#d4d4d4]">{children}</em>,
              hr: () => <hr className="my-3 border-[#383838]" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-[#555] pl-3 italic text-[#b4b4b4] my-2">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#58a6ff] hover:underline font-medium"
                >
                  <span>{children}</span>
                  <ExternalLink className="w-3 h-3 inline shrink-0 opacity-80" />
                </a>
              ),
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (!inline && (match || codeString.includes('\n'))) {
                  return (
                    <div className="my-3">
                      <CodeBlock language={match ? match[1] : 'text'} value={codeString} />
                    </div>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded bg-[#2f2f2f] text-[#ff7b72] font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>

          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center gap-1 pt-1.5 text-xs text-[#8e8e8e]">
          <button
            onClick={handleToggleSpeak}
            className={`p-1.5 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors ${
              isSpeaking ? 'text-white bg-[#2f2f2f]' : ''
            }`}
            title={isSpeaking ? 'Stop voice' : 'Read aloud with voice'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors"
            title="Copy message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded hover:bg-[#2f2f2f] hover:text-white transition-colors"
              title="Regenerate response"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {message.modelUsed && (
            <span className="text-[10px] text-[#737373] ml-2">
              {message.modelUsed}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


