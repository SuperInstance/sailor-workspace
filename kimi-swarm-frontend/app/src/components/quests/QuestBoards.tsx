import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Zap, Shield, Star, Trophy, Check,
  Search, Clock, ArrowUpDown
} from 'lucide-react';
import type { Quest, QuestCategory } from '@/lib/quests';
import { quests, questBoardTabs, RARITY_COLORS } from '@/lib/quests';

const tabIcons: Record<string, React.ElementType> = {
  tutorial: BookOpen,
  daily: Zap,
  weekly: Shield,
  mastery: Star,
  epic: Trophy,
};

const sortOptions = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'reward', label: 'Reward' },
  { key: 'time', label: 'Time' },
];

function getDifficultyColor(diff?: string) {
  switch (diff) {
    case 'Easy': return '#4ADE80';
    case 'Medium': return '#F5CB4E';
    case 'Hard': return '#E8913A';
    case 'Very Hard': return '#D94A4A';
    case 'Extreme': return '#A78BFA';
    default: return '#5A5A78';
  }
}

function QuestRow({ quest, index, onAccept, accepted }: {
  quest: Quest;
  index: number;
  onAccept: (id: string) => void;
  accepted: boolean;
}) {
  const rarityColor = RARITY_COLORS[quest.rarity];
  const completed = quest.objectives.filter(o => o.completed).length;
  const total = quest.objectives.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -2, backgroundColor: '#252536' }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
      style={{ background: '#1A1A26' }}
    >
      {/* Icon + rarity dot */}
      <div className="relative shrink-0 self-start mt-0.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${rarityColor}15` }}
        >
          <span className="text-sm font-bold" style={{ color: rarityColor }}>
            {quest.title.charAt(0)}
          </span>
        </div>
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1A1A26]"
          style={{ backgroundColor: rarityColor }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-sm text-[#E8E8F0] truncate">{quest.title}</h4>
          {quest.status === 'in-progress' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
              In Progress
            </span>
          )}
          {quest.status === 'completed' && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-quest-green/10 text-quest-green border border-quest-green/20">
              Completed
            </span>
          )}
        </div>
        <p className="text-xs text-[#5A5A78] truncate mt-0.5">{quest.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {quest.difficulty && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border"
              style={{
                color: getDifficultyColor(quest.difficulty),
                borderColor: `${getDifficultyColor(quest.difficulty)}30`,
                backgroundColor: `${getDifficultyColor(quest.difficulty)}10`,
              }}
            >
              {quest.difficulty}
            </span>
          )}
          {quest.estimatedTime && (
            <span className="text-[10px] text-[#5A5A78] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {quest.estimatedTime}
            </span>
          )}
          {quest.status === 'in-progress' && (
            <span className="text-[10px] text-[#5A5A78]">{completed}/{total}</span>
          )}
        </div>
      </div>

      {/* Right: Reward + Accept */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="text-xs font-semibold text-[#FFD700] block">+{quest.xpReward} XP</span>
          {quest.tileReward && (
            <span className="text-[10px] text-[#5A5A78]">{quest.tileReward}</span>
          )}
        </div>
        {quest.status === 'completed' ? (
          <div className="w-8 h-8 rounded-lg bg-quest-green/10 flex items-center justify-center">
            <Check className="w-4 h-4 text-quest-green" />
          </div>
        ) : quest.status === 'in-progress' || accepted ? (
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-quest-green/10 text-quest-green border border-quest-green/20">
            In Progress
          </span>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAccept(quest.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            Accept
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default function QuestBoards() {
  const [activeTab, setActiveTab] = useState<QuestCategory>('tutorial');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recommended');
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const filteredQuests = quests
    .filter(q => q.category === activeTab)
    .filter(q => {
      if (!search) return true;
      const s = search.toLowerCase();
      return q.title.toLowerCase().includes(s) || q.description.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      switch (sort) {
        case 'reward': return b.xpReward - a.xpReward;
        case 'difficulty': {
          const order = { Easy: 1, Medium: 2, Hard: 3, 'Very Hard': 4, Extreme: 5 };
          return (order[a.difficulty as keyof typeof order] || 0) - (order[b.difficulty as keyof typeof order] || 0);
        }
        default: return 0;
      }
    });

  const handleAccept = (id: string) => {
    setAcceptedIds(prev => new Set(prev).add(id));
  };

  return (
    <section className="relative py-24" style={{ background: '#12121A' }}>
      {/* Subtle quest board background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'url(/quest-board.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-2 block">
            Seek Adventure
          </span>
          <h2 className="font-display font-semibold text-[#E8E8F0] mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Quest Boards
          </h2>
          <p className="text-lg text-[#8A8AA8] max-w-md mx-auto">
            Choose your challenges. Earn rewards. Level up.
          </p>
        </motion.div>

        {/* Board Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {questBoardTabs.map((tab) => {
            const TabIcon = tabIcons[tab.key];
            const isActive = activeTab === tab.key;
            const count = quests.filter(q => q.category === tab.key && q.status === 'available').length;
            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={`
                  relative flex items-center gap-2 px-5 py-3 rounded-xl font-display font-medium text-sm
                  transition-all duration-200 border
                  ${isActive
                    ? 'border-t-[3px]'
                    : 'border-transparent text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
                  }
                `}
                style={isActive ? {
                  backgroundColor: `${tab.color}10`,
                  color: tab.color,
                  borderColor: '#252536',
                  borderTopColor: tab.color,
                } : {}}
              >
                {TabIcon && <TabIcon className="w-4 h-4" />}
                <span>{tab.label}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={isActive ? { backgroundColor: `${tab.color}20`, color: tab.color } : { backgroundColor: '#252536', color: '#5A5A78' }}
                >
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Search + Sort */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A78]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quests..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1A1A26] border border-[#252536] text-sm text-[#B8B8D0] placeholder:text-[#3A3A50] focus:outline-none focus:border-amber-500/30 transition-colors"
            />
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A78]" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl bg-[#1A1A26] border border-[#252536] text-sm text-[#B8B8D0] appearance-none focus:outline-none focus:border-amber-500/30 transition-colors cursor-pointer"
            >
              {sortOptions.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Quest List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {filteredQuests.length > 0 ? (
              filteredQuests.map((quest, i) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  index={i}
                  onAccept={handleAccept}
                  accepted={acceptedIds.has(quest.id)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-[#5A5A78]">
                <p>No quests found matching your search.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
