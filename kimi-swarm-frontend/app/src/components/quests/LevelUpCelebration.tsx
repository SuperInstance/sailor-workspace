import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { levelNames } from '@/lib/quests';

interface LevelUpCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  oldLevel: number;
  newLevel: number;
}

export default function LevelUpCelebration({ isOpen, onClose, oldLevel, newLevel }: LevelUpCelebrationProps) {
  const [phase, setPhase] = useState(0);
  const levelName = levelNames[Math.min(newLevel - 1, levelNames.length - 1)] ?? 'Unknown';

  useEffect(() => {
    if (!isOpen) {
      setPhase(0);
      return;
    }

    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-void-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Celebration content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Particles */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#F5CB4E' : '#E8B820',
                }}
                initial={{
                  opacity: 0,
                  x: 0,
                  y: 0,
                  scale: 0,
                }}
                animate={phase >= 2 ? {
                  opacity: [0, 1, 0],
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  scale: [0, 1.5, 0],
                } : {}}
                transition={{
                  duration: 1 + Math.random() * 1.5,
                  delay: Math.random() * 0.5,
                  ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
                }}
              />
            ))}

            {/* XP bar overflow */}
            <AnimatePresence>
              {phase >= 1 && (
                <motion.div
                  className="w-64 h-4 rounded-full bg-[#252536] overflow-hidden mb-8"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #C99A10, #FFD700, #E8B820)' }}
                    initial={{ width: '82%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* LEVEL UP! text */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.6,
                    ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
                  }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    className="flex items-center gap-3 mb-4"
                    animate={{ filter: ['drop-shadow(0 0 20px rgba(255,215,0,0.3))', 'drop-shadow(0 0 60px rgba(255,215,0,0.6))', 'drop-shadow(0 0 20px rgba(255,215,0,0.3))'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-[#FFD700]" />
                    <h2
                      className="font-display font-bold text-[#FFD700]"
                      style={{
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        textShadow: '0 0 40px rgba(255,215,0,0.4)',
                      }}
                    >
                      LEVEL UP!
                    </h2>
                    <Sparkles className="w-8 h-8 text-[#FFD700]" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Level number transition */}
            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  className="flex items-center gap-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.span
                    className="font-display font-bold text-5xl text-[#5A5A78]"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {oldLevel}
                  </motion.span>
                  <motion.span
                    className="font-display font-bold text-7xl text-[#FFD700]"
                    initial={{ rotateY: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.2,
                      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
                    }}
                    style={{ textShadow: '0 0 40px rgba(255,215,0,0.5)' }}
                  >
                    {newLevel}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Level name */}
            <AnimatePresence>
              {phase >= 3 && (
                <motion.p
                  className="font-display font-semibold text-xl text-amber-300 mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {levelName}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Reward items */}
            <AnimatePresence>
              {phase >= 4 && (
                <motion.div
                  className="flex gap-4 mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[
                    { icon: Star, label: '+500 XP', color: '#FFD700' },
                    { icon: Sparkles, label: 'Level Badge', color: '#A78BFA' },
                    { icon: Star, label: 'Title Unlock', color: '#60A5FA' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: i * 0.15,
                        duration: 0.4,
                        ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
                      }}
                      className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-[#1A1A26] border border-[#252536]"
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      <span className="text-[10px] text-[#8A8AA8]">{item.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue button */}
            <AnimatePresence>
              {phase >= 4 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={onClose}
                  className="px-8 py-3 rounded-xl text-sm font-semibold bg-amber-500 text-void-900 hover:bg-amber-400 transition-colors"
                >
                  Continue
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
