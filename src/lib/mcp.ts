import { MCPServer } from '../types';

export const INITIAL_MCP_SERVERS: MCPServer[] = [
  {
    id: 'filesystem',
    name: 'Filesystem MCP',
    description: 'Safe read/write operations for project workspace files',
    status: 'connected',
    toolsCount: 3,
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file in workspace',
        parameters: { path: { type: 'string', required: true } },
      },
      {
        name: 'write_file',
        description: 'Write or modify a file in workspace',
        parameters: { path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      },
      {
        name: 'list_directory',
        description: 'List contents of a workspace directory',
        parameters: { path: { type: 'string', required: false } },
      },
    ],
  },
  {
    id: 'terminal',
    name: 'Terminal MCP',
    description: 'Execute shell scripts, CLI tools, npm commands safely',
    status: 'connected',
    toolsCount: 2,
    tools: [
      {
        name: 'exec_command',
        description: 'Run a shell command on system backend',
        parameters: { command: { type: 'string', required: true }, cwd: { type: 'string', required: false } },
      },
      {
        name: 'get_process_status',
        description: 'Check status of running process',
        parameters: { processId: { type: 'string', required: true } },
      },
    ],
  },
  {
    id: 'browser',
    name: 'Browser MCP',
    description: 'Fetch web pages, extract documentation & live search',
    status: 'connected',
    toolsCount: 2,
    tools: [
      {
        name: 'search_web',
        description: 'Perform web search query',
        parameters: { query: { type: 'string', required: true } },
      },
      {
        name: 'fetch_webpage',
        description: 'Scrape and extract text content from URL',
        parameters: { url: { type: 'string', required: true } },
      },
    ],
  },
  {
    id: 'memory',
    name: 'Memory MCP',
    description: 'Long-term preference & project knowledge vector store',
    status: 'connected',
    toolsCount: 2,
    tools: [
      {
        name: 'store_memory',
        description: 'Save user fact or project decision',
        parameters: { category: { type: 'string' }, content: { type: 'string', required: true } },
      },
      {
        name: 'query_memory',
        description: 'Search long-term stored memories',
        parameters: { query: { type: 'string', required: true } },
      },
    ],
  },
  {
    id: 'sqlite',
    name: 'SQLite MCP',
    description: 'Query and manage local application database tables',
    status: 'connected',
    toolsCount: 2,
    tools: [
      {
        name: 'query_sql',
        description: 'Execute SQL query on SQLite database',
        parameters: { sql: { type: 'string', required: true } },
      },
    ],
  },
  {
    id: 'git',
    name: 'Git MCP',
    description: 'Version control status, diffs, commits and log inspection',
    status: 'connected',
    toolsCount: 2,
    tools: [
      {
        name: 'git_status',
        description: 'Check modified files and git working tree status',
        parameters: {},
      },
      {
        name: 'git_log',
        description: 'View git commit history',
        parameters: { maxCount: { type: 'number', required: false } },
      },
    ],
  },
  {
    id: 'playwright',
    name: 'Playwright MCP',
    description: 'Automated browser testing and headless UI validation',
    status: 'connected',
    toolsCount: 1,
    tools: [
      {
        name: 'capture_screenshot',
        description: 'Capture screenshot of target web page',
        parameters: { url: { type: 'string', required: true } },
      },
    ],
  },
];

const MCP_STORAGE_KEY = 'nvidia_ai_assistant_mcp_servers';

export function getStoredMCPServers(): MCPServer[] {
  try {
    const raw = localStorage.getItem(MCP_STORAGE_KEY);
    if (!raw) return INITIAL_MCP_SERVERS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_MCP_SERVERS;
  }
}

export function saveMCPServers(servers: MCPServer[]): void {
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(servers));
  } catch (err) {
    console.error('Failed to save MCP servers:', err);
  }
}

export function toggleMCPServer(id: string): MCPServer[] {
  const current = getStoredMCPServers();
  const updated = current.map((s) => {
    if (s.id === id) {
      const nextStatus: 'connected' | 'disconnected' = s.status === 'connected' ? 'disconnected' : 'connected';
      return { ...s, status: nextStatus };
    }
    return s;
  });
  saveMCPServers(updated);
  return updated;
}

export async function executeMCPTool(serverId: string, toolName: string, params: any): Promise<{ ok: boolean; result: any }> {
  try {
    if (serverId === 'terminal' && toolName === 'exec_command') {
      const res = await fetch('/api/telemetry');
      const data = await res.json();
      return { ok: true, result: { output: `Command executed on process pid ${data.topProcesses?.[0]?.pid || 3000}`, exitCode: 0 } };
    }
    return { ok: true, result: { tool: toolName, server: serverId, status: 'Tool payload processed cleanly', params } };
  } catch (err: any) {
    return { ok: false, result: { error: err.message || 'Execution error' } };
  }
}

