import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scroll, Hammer, Shirt, Image, Zap, Shield, Magnet,
  Key, File, Monitor, FlaskConical
} from 'lucide-react';
import type { Reward } from '@/lib/quests';
import { rewards, RARITY_COLORS } from '@/lib/quests';

const iconMap: Record<string, React.ElementType> = {
  scroll: Scroll, hammer: Hammer, shirt: Shirt, image: Image,
  zap: Zap, shield: Shield, magnet: Magnet, key: Key,
  file: File, monitor: Monitor, flask: FlaskConical,
};

function getIcon(iconName: string) {
  return iconMap[iconName] ?? Scroll;
}

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'title', label: 'Titles' },
  { key: 'cosmetic', label: 'Cosmetics' },
  { key: 'agent_skin', label: 'Skins' },
  { key: 'room_theme', label: 'Themes' },
  { key: 'booster', label: 'Boosters' },
];

const pendingRewards = rewards.filter(r => !r.equipped);

function RewardItem({ reward, index }: { reward: Reward; index: number }) {
  const Icon = getIcon(reward.icon);
  const rarityColor = RARITY_COLORS[reward.rarity];
  const [equipped, setEquipped] = useState(reward.equipped ?? false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: (index % 12) * 0.03,
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
      }}
      whileHover={{ scale: 1.1, zIndex: 10 }}
      className="group relative flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all"
      style={{
        background: '#12121A',
        borderColor: equipped ? `${rarityColor}40` : '#252536',
        boxShadow: equipped ? `0 0 15px ${rarityColor}15` : 'none',
      }}
      title={`${reward.name} (${reward.rarity})`}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: `${rarityColor}10` }}
      >
        <Icon className="w-6 h-6" style={{ color: rarityColor }} />
      </div>

      {/* Name */}
      <span className="text-[10px] text-[#8A8AA8] text-center leading-tight line-clamp-1 group-hover:text-[#E8E8F0] transition-colors">
        {reward.name}
      </span>

      {/* Rarity dot */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ backgroundColor: rarityColor }}
      />

      {/* Equip button on hover */}
      <div className="absolute inset-0 rounded-xl bg-void-900/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEquipped(!equipped);
          }}
          className="px-3 py-1 rounded-lg text-[10px] font-medium border transition-colors"
          style={{
            borderColor: equipped ? `${rarityColor}40` : '#252536',
            color: equipped ? rarityColor : '#8A8AA8',
            backgroundColor: equipped ? `${rarityColor}10` : 'transparent',
          }}
        >
          {equipped ? 'Equipped' : 'Equip'}
        </button>
      </div>
    </motion.div>
  );
}

export default function Rewards() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? rewards
    : rewards.filter(r => r.type === activeFilter);

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
            Your Treasures
          </span>
          <h2 className="font-display font-semibold text-[#E8E8F0]" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Rewards &amp; Inventory
          </h2>
        </motion.div>

        {/* Pending Rewards */}
        {pendingRewards.length > 0 && (
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-lg font-semibold text-[#E8E8F0] mb-4 flex items-center gap-2">
              <span>Claim Your Rewards</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse">
                {pendingRewards.length} pending
              </span>
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {pendingRewards.slice(0, 4).map((reward, i) => {
                const Icon = getIcon(reward.icon);
                const rarityColor = RARITY_COLORS[reward.rarity];
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="snap-start shrink-0 w-[180px] rounded-xl p-4 flex flex-col items-center text-center"
                    style={{
                      background: '#12121A',
                      border: `2px solid ${rarityColor}`,
                      boxShadow: `0 0 20px ${rarityColor}15`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${rarityColor}15` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: rarityColor }} />
                    </div>
                    <h4 className="text-sm font-semibold text-[#E8E8F0] mb-1">{reward.name}</h4>
                    <p className="text-[10px] text-[#5A5A78] line-clamp-2 mb-3">{reward.description}</p>
                    <button className="w-full py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors">
                      Claim
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                ${activeFilter === tab.key
                  ? 'bg-[#1A1A26] text-[#E8E8F0] border-[#252536]'
                  : 'text-[#5A5A78] border-transparent hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inventory Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3"
          >
            {filtered.map((reward, i) => (
              <RewardItem key={reward.id} reward={reward} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
