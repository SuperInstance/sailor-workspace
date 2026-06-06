import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Command } from 'lucide-react';
import type { Agent } from '@/lib/agents';
import { AGENT_COLORS } from '@/lib/agents';

interface ActiveAgentsPanelProps {
  agents: Agent[];
}

const agentIconMap: Record<string, React.ReactNode> = {
  Scholar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Scout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  Builder: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Critic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Commander: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Alchemist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v8L5 19h14l-5-9V2" /><path d="M8 19v3h8v-3" />
    </svg>
  ),
};

function AgentEntry({ agent, index }: { agent: Agent; index: number }) {
  const [hovered, setHovered] = useState(false);
  const color = AGENT_COLORS[agent.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-3 p-3 rounded-lg bg-[#1A1A26] border border-transparent hover:border-[#252536] transition-colors"
    >
      {/* Dismiss button */}
      <AnimatePresence>
        {hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1.5 right-1.5 p-0.5 rounded text-[#5A5A78] hover:text-[#D94A4A] hover:bg-[#D94A4A]/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
        style={{ borderColor: color, backgroundColor: `${color}15` }}
      >
        <div style={{ color }}>{agentIconMap[agent.type]}</div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#E8E8F0] truncate">{agent.name}</span>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: agent.status === 'active' ? '#4ADE80' : agent.status === 'idle' ? '#F5CB4E' : '#EF4444',
            }}
          />
        </div>
        <p className="text-xs text-[#5A5A78] truncate">{agent.task}</p>
        <p className="text-xs truncate" style={{ color }}>in {agent.room}</p>
      </div>

      {/* Progress bar */}
      {agent.progress !== undefined && (
        <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#252536] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${agent.progress}%` }}
            transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function ActiveAgentsPanel({ agents }: ActiveAgentsPanelProps) {
  return (
    <div className="w-full h-full bg-[#12121A] border-l border-[#252536] flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#252536]">
        <h2 className="font-display font-semibold text-lg text-[#E8E8F0]">Active Agents</h2>
        <button className="w-7 h-7 rounded-lg bg-[#1A1A26] flex items-center justify-center text-[#8A8AA8] hover:text-[#F5CB4E] hover:bg-[#C99A10]/10 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.map((agent, i) => (
          <AgentEntry key={agent.id} agent={agent} index={i} />
        ))}

        {/* Summon Button */}
        <button className="w-full py-3 rounded-lg border border-dashed border-[#252536] text-[#5A5A78] text-sm font-medium hover:border-[#E8B820] hover:text-[#F5CB4E] transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Summon New Agent
        </button>
      </div>

      {/* Fleet Command Input */}
      <div className="p-3 border-t border-[#252536]">
        <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-[#1A1A26] border border-[#252536]">
          <Command className="w-3.5 h-3.5 text-[#5A5A78]" />
          <input
            type="text"
            placeholder="Command fleet..."
            className="flex-1 bg-transparent text-sm text-[#E8E8F0] placeholder:text-[#3A3A50] focus:outline-none font-mono"
          />
        </div>
      </div>
    </div>
  );
}
