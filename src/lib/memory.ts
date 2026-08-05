import { MemoryFact, UserSettings } from '../types';

const MEMORY_STORAGE_KEY = 'nvidia_ai_assistant_memory_facts';
const SETTINGS_PRIMARY_KEY = 'nvidia_assistant_settings';
const SETTINGS_ALT_KEY = 'nvidia_ai_assistant_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  nvidiaApiKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  terminalAuthToken: '',
  defaultProvider: 'nvidia',
  autoRouterEnabled: true,
  selectedModelOverride: undefined,
  language: 'en-US',
  theme: 'dark',
  voiceVoice: 'en-US-Neural2-F',
  voiceSpeed: 1.0,
  voicePitch: 0.0,
  soundEffects: true,
  autoScroll: true,
  codeHighlightTheme: 'github-dark',
  mcpEnabled: false,
  webSearchEnabled: true,
  rememberWindowBounds: true,
};

export const INITIAL_FACTS: MemoryFact[] = [
  {
    id: 'f1',
    category: 'preference',
    content: 'Default AI Provider is set to NVIDIA NIM with Llama 3.3 70B & DeepSeek R1 Reasoning.',
    createdAt: Date.now() - 86400000,
    source: 'System Architecture',
  },
  {
    id: 'f2',
    category: 'project',
    content: 'Targeting Cloud Run container environment with Express + Vite on port 3000.',
    createdAt: Date.now() - 43200000,
    source: 'Environment Manifest',
  },
  {
    id: 'f3',
    category: 'instruction',
    content: 'Always provide complete TypeScript code with no placeholders or TODO comments.',
    createdAt: Date.now() - 21600000,
    source: 'Architect Directive',
  },
];

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_PRIMARY_KEY) || localStorage.getItem(SETTINGS_ALT_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed.language && (parsed.selectedLanguage || parsed.sttLang)) {
      parsed.language = parsed.selectedLanguage || parsed.sttLang;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    const jsonStr = JSON.stringify(settings);
    localStorage.setItem(SETTINGS_PRIMARY_KEY, jsonStr);
    localStorage.setItem(SETTINGS_ALT_KEY, jsonStr);
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_PRIMARY_KEY);
    localStorage.removeItem(SETTINGS_ALT_KEY);
  } catch (err) {
    console.error('Failed to clear settings:', err);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const settings = getStoredSettings();
  if ((settings as any).terminalAuthToken) {
    headers['x-terminal-auth'] = (settings as any).terminalAuthToken;
  }
  return headers;
}

export async function getStoredFacts(): Promise<MemoryFact[]> {
  try {
    const res = await fetch('/api/memory', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.facts && Array.isArray(data.facts)) {
      return data.facts;
    }
    return INITIAL_FACTS;
  } catch (err) {
    console.warn('Failed to fetch facts from memory backend, using initial facts fallback:', err);
    return INITIAL_FACTS;
  }
}

export async function addFact(
  category: MemoryFact['category'],
  content: string,
  source?: string
): Promise<MemoryFact> {
  const res = await fetch('/api/memory/save', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ category, content, source: source || 'User Input' }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to save memory fact (${res.status})`);
  }
  const data = await res.json();
  return data.fact;
}

export async function deleteFact(id: string): Promise<void> {
  const res = await fetch('/api/memory/delete', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to delete memory fact (${res.status})`);
  }
}

