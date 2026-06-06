import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';
import { leaderboardData } from '@/lib/quests';
import type { LeaderboardEntry } from '@/lib/quests';

type TabKey = 'xp' | 'tiles' | 'quests';

const tabs: { key: TabKey; label: string; color: string }[] = [
  { key: 'xp', label: 'Total XP', color: '#FFD700' },
  { key: 'tiles', label: 'Tiles', color: '#4A90D9' },
  { key: 'quests', label: 'Quests', color: '#4ADE80' },
];

const timeFilters = ['This Week', 'This Month', 'All Time'];

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1.5 w-10">
        <Crown className="w-5 h-5 text-[#FFD700]" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1.5 w-10">
        <Medal className="w-5 h-5 text-[#C0C0C0]" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1.5 w-10">
        <Award className="w-5 h-5 text-[#CD7F32]" />
      </div>
    );
  }
  return (
    <span className="w-10 text-center text-sm font-medium text-[#5A5A78]">
      {rank}
    </span>
  );
}

function LeaderboardRow({ entry, index, activeTab }: {
  entry: LeaderboardEntry;
  index: number;
  activeTab: TabKey;
}) {
  const score = activeTab === 'xp' ? entry.totalXp : activeTab === 'tiles' ? entry.tiles : entry.questsCompleted;
  const scoreColor = tabs.find(t => t.key === activeTab)?.color ?? '#FFD700';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index < 3 ? 0.3 + index * 0.1 : index * 0.04,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      }}
      whileHover={{ backgroundColor: '#1A1A26' }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
        ${entry.isCurrentUser ? 'bg-amber-500/5 border-l-[3px] border-amber-400' : ''}
      `}
    >
      <motion.div
        initial={index < 3 ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={index < 3 ? {
          delay: 0.5 + index * 0.1,
          duration: 0.4,
          ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
        } : {}}
      >
        <RankDisplay rank={entry.rank} />
      </motion.div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: entry.isCurrentUser
            ? 'linear-gradient(135deg, #E8B820, #C99A10)'
            : '#1A1A26',
          color: entry.isCurrentUser ? '#0A0A0F' : '#8A8AA8',
          border: entry.isCurrentUser ? '2px solid #E8B820' : '1px solid #252536',
        }}
      >
        {entry.username.charAt(0).toUpperCase()}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${entry.isCurrentUser ? 'text-amber-300' : 'text-[#E8E8F0]'}`}>
            {entry.username}
          </span>
          {entry.isCurrentUser && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
              YOU
            </span>
          )}
        </div>
        <span className="text-[10px] text-[#5A5A78]">Lv.{entry.level}</span>
      </div>

      {/* Score */}
      <span className="text-sm font-semibold shrink-0" style={{ color: scoreColor }}>
        {score.toLocaleString()}
      </span>
    </motion.div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('xp');
  const [timeFilter, setTimeFilter] = useState('All Time');

  const sorted = [...leaderboardData].sort((a, b) => {
    switch (activeTab) {
      case 'tiles': return b.tiles - a.tiles;
      case 'quests': return b.questsCompleted - a.questsCompleted;
      default: return b.totalXp - a.totalXp;
    }
  });

  // Reassign ranks after sort
  const ranked = sorted.map((entry, i) => ({ ...entry, rank: i + 1 }));
  const currentUser = ranked.find(r => r.isCurrentUser);

  return (
    <section className="relative py-24" style={{ background: '#12121A' }}>
      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'url(/bg-noise.png)',
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative max-w-[800px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-2 block">
            Fleet Rankings
          </span>
          <h2 className="font-display font-semibold text-[#E8E8F0]" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Leaderboard
          </h2>
        </motion.div>

        {/* Time Filter */}
        <div className="flex justify-center gap-1 mb-6">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${timeFilter === filter
                  ? 'bg-[#1A1A26] text-[#E8E8F0] border border-[#252536]'
                  : 'text-[#5A5A78] hover:text-[#8A8AA8]'
                }
              `}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`
                  px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border
                  ${isActive
                    ? 'text-void-900 border-transparent'
                    : 'text-[#5A5A78] border-transparent hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
                  }
                `}
                style={isActive ? {
                  backgroundColor: tab.color,
                  boxShadow: `0 0 20px ${tab.color}30`,
                } : {}}
              >
                {tab.label}
              </motion.button>
            );
          })}
        </div>

        {/* Leaderboard List */}
        <div className="flex flex-col gap-1">
          {ranked.map((entry, i) => (
            <LeaderboardRow key={entry.username} entry={entry} index={i} activeTab={activeTab} />
          ))}
        </div>

        {/* Your Ranking */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-6 border-t border-[#252536]"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <span className="text-sm text-amber-300 font-medium w-10 text-center">
                #{currentUser.rank}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #E8B820, #C99A10)',
                  color: '#0A0A0F',
                }}
              >
                {currentUser.username.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-amber-300">{currentUser.username}</span>
                <span className="text-[10px] text-[#5A5A78] ml-2">Lv.{currentUser.level}</span>
              </div>
              <span className="text-sm font-semibold text-amber-300">
                {activeTab === 'xp'
                  ? currentUser.totalXp.toLocaleString()
                  : activeTab === 'tiles'
                  ? currentUser.tiles.toLocaleString()
                  : currentUser.questsCompleted.toLocaleString()}
              </span>
            </div>
            {currentUser.rank > 1 && (
              <p className="text-center text-xs text-[#5A5A78] mt-2">
                {currentUser.rank - 1} positions behind {ranked[currentUser.rank - 2]?.username}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}
