import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Map, Hammer, ShieldCheck, Users, FlaskConical } from 'lucide-react';
import type { AgentType } from '@/lib/agents';

interface ArmorCardProps {
  agent: AgentType;
  index: number;
  onSummon: (agent: AgentType) => void;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}

const iconMap: Record<string, React.ElementType> = {
  scholar: BookOpen,
  scout: Map,
  builder: Hammer,
  critic: ShieldCheck,
  commander: Users,
  alchemist: FlaskConical,
};

export default function ArmorCard({ agent, index, onSummon, dimmed, onHover }: ArmorCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const AgentIcon = iconMap[agent.id] || Users;
  const statKeys = ['code', 'review', 'speed', 'creativity'] as const;
  const statLabels = ['Code', 'Review', 'Speed', 'Creativity'];
  const statColors = ['#60A5FA', '#EF4444', '#4ADE80', '#A78BFA'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: dimmed ? 0.5 : 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.7, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      onMouseEnter={() => onHover(agent.id)}
      onMouseLeave={() => onHover(null)}
      className="group relative rounded-xl overflow-hidden border transition-all duration-300 hover:-translate-y-2"
      style={{
        background: '#12121A',
        borderColor: `${agent.color}40`,
        boxShadow: dimmed ? 'none' : `0 4px 20px ${agent.color}15`,
      }}
    >
      {/* Top: Agent illustration */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={agent.image}
          alt={agent.name}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${agent.color}20` }}>
            <AgentIcon className="w-16 h-16" style={{ color: agent.color, opacity: 0.5 }} />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to bottom, transparent 40%, #12121A 100%)` }}
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle at 50% 30%, ${agent.color}30 0%, transparent 60%)` }}
        />
      </div>

      {/* Color bar */}
      <div className="h-1 w-full" style={{ background: agent.color }} />

      {/* Bottom: Content */}
      <div className="p-5">
        <h3 className="font-display text-xl font-semibold text-void-100 mb-1">{agent.name}</h3>
        <span
          className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-3"
          style={{ background: `${agent.color}20`, color: agent.color }}
        >
          {agent.title}
        </span>
        <p className="text-void-300 text-sm leading-relaxed mb-4 line-clamp-3">{agent.description}</p>

        {/* Abilities */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.abilities.map(ability => (
            <span key={ability} className="flex items-center gap-1 text-xs text-void-200 bg-void-700/60 px-2 py-1 rounded-md">
              <Sparkles className="w-3 h-3" style={{ color: agent.color }} />
              {ability}
            </span>
          ))}
        </div>

        {/* Mini stat bars */}
        <div className="space-y-1.5 mb-4">
          {statKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-void-400 w-16 uppercase tracking-wider">{statLabels[i]}</span>
              <div className="flex-1 h-1.5 bg-void-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(agent.stats[key] / 5) * 100}%` }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: statColors[i] }}
                />
              </div>
              <span className="text-[10px] text-void-400 w-3">{agent.stats[key]}</span>
            </div>
          ))}
        </div>

        {/* Summon button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSummon(agent)}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border"
          style={{
            borderColor: agent.color,
            color: agent.color,
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = agent.color;
            e.currentTarget.style.color = '#0A0A0F';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = agent.color;
          }}
        >
          Summon {agent.id.charAt(0).toUpperCase() + agent.id.slice(1)}
        </motion.button>
      </div>
    </motion.div>
  );
}
