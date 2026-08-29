import { AIModel, ProviderId, ProviderInfo } from '../types';

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Bot',
    description: 'Flagship ChatGPT reasoning and multimodal models',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        provider: 'openai',
        description: 'Flagship multimodal high-intelligence model for text, vision, and reasoning',
        contextWindow: '128k tokens',
        category: 'general',
        recommendedFor: 'General Intelligence, Coding, Creative Writing, Analysis',
        badge: 'ChatGPT 4o ⚡',
        isDefault: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, lightweight model for everyday tasks and quick conversational answers',
        contextWindow: '128k tokens',
        category: 'greeting',
        recommendedFor: 'Fast Q&A, Short Summaries, Everyday Chat',
        badge: 'Fast Mini',
      },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: 'Sparkles',
    description: 'Google DeepMind multimodal AI models',
    models: [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
        description: 'Fast, highly capable multimodal model for real-time assistant responses',
        contextWindow: '1M tokens',
        category: 'general',
        recommendedFor: 'General Assistant, Multimodal tasks, Web Search',
        badge: 'Gemini 2.5',
        isDefault: true,
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
        description: 'Advanced reasoning and enterprise coding model',
        contextWindow: '2M tokens',
        category: 'coding',
        recommendedFor: 'Enterprise Coding, Deep Analysis, Complex Workflows',
        badge: 'Pro Reasoning',
      },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: 'Cpu',
    description: 'High-performance GPU accelerated open-source AI models',
    models: [
      {
        id: 'deepseek-ai/deepseek-v4-pro-0813',
        name: 'DeepSeek V4 Pro',
        provider: 'nvidia',
        description: 'DeepSeek V4 Pro flagship reasoning and agentic coding model on NVIDIA NIM',
        contextWindow: '1M tokens',
        category: 'coding',
        recommendedFor: 'Deep Reasoning, Coding, Mathematics, General Intelligence',
        badge: 'DeepSeek V4 Pro ⚡',
        isDefault: true,
      },
      {
        id: 'deepseek-ai/deepseek-v4-flash-0731',
        name: 'DeepSeek V4 Flash',
        provider: 'nvidia',
        description: 'Ultra-fast low-latency DeepSeek model for instant conversational chat',
        contextWindow: '128k tokens',
        category: 'greeting',
        recommendedFor: 'Rapid Chat, Voice Mode, Fast Q&A',
        badge: 'Fast Flash',
      },
      {
        id: 'mistralai/mistral-large-2-instruct',
        name: 'Mistral Large 2',
        provider: 'nvidia',
        description: '123B parameter flagship model from Mistral AI with superior multilingual mastery',
        contextWindow: '128k tokens',
        category: 'general',
        recommendedFor: 'Multilingual Tasks, Reasoning, Writing',
        badge: 'Mistral Large',
      },
    ],
  },
];

export function getModelById(modelId: string): AIModel | undefined {
  for (const provider of PROVIDERS) {
    const found = provider.models.find((m) => m.id === modelId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Intelligent Model Router
 * Automatically determines the optimal Provider and Model based on prompt intent,
 * file length, and attachment types according to user spec.
 */
export function autoRouteModel(
  prompt: string,
  hasImages: boolean = false,
  fileLength: number = 0,
  manualProvider?: ProviderId,
  manualModelId?: string
): { provider: ProviderId; model: AIModel; reason: string } {
  // If user explicitly overrode model, respect choice
  if (manualModelId) {
    const model = getModelById(manualModelId);
    if (model) {
      return {
        provider: manualProvider || model.provider,
        model,
        reason: 'User manual selection override',
      };
    }
  }

  const lower = prompt.toLowerCase().trim();

  // 1. Vision Intent -> Llama 3.2 90B Vision (NVIDIA)
  if (hasImages || lower.includes('image') || lower.includes('picture') || lower.includes('photo') || lower.includes('screenshot') || lower.includes('ui mockup')) {
    const visionModel = getModelById('meta/llama-3.2-90b-vision-instruct')!;
    return {
      provider: 'nvidia',
      model: visionModel,
      reason: 'Routed to Llama 3.2 90B Vision for image & visual analysis',
    };
  }

  // 2. Coding / Technical Reasoning -> Llama 3.1 70B (NVIDIA)
  const codeKeywords = [
    'code', 'function', 'bug', 'typescript', 'javascript', 'react', 'python',
    'sql', 'html', 'css', 'api', 'refactor', 'error', 'component', 'script',
    'algorithm', 'terminal', 'command', 'npm', 'git', 'fix', 'build'
  ];
  if (codeKeywords.some((kw) => lower.includes(kw))) {
    const codeModel = getModelById('meta/llama-3.1-70b-instruct') || getModelById('meta/llama-3.3-70b-instruct')!;
    return {
      provider: 'nvidia',
      model: codeModel,
      reason: 'Routed to Llama 3.1 70B for code generation & software engineering',
    };
  }

  // 3. Long Context / Massive Document Analysis -> Nemotron Super 49B (NVIDIA)
  if (fileLength > 10000 || lower.includes('pdf') || lower.includes('document') || lower.includes('full repo') || lower.includes('audit whole project')) {
    const longContextModel = getModelById('nvidia/llama-3.3-nemotron-super-49b-v1.5') || getModelById('meta/llama-3.3-70b-instruct')!;
    return {
      provider: 'nvidia',
      model: longContextModel,
      reason: 'Routed to Nemotron Super 49B for large context analysis',
    };
  }

  // 4. Greeting / Casual Q&A -> Llama 3.1 8B (NVIDIA)
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'who are you', 'what can you do', 'good morning', 'good evening', 'help'];
  if (greetings.some((g) => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + ','))) {
    const greetingModel = getModelById('meta/llama-3.1-8b-instruct')!;
    return {
      provider: 'nvidia',
      model: greetingModel,
      reason: 'Routed to Llama 3.1 8B for ultra-fast instant response',
    };
  }

  // Default to GPT-4o / Llama 3.3 70B
  const defaultModel = getModelById('gpt-4o') || getModelById('meta/llama-3.3-70b-instruct') || getModelById('gemini-2.5-flash')!;
  return {
    provider: defaultModel.provider,
    model: defaultModel,
    reason: 'Routed to default high-intelligence assistant engine',
  };
}
