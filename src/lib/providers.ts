import { AIModel, ProviderId, ProviderInfo } from '../types';

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: 'Cpu',
    description: 'High-performance GPU accelerated AI inference microservices',
    models: [
      {
        id: 'minimaxai/minimax-m3',
        name: 'MiniMax M3 (Fastest)',
        provider: 'nvidia',
        description: 'Ultra-fast high-speed general intelligence & coding microservice',
        contextWindow: '32k tokens',
        category: 'general',
        recommendedFor: 'Ultra Fast Chat, Coding, System Automation',
        badge: 'MiniMax M3 ⚡',
        isDefault: true,
      },
      {
        id: 'thinkingmachines/inkling',
        name: 'Thinking Machines Inkling',
        provider: 'nvidia',
        description: 'Sub-second ultra-fast reasoning and instant query resolution',
        contextWindow: '32k tokens',
        category: 'general',
        recommendedFor: 'Instant Q&A, Sub-Second Responses, Reasoning',
        badge: 'Inkling Fast ⚡',
      },
      {
        id: 'deepseek-ai/deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        provider: 'nvidia',
        description: 'DeepSeek high-effort reasoning & deep thinking algorithm for logic & math',
        contextWindow: '64k tokens',
        category: 'coding',
        recommendedFor: 'Deep Reasoning, Mathematics, Architecture',
        badge: 'DeepSeek V4',
      },
      {
        id: 'z-ai/glm-5.2',
        name: 'GLM 5.2 (Z-AI)',
        provider: 'nvidia',
        description: 'Advanced instruction following & multilingual task execution model',
        contextWindow: '64k tokens',
        category: 'general',
        recommendedFor: 'General Intelligence, Multilingual, Analysis',
        badge: 'GLM 5.2',
      },
      {
        id: 'moonshotai/kimi-k2.6',
        name: 'Kimi K2.6 (Moonshot)',
        provider: 'nvidia',
        description: 'Long-context reasoning & document retrieval microservice',
        contextWindow: '128k tokens',
        category: 'long-context',
        recommendedFor: 'Long Context, Document Analysis, RAG',
        badge: 'Kimi K2.6',
      },
      {
        id: 'meta/llama-3.3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'nvidia',
        description: 'Flagship 70B reasoning powerhouse for general intelligence, complex analysis & system control',
        contextWindow: '128k tokens',
        category: 'general',
        recommendedFor: 'System Control, High Effort Reasoning, General Chat',
        badge: 'Llama 3.3 70B',
      },
      {
        id: 'meta/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        provider: 'nvidia',
        description: 'High-speed 70B model for code generation, mathematics, and complex reasoning',
        contextWindow: '128k tokens',
        category: 'coding',
        recommendedFor: 'Deep Reasoning, Mathematics, Complex Algorithms',
        badge: 'Llama 3.1 70B',
      },
      {
        id: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
        name: 'Nemotron Super 49B',
        provider: 'nvidia',
        description: 'NVIDIA optimized instruction-following model for complex workflows',
        contextWindow: '128k tokens',
        category: 'long-context',
        recommendedFor: 'Enterprise Workflows, Detailed Drafting, RAG',
        badge: 'Nemotron Super',
      },
      {
        id: 'meta/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision',
        provider: 'nvidia',
        description: 'Multimodal vision model for visual UI analysis, OCR, and diagram comprehension',
        contextWindow: '128k tokens',
        category: 'vision',
        recommendedFor: 'UI Inspection, Image Analysis, Visual Charts',
        badge: '90B Vision',
      },
      {
        id: 'meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: 'nvidia',
        description: 'Ultra-fast low-latency assistant for quick queries, greetings, and short tasks',
        contextWindow: '128k tokens',
        category: 'greeting',
        recommendedFor: 'Greetings, Casual Q&A, Rapid Tool Invocation',
        badge: 'Ultra Fast',
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
        id: 'gemini-3.6-flash',
        name: 'Gemini 3.6 Flash',
        provider: 'gemini',
        description: 'Fast, highly capable multimodal model for real-time assistant responses',
        contextWindow: '1M tokens',
        category: 'general',
        recommendedFor: 'General Assistant, Multimodal tasks, Web Search',
        badge: 'Google AI',
        isDefault: true,
      },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        provider: 'gemini',
        description: 'Advanced reasoning and enterprise coding model',
        contextWindow: '2M tokens',
        category: 'coding',
        recommendedFor: 'Enterprise Coding, Deep Analysis, Complex Workflows',
        badge: 'Pro Reasoning',
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

  // Default to Llama 3.1 70B Instruct
  const defaultModel = getModelById('meta/llama-3.1-70b-instruct') || getModelById('meta/llama-3.3-70b-instruct')!;
  return {
    provider: 'nvidia',
    model: defaultModel,
    reason: 'Routed to Llama 3.1 70B Instruct as default high-performance engine',
  };
}
