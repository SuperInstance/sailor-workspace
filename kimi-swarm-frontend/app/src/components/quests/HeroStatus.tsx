import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, DoorOpen, Users, Layers, Terminal } from 'lucide-react';
import { playerStats, levelNames } from '@/lib/quests';

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

const xpPercent = Math.round((playerStats.currentXp / playerStats.xpToNextLevel) * 100);
const xpNeeded = playerStats.xpToNextLevel - playerStats.currentXp;
const levelName = levelNames[Math.min(playerStats.level - 1, levelNames.length - 1)] ?? levelNames[0];

export default function HeroStatus() {
  const [barAnimated, setBarAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="relative overflow-hidden" style={{ background: '#12121A' }}>
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245,203,78,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#FFD700]"
            initial={{
              opacity: 0,
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              scale: 0.5,
            }}
            animate={{
              opacity: [0, 0.3, 0],
              y: [null, '-20%'],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 10 + Math.random() * 15,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: [0.45, 0.05, 0.55, 0.95] as [number, number, number, number],
            }}
            style={{ width: 2 + Math.random() * 3, height: 2 + Math.random() * 3 }}
          />
        ))}
      </div>

      <div className="relative max-w-[1200px] mx-auto px-4 lg:px-8 pt-16 pb-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">

          {/* Level Display */}
          <motion.div
            className="flex flex-col items-center lg:items-start shrink-0"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5A5A78] font-ui mb-1">
              Level
            </span>
            <span
              className="font-display font-bold leading-none"
              style={{
                fontSize: 'clamp(4rem, 10vw, 8rem)',
                color: '#FFD700',
                textShadow: '0 0 40px rgba(255,215,0,0.3)',
              }}
            >
              {playerStats.level}
            </span>
            <span className="font-display font-semibold text-lg text-amber-300 mt-1">
              {levelName}
            </span>
          </motion.div>

          {/* Center: XP Bar + Stats */}
          <div className="flex-1 w-full max-w-[500px]">
            {/* XP Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#B8B8D0] font-ui">
                  {playerStats.currentXp.toLocaleString()} / {playerStats.xpToNextLevel.toLocaleString()} XP
                </span>
                <span className="text-xs font-mono text-[#FFD700]">{xpPercent}%</span>
              </div>
              <div className="w-full h-4 rounded-full bg-[#252536] overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: 'linear-gradient(90deg, #C99A10 0%, #FFD700 50%, #E8B820 100%)',
                    width: barAnimated ? `${xpPercent}%` : '0%',
                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* Shimmer overlay */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 3s infinite',
                    }}
                  />
                </motion.div>
              </div>
              <p className="text-xs text-[#5A5A78] mt-1.5 font-ui">
                Next Level: {xpNeeded.toLocaleString()} XP needed
              </p>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              className="flex flex-wrap gap-6 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-quest-green/10 flex items-center justify-center">
                  <span className="text-quest-green text-sm font-bold">Q</span>
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-quest-green leading-none">
                    <AnimatedNumber value={playerStats.totalQuestsCompleted} />
                  </div>
                  <div className="text-[10px] text-[#5A5A78] uppercase tracking-wider mt-0.5">Completed</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-mana-blue/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-mana-blue" />
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-mana-blue leading-none">
                    <AnimatedNumber value={playerStats.agentsSummoned} />
                  </div>
                  <div className="text-[10px] text-[#5A5A78] uppercase tracking-wider mt-0.5">Agents</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-scholar-blue/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-scholar-blue" />
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-scholar-blue leading-none">
                    <AnimatedNumber value={playerStats.tilesCollected} />
                  </div>
                  <div className="text-[10px] text-[#5A5A78] uppercase tracking-wider mt-0.5">Tiles</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <DoorOpen className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-display font-semibold text-xl text-amber-400 leading-none">
                    <AnimatedNumber value={playerStats.roomsExplored} />
                  </div>
                  <div className="text-[10px] text-[#5A5A78] uppercase tracking-wider mt-0.5">Rooms</div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats Row */}
            <motion.div
              className="flex flex-wrap gap-4 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="flex items-center gap-1.5 text-xs text-[#5A5A78]">
                <Terminal className="w-3 h-3" />
                <span className="font-mono">{playerStats.codeBlocksWritten.toLocaleString()}</span>
                <span>blocks</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5A5A78]">
                <span className="text-quest-green font-mono">{playerStats.achievementPoints.toLocaleString()}</span>
                <span>achievement pts</span>
              </div>
            </motion.div>
          </div>

          {/* Daily Streak */}
          <motion.div
            className="flex flex-col items-center lg:items-end shrink-0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Flame className="w-10 h-10 text-amber-400" />
            </motion.div>
            <span
              className="font-display font-semibold text-4xl mt-1"
              style={{
                background: 'linear-gradient(135deg, #E8B820, #D94A4A)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {playerStats.streakDays}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#5A5A78] mt-0.5">
              Day Streak
            </span>

            {/* Week indicator */}
            <div className="flex gap-1.5 mt-3">
              {playerStats.weekActivity.map((active, i) => (
                <motion.div
                  key={i}
                  className={`w-4 h-4 rounded-full border ${
                    i === playerStats.weekActivity.length - 1
                      ? active
                        ? 'bg-quest-green border-quest-green'
                        : 'border-amber-400 animate-pulse bg-amber-400/20'
                      : active
                      ? 'bg-quest-green border-quest-green'
                      : 'border-[#3A3A50] bg-transparent'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                />
              ))}
            </div>
            <p className="text-xs text-amber-300 mt-2">
              Next reward: Day 10
            </p>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </section>
  );
}
