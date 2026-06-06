import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Footprints, Zap, Crown, Trophy, Star, Flame, Moon,
  BookOpen, Gem, Compass, Map, Globe, CheckCircle, Bug,
  Shield, Anchor, Scale, UserPlus, Heart, Archive, Glasses,
  FlaskConical, Beaker, Atom, Hammer, Palette, Castle, Network,
  Award, Calendar, Users, GraduationCap, Layout, PenTool,
  Code, Blocks
} from 'lucide-react';
import type { Achievement } from '@/lib/quests';
import { achievements, achievementCategories, RARITY_COLORS } from '@/lib/quests';

const iconMap: Record<string, React.ElementType> = {
  footprints: Footprints, zap: Zap, crown: Crown, trophy: Trophy,
  star: Star, flame: Flame, moon: Moon, 'book-open': BookOpen,
  gem: Gem, compass: Compass, map: Map, globe: Globe,
  'check-circle': CheckCircle, bug: Bug, shield: Shield,
  anchor: Anchor, scale: Scale, 'user-plus': UserPlus,
  heart: Heart, archive: Archive, glasses: Glasses,
  flask: FlaskConical, beaker: Beaker, atom: Atom,
  hammer: Hammer, palette: Palette, castle: Castle,
  network: Network, award: Award, calendar: Calendar,
  users: Users, 'graduation-cap': GraduationCap,
  layout: Layout, 'pen-tool': PenTool, code: Code,
  blocks: Blocks, 'book': BookOpen,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] ?? Star;
}

const categoryIcons: Record<string, string> = {
  explorer: '#5BBD76', coder: '#4A90D9', architect: '#E8913A',
  sage: '#9B6DD1', commander: '#D94A4A', alchemist: '#4AD9C9',
};

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  const Icon = getIcon(achievement.icon);
  const rarityColor = RARITY_COLORS[achievement.rarity];
  const progressPct = Math.min(100, Math.round((achievement.progress / achievement.maxProgress) * 100));

  if (achievement.unlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{
          delay: (index % 8) * 0.05,
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
        }}
        whileHover={{ scale: 1.05, borderColor: '#F5CB4E' }}
        className="relative flex flex-col items-center text-center p-4 rounded-xl border border-[#252536] bg-[#12121A] cursor-pointer transition-all group"
      >
        {/* Glow effect on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ boxShadow: `0 0 20px ${rarityColor}20` }}
        />

        {/* Badge icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
          style={{ backgroundColor: `${rarityColor}15` }}
        >
          <Icon className="w-6 h-6" style={{ color: rarityColor }} />
        </div>

        {/* Name */}
        <h4 className="font-semibold text-xs text-[#E8E8F0] mb-1 leading-tight">{achievement.name}</h4>

        {/* Description */}
        <p className="text-[10px] text-[#5A5A78] line-clamp-2 mb-2">{achievement.description}</p>

        {/* Rarity badge */}
        <span
          className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${rarityColor}15`,
            color: rarityColor,
            border: `1px solid ${rarityColor}30`,
          }}
        >
          {achievement.rarity}
        </span>

        {/* Unlock date */}
        {achievement.unlockedDate && (
          <span className="text-[9px] text-[#3A3A50] mt-1">
            {achievement.unlockedDate}
          </span>
        )}
      </motion.div>
    );
  }

  // Locked state
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 8) * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      className="relative flex flex-col items-center text-center p-4 rounded-xl border border-[#252536] bg-[#12121A]/50 cursor-pointer"
    >
      {/* Grayed out icon */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 bg-[#1A1A26]">
        <Icon className="w-6 h-6 text-[#3A3A50]" />
      </div>

      {/* Hidden name */}
      <h4 className="font-semibold text-xs text-[#3A3A50] mb-1">???</h4>

      {/* Hint */}
      <p className="text-[10px] text-[#3A3A50] line-clamp-2 mb-2">
        {achievement.hint || achievement.description}
      </p>

      {/* Progress bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#5A5A78]">{achievement.progress}/{achievement.maxProgress}</span>
          <span className="text-[9px] text-[#5A5A78]">{progressPct}%</span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#252536] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#5A5A78]"
            initial={{ width: 0 }}
            whileInView={{ width: `${progressPct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const overallPct = Math.round((unlockedCount / totalCount) * 100);

  return (
    <section style={{ background: '#0A0A0F' }} className="py-24">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400 mb-2 block">
            Prove Your Worth
          </span>
          <h2 className="font-display font-semibold text-[#E8E8F0] mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Achievements
          </h2>

          {/* Progress */}
          <div className="max-w-xs mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-[#8A8AA8]">{unlockedCount} / {totalCount} unlocked</span>
              <span className="text-xs font-mono text-amber-300">{overallPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#252536] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #4ADE80, #F5CB4E, #FFD700)',
                }}
                initial={{ width: 0 }}
                whileInView={{ width: `${overallPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              />
            </div>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {achievementCategories.map((cat) => {
            const isActive = activeCategory === cat.key;
            const catColor = categoryIcons[cat.key];
            const count = cat.key === 'all'
              ? achievements.length
              : achievements.filter(a => a.category === cat.key).length;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                  ${isActive
                    ? 'text-[#E8E8F0] border-[#252536]'
                    : 'text-[#5A5A78] border-transparent hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
                  }
                `}
                style={isActive && catColor ? {
                  backgroundColor: `${catColor}10`,
                  borderColor: `${catColor}30`,
                  color: catColor,
                } : isActive ? {
                  backgroundColor: '#1A1A26',
                  borderColor: '#252536',
                } : {}}
              >
                {cat.label}
                <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Achievement Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          >
            {filtered.map((achievement, i) => (
              <AchievementCard key={achievement.id} achievement={achievement} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
