export type ProviderId = 'nvidia' | 'gemini' | 'openai';

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  contextWindow: string;
  category: 'greeting' | 'coding' | 'vision' | 'long-context' | 'general';
  recommendedFor: string;
  badge?: string;
  isDefault?: boolean;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  icon: string;
  description: string;
  models: AIModel[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelUsed?: string;
  providerUsed?: ProviderId;
  latencyMs?: number;
  tokensPerSec?: number;
  thinking?: string;
  thinkingTimeMs?: number;
  attachments?: {
    id: string;
    name: string;
    type: 'image' | 'file' | 'code';
    url: string;
    size?: number;
  }[];
  branchParentId?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  pinned?: boolean;
  tags?: string[];
  systemPrompt?: string;
  activeProvider?: ProviderId;
  activeModelId?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'error';
  color: string;
  tools: string[];
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  task: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  durationMs?: number;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  trigger: string;
  steps: WorkflowStep[];
  status: 'idle' | 'running' | 'completed' | 'error';
  createdAt: number;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  toolsCount: number;
  tools: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[];
}

export interface VirtualFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  size?: number;
  updatedAt: number;
  language?: string;
  children?: VirtualFile[];
}

export interface TerminalTab {
  id: string;
  title: string;
  shell: 'powershell' | 'cmd' | 'bash';
  cwd: string;
  history: { id: string; command: string; output: string; timestamp: number; exitCode?: number }[];
  isRunning: boolean;
}

export interface MemoryFact {
  id: string;
  category: 'preference' | 'project' | 'fact' | 'instruction';
  content: string;
  createdAt: number;
  source?: string;
}

export interface TelemetryData {
  cpuUsage: number;
  cpuCores?: number;
  cpuModel?: string;
  osPlatform?: string;
  detectedSource?: string;
  ramUsageGb: number;
  ramTotalGb: number;
  gpuUsage: number;
  gpuTempC: number;
  vramUsageGb: number;
  vramTotalGb: number;
  batteryPercent: number;
  isCharging: boolean;
  activeProcessesCount: number;
  networkUploadKbps: number;
  networkDownloadKbps: number;
  topProcesses: { pid: number; name: string; cpu: number; memoryMb: number }[];
  eventLogs: { id: string; level: 'info' | 'warning' | 'error'; message: string; timestamp: number }[];
}

export interface AutomationTask {
  id: string;
  title: string;
  type: 'youtube' | 'browser' | 'app_launch' | 'script' | 'form';
  target: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: number;
}

export interface PluginExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  category: 'workspace' | 'media' | 'developer' | 'system' | 'ai';
  permissions: string[];
}

export interface ProductivityItem {
  id: string;
  title: string;
  type: 'reminder' | 'note' | 'timer' | 'task' | 'clipboard';
  content: string;
  timestamp: number;
  completed?: boolean;
  dueDate?: number;
}

export interface UserSettings {
  nvidiaApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  terminalAuthToken?: string;
  defaultProvider: ProviderId;
  autoRouterEnabled: boolean;
  selectedModelOverride?: string;
  language?: 'ta-IN' | 'en-US';
  theme: 'dark' | 'light' | 'midnight' | 'cyberpunk';
  voiceVoice: string;
  voiceSpeed: number;
  voicePitch: number;
  soundEffects: boolean;
  autoScroll: boolean;
  codeHighlightTheme: string;
  mcpEnabled: boolean;
  webSearchEnabled: boolean;
  rememberWindowBounds: boolean;
  windowBounds?: { x: number; y: number; width: number; height: number };
}
