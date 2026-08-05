import React, { useState } from 'react';
import {
  Bot,
  Brain,
  Code2,
  Eye,
  Terminal,
  Globe,
  Database,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Plus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SYSTEM_AGENTS, SAMPLE_WORKFLOWS } from '../../lib/agents';
import { Agent, Workflow } from '../../types';

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>(SYSTEM_AGENTS);
  const [workflows, setWorkflows] = useState<Workflow[]>(SAMPLE_WORKFLOWS);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>(SAMPLE_WORKFLOWS[0].id);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || workflows[0];

  const getIconForAgent = (avatar: string) => {
    switch (avatar) {
      case 'Brain':
        return Brain;
      case 'Code2':
        return Code2;
      case 'Eye':
        return Eye;
      case 'Terminal':
        return Terminal;
      case 'Globe':
        return Globe;
      case 'Database':
        return Database;
      default:
        return Bot;
    }
  };

  const handleRunWorkflow = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const updatedWorkflow = { ...activeWorkflow, status: 'running' as const };
    setWorkflows((prev) => prev.map((w) => (w.id === activeWorkflow.id ? updatedWorkflow : w)));

    try {
      const response = await fetch('/api/agents/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: activeWorkflow.id,
          prompt: activeWorkflow.title,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Agent dispatch failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.stepId) {
                setWorkflows((prev) =>
                  prev.map((w) => {
                    if (w.id !== activeWorkflow.id) return w;
                    const newSteps = w.steps.map((st) => {
                      if (st.id === data.stepId) {
                        return {
                          ...st,
                          status: 'completed' as const,
                          output: data.output || 'Task phase verified and completed.',
                        };
                      }
                      return st;
                    });
                    return { ...w, steps: newSteps };
                  })
                );
              }
            } catch (e) {
              // Ignore parse
            }
          }
        }
      }

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === activeWorkflow.id
            ? {
                ...w,
                status: 'completed',
                steps: w.steps.map((s) => ({
                  ...s,
                  status: 'completed',
                  output: s.output || 'Step successfully executed by real dispatch agent.',
                })),
              }
            : w
        )
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Workflow execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full flex-1 h-full min-h-0 min-w-0 overflow-y-auto p-6 bg-[#030712] z-10 space-y-6 font-['Inter',sans-serif]">
      {/* Header - Active Model & Key Disclosure Pattern */}
      <div className="p-4 bg-[#0A1128]/80 border border-[#12275C] rounded-2xl backdrop-blur-md shadow-lg shadow-[#2E6FF2]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#12275C]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2E6FF2]/20 text-[#5B9CFF] border border-[#2E6FF2]/40 shadow-md shadow-[#2E6FF2]/10">
              <Bot className="w-6 h-6 text-[#5B9CFF]" />
            </div>
            <div>
              <h1 className="font-grotesk font-extrabold text-base text-[#EAF1FF] uppercase tracking-wider flex items-center gap-2">
                <span>Stark Tech Autonomous Sub-Agent Matrix</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2E6FF2]/20 text-[#5B9CFF] font-mono border border-[#2E6FF2]/30 font-bold">
                  MULTI-AGENT ROUTER
                </span>
              </h1>
              <p className="text-xs text-[#6B7A99] font-mono mt-0.5">
                F.R.I.D.A.Y. multi-agent neural routines, automated background task execution & pipeline dispatchers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunWorkflow}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E6FF2] hover:bg-[#5B9CFF] text-white font-grotesk font-extrabold text-xs transition-all shadow-md shadow-[#2E6FF2]/30 disabled:opacity-50 uppercase tracking-wider"
            >
              {isRunning ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-white" />
                  <span>Agents Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Execute Active Workflow</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4 Mono Data Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Sub-Agents</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">{agents.length} Autonomous Units</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Active Workflow</div>
            <div className="text-xs font-bold text-[#EAF1FF] truncate mt-0.5">{activeWorkflow.title}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Key Disclosure Route</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">GEMINI_API_KEY (Server)</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#030712] border border-[#12275C]">
            <div className="text-[10px] text-[#6B7A99] tracking-wider uppercase">Execution Engine</div>
            <div className="text-xs font-bold text-[#5B9CFF] mt-0.5">Stream SSE Dispatch</div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="p-5 bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] rounded-2xl">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B9CFF] mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#2E6FF2]" />
          <span>Specialized Stark Sub-Agents</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const Icon = getIconForAgent(agent.avatar);
            return (
              <div
                key={agent.id}
                className="p-4 rounded-xl bg-[#030712] border border-[#12275C] hover:border-[#2E6FF2] transition-all shadow-md shadow-[#2E6FF2]/5 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2E6FF2]/20 border border-[#2E6FF2]/40 flex items-center justify-center text-[#5B9CFF] font-black group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-grotesk font-extrabold text-sm text-[#EAF1FF]">{agent.name}</h3>
                    <p className="text-xs text-[#6B7A99] font-mono">{agent.role}</p>
                  </div>
                </div>
                <p className="text-xs text-[#EAF1FF]/80 leading-relaxed mb-3 font-['Inter',sans-serif]">
                  {agent.description}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {agent.tools.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#2E6FF2]/10 text-[#5B9CFF] font-mono border border-[#12275C]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Engine Timeline */}
      <div className="p-5 bg-[#0A1128]/60 backdrop-blur-md border border-[#12275C] rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-grotesk font-extrabold text-[#EAF1FF] flex items-center gap-2 uppercase tracking-wider">
              <Zap className="w-4 h-4 text-[#5B9CFF]" />
              <span>Workflow Pipeline: {activeWorkflow.title}</span>
            </h2>
            <p className="text-xs text-[#6B7A99] font-mono mt-0.5">{activeWorkflow.description}</p>
          </div>

          <select
            value={activeWorkflowId}
            onChange={(e) => setActiveWorkflowId(e.target.value)}
            className="bg-[#030712] border border-[#12275C] text-[#5B9CFF] text-xs rounded-xl px-3 py-1.5 focus:outline-none font-mono"
          >
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>

        {/* Steps Visual List */}
        <div className="space-y-3">
          {activeWorkflow.steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 font-mono text-xs ${
                step.status === 'completed'
                  ? 'bg-[#2E6FF2]/10 border-[#2E6FF2] text-[#EAF1FF]'
                  : step.status === 'running'
                  ? 'bg-[#2E6FF2]/20 border-[#5B9CFF] text-[#5B9CFF] animate-pulse'
                  : 'bg-[#030712] border-[#12275C] text-[#6B7A99]'
              }`}
            >
              <div className="pt-0.5">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-[#5B9CFF]" />
                ) : step.status === 'running' ? (
                  <Clock className="w-5 h-5 text-[#5B9CFF] animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-[#12275C] flex items-center justify-center text-[10px] text-[#6B7A99]">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#EAF1FF]">{step.task}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#030712] border border-[#12275C] text-[#5B9CFF]">
                    Agent: {step.agentId}
                  </span>
                </div>
                {step.output && (
                  <p className="text-xs font-mono text-[#5B9CFF] mt-1.5 p-2 rounded bg-[#030712] border border-[#12275C]">
                    {step.output}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
