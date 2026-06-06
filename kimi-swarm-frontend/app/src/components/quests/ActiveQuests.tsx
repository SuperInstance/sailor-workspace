import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Hammer, Shield, Check, Minus, Lock,
  Eye, Clock, Zap, X, Focus
} from 'lucide-react';
import type { Quest } from '@/lib/quests';
import { RARITY_COLORS, activeQuests as initialActiveQuests } from '@/lib/quests';

const iconMap: Record<string, React.ElementType> = {
  'map-pin': MapPin, hammer: Hammer, shield: Shield,
  eye: Eye, clock: Clock, zap: Zap,
};

function getIcon(iconName: string) {
  return iconMap[iconName] ?? MapPin;
}

function ObjectiveItem({ obj, questColor }: { obj: Quest['objectives'][0]; questColor: string }) {
  if (obj.locked) {
    return (
      <div className="flex items-center gap-2 text-[#3A3A50]">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs line-through">{obj.label}</span>
      </div>
    );
  }
  if (obj.completed) {
    return (
      <div className="flex items-center gap-2 text-quest-green">
        <Check className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs line-through text-[#5A5A78]">{obj.label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Minus className="w-3.5 h-3.5 shrink-0" style={{ color: questColor }} />
      <span className="text-xs text-[#B8B8D0]">{obj.label}</span>
    </div>
  );
}

function QuestProgressBar({ quest }: { quest: Quest }) {
  const completed = quest.objectives.filter(o => o.completed).length;
  const total = quest.objectives.length;
  const pct = Math.round((completed / total) * 100);
  const color = RARITY_COLORS[quest.rarity];

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#5A5A78] uppercase tracking-wider">{completed}/{total} objectives</span>
        <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#252536] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
        />
      </div>
    </div>
  );
}

function ActiveQuestCard({ quest, index, onAbandon, onFocus }: {
  quest: Quest;
  index: number;
  onAbandon: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  const Icon = getIcon(quest.icon);
  const borderColor = RARITY_COLORS[quest.rarity];
  const completedCount = quest.objectives.filter(o => o.completed).length;
  const totalCount = quest.objectives.length;
  const isComplete = completedCount === totalCount;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.15,
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
      className="relative rounded-xl p-5 flex flex-col min-h-[280px]"
      style={{
        background: '#12121A',
        borderLeft: `4px solid ${isComplete ? '#4ADE80' : borderColor}`,
        border: `1px solid #252536`,
        borderLeftWidth: 4,
      }}
    >
      {/* Rarity badge */}
      <div
        className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: `${borderColor}15`,
          color: borderColor,
          border: `1px solid ${borderColor}30`,
        }}
      >
        {quest.rarity}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${borderColor}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: borderColor }} />
        </div>
        <h3 className="font-display font-semibold text-base text-[#E8E8F0] pr-16 leading-tight">
          {quest.title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-[#8A8AA8] line-clamp-2 mb-3">{quest.description}</p>

      {/* Objectives */}
      <div className="flex flex-col gap-1.5 mb-auto">
        {quest.objectives.slice(0, 3).map(obj => (
          <ObjectiveItem key={obj.id} obj={obj} questColor={borderColor} />
        ))}
        {quest.objectives.length > 3 && (
          <span className="text-[10px] text-[#3A3A50] pl-5.5">
            +{quest.objectives.length - 3} more
          </span>
        )}
      </div>

      {/* Progress */}
      <QuestProgressBar quest={quest} />

      {/* Footer: Reward + Time */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#252536]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20">
            +{quest.xpReward} XP
          </span>
          {quest.tileReward && (
            <span className="text-[10px] text-[#5A5A78]">+ {quest.tileReward}</span>
          )}
        </div>
        {quest.timeRemaining && (
          <div className="flex items-center gap-1 text-[#5A5A78]">
            <Clock className="w-3 h-3" />
            <span className="text-[10px]">{quest.timeRemaining}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onFocus(quest.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
        >
          <Focus className="w-3 h-3" />
          Focus
        </button>
        <button
          onClick={() => onAbandon(quest.id)}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5A5A78] border border-[#252536] hover:text-critic-red hover:border-critic-red/30 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

export default function ActiveQuests() {
  const [quests, setQuests] = useState<Quest[]>(initialActiveQuests);

  const handleAbandon = (id: string) => {
    setQuests(prev => prev.filter(q => q.id !== id));
  };

  const handleFocus = (id: string) => {
    // In a real app, this would pin the quest
    console.log('Focus quest:', id);
  };

  return (
    <section style={{ background: '#0A0A0F' }} className="py-12">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <h2 className="font-display font-semibold text-[#E8E8F0]" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
              Active Quests
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
              {quests.length} active
            </span>
          </div>
          <button className="text-sm text-amber-400 hover:underline transition-all">
            View All &rarr;
          </button>
        </motion.div>

        {/* Active Quest Cards */}
        <AnimatePresence>
          {quests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quests.map((quest, i) => (
                <ActiveQuestCard
                  key={quest.id}
                  quest={quest}
                  index={i}
                  onAbandon={handleAbandon}
                  onFocus={handleFocus}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-[#5A5A78]"
            >
              <p className="font-ui">No active quests. Visit the Quest Boards to accept new challenges!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
