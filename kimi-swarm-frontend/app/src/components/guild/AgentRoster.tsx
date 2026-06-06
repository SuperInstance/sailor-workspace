import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Pencil, X, BookOpen, Map, Hammer, ShieldCheck, Users, FlaskConical } from 'lucide-react';
import type { SummonedAgent } from '@/lib/agents';
import { getAgentType } from '@/lib/agents';

const iconMap: Record<string, React.ElementType> = {
  scholar: BookOpen, scout: Map, builder: Hammer,
  critic: ShieldCheck, commander: Users, alchemist: FlaskConical,
};

interface AgentRosterProps {
  agents: SummonedAgent[];
  onDismiss: (id: string) => void;
}

type FilterType = 'all' | 'active' | 'idle' | 'error';

export default function AgentRoster({ agents, onDismiss }: AgentRosterProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filtered = agents.filter(a => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (s: string) => {
    if (s === 'active') return '#4ADE80';
    if (s === 'idle') return '#F5CB4E';
    return '#EF4444';
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'idle', 'error'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                filter === f ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-void-400 hover:bg-void-700 border border-transparent'
              }`}
            >
              {f} <span className="text-void-500">({f === 'all' ? agents.length : agents.filter(a => a.status === f).length})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-void-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 h-9 bg-void-800 border border-void-600 rounded-lg pl-9 pr-3 text-sm text-void-200 placeholder-void-500 focus:border-amber-400 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Agent list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((agent, i) => {
            const typeInfo = getAgentType(agent.type);
            const AgentIcon = iconMap[agent.type] || Users;
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                className="group flex items-center gap-3 bg-void-800 border border-void-600 rounded-xl px-4 py-3 hover:bg-void-700 transition-colors duration-200"
              >
                {/* Avatar */}
                <div className="relative">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: typeInfo?.color || '#5A5A78', background: `${typeInfo?.color || '#5A5A78'}20` }}
                  >
                    <AgentIcon className="w-5 h-5" style={{ color: typeInfo?.color }} />
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-void-800 border border-void-600"
                    style={{ color: typeInfo?.color }}
                  >
                    {agent.level}
                  </div>
                </div>

                {/* Name & Type */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-void-100 truncate">{agent.name}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                      style={{ background: `${typeInfo?.color}15`, color: typeInfo?.color }}
                    >
                      {agent.type}
                    </span>
                  </div>
                  <p className="text-xs text-void-400 truncate mt-0.5">{agent.currentTask}</p>
                </div>

                {/* Location */}
                <span className="text-xs font-medium hidden md:block" style={{ color: typeInfo?.color }}>
                  in {agent.location}
                </span>

                {/* Status dot */}
                <div className="w-2 h-2 rounded-full" style={{ background: getStatusColor(agent.status) }} />

                {/* XP bar */}
                <div className="hidden sm:block w-16">
                  <div className="h-1 bg-void-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(agent.xp / agent.maxXp) * 100}%`, background: typeInfo?.color }}
                    />
                  </div>
                </div>

                {/* Actions (on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-md hover:bg-void-600 text-void-400 hover:text-void-200 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-void-600 text-void-400 hover:text-void-200 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDismiss(agent.id)}
                    className="p-1.5 rounded-md hover:bg-critic-red/20 text-void-400 hover:text-critic-red transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-void-500 text-sm">No agents match your criteria</div>
        )}
      </div>
    </div>
  );
}
