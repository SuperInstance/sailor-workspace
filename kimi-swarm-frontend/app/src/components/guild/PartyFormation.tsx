import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, BookOpen, Map, Hammer, ShieldCheck, Users, FlaskConical } from 'lucide-react';
import type { PartyPreset, AgentType } from '@/lib/agents';
import { AGENT_TYPES } from '@/lib/agents';

const iconMap: Record<string, React.ElementType> = {
  scholar: BookOpen, scout: Map, builder: Hammer,
  critic: ShieldCheck, commander: Users, alchemist: FlaskConical,
};

interface PartyFormationProps {
  presets: PartyPreset[];
}

export default function PartyFormation({ presets }: PartyFormationProps) {
  const [activeParty, setActiveParty] = useState<(string | null)[]>([null, null, null]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [poolAgents] = useState(() =>
    AGENT_TYPES.flatMap(at =>
      Array.from({ length: 2 }, (_, i) => `${at.id}-${i + 1}`)
    )
  );
  const [draggedAgent, setDraggedAgent] = useState<string | null>(null);

  const applyPreset = (preset: PartyPreset) => {
    setSelectedPreset(preset.id);
    setActiveParty([...preset.agents.slice(0, 3), ...Array(3 - preset.agents.length).fill(null)]);
  };

  const handleDragStart = (agent: string) => {
    setDraggedAgent(agent);
  };

  const handleDrop = (slotIndex: number) => {
    if (draggedAgent) {
      const newParty = [...activeParty];
      newParty[slotIndex] = draggedAgent;
      setActiveParty(newParty);
      setDraggedAgent(null);
    }
  };

  const getAgentTypeInfo = (agentId: string): AgentType | undefined => {
    const typeId = agentId.split('-')[0];
    return AGENT_TYPES.find(a => a.id === typeId);
  };

  // Calculate synergies
  const synergies: string[] = [];
  const presentTypes = activeParty.filter(Boolean).map(a => a!.split('-')[0]);
  if (presentTypes.includes('builder') && presentTypes.includes('scout')) synergies.push('+15% scaffolding speed');
  if (presentTypes.includes('scholar') && presentTypes.includes('critic')) synergies.push('+10% review thoroughness');
  if (presentTypes.includes('builder') && presentTypes.includes('alchemist')) synergies.push('+12% refactoring efficiency');
  if (presentTypes.includes('commander')) synergies.push('+8% fleet coordination');

  return (
    <div className="space-y-8">
      {/* Presets */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {presets.map(preset => (
          <motion.button
            key={preset.id}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => applyPreset(preset)}
            className={`flex-shrink-0 w-52 p-4 rounded-xl border text-left transition-all ${
              selectedPreset === preset.id
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-void-600 bg-void-800 hover:border-amber-400/50'
            }`}
          >
            <h4 className="text-sm font-semibold text-void-100 mb-2">{preset.name}</h4>
            <div className="flex -space-x-2 mb-2">
              {preset.agents.slice(0, 3).map((typeId, i) => {
                const at = AGENT_TYPES.find(a => a.id === typeId);
                const Icon = iconMap[typeId] || Users;
                return (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-void-800"
                    style={{ background: `${at?.color}30` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: at?.color }} />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-void-400 mb-2 line-clamp-2">{preset.description}</p>
            <span className="text-[10px] text-quest-green font-medium">{preset.synergy}</span>
          </motion.button>
        ))}
      </div>

      {/* Active Party */}
      <div className="flex flex-col items-center">
        <h4 className="text-sm font-semibold text-void-300 mb-4">Active Party</h4>
        <div className="flex items-center gap-6">
          {[0, 1, 2].map(slotIndex => {
            const agent = activeParty[slotIndex];
            const typeInfo = agent ? getAgentTypeInfo(agent) : null;
            const Icon = agent ? (iconMap[agent.split('-')[0]] || Users) : null;
            return (
              <motion.div
                key={slotIndex}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => { e.preventDefault(); handleDrop(slotIndex); }}
                whileHover={{ scale: 1.05 }}
                className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                  agent
                    ? 'border-solid'
                    : 'border-void-600 hover:border-amber-400/50'
                }`}
                style={agent && typeInfo ? {
                  borderColor: typeInfo.color,
                  background: `${typeInfo.color}15`,
                  borderStyle: 'solid',
                } : {}}
              >
                {agent && typeInfo && Icon ? (
                  <>
                    <Icon className="w-8 h-8 mb-1" style={{ color: typeInfo.color }} />
                    <span className="text-[10px] text-void-200 font-medium">{agent}</span>
                  </>
                ) : (
                  <span className="text-void-600 text-2xl font-light">+</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Synergy display */}
        {synergies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-4"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">{synergies.join(', ')}</span>
          </motion.div>
        )}
      </div>

      {/* Agent Pool */}
      <div>
        <h4 className="text-sm font-semibold text-void-300 mb-3">Available Agents (drag to party)</h4>
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
          {poolAgents.map(agent => {
            const typeInfo = getAgentTypeInfo(agent);
            const Icon = iconMap[agent.split('-')[0]] || Users;
            const isInParty = activeParty.includes(agent);
            return (
              <motion.div
                key={agent}
                draggable
                onDragStart={() => handleDragStart(agent)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 cursor-grab active:cursor-grabbing transition-all ${
                  isInParty ? 'opacity-40' : ''
                }`}
                style={{
                  borderColor: typeInfo?.color || '#3A3A50',
                  background: `${typeInfo?.color}20`,
                }}
                title={agent}
              >
                <Icon className="w-5 h-5" style={{ color: typeInfo?.color }} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
