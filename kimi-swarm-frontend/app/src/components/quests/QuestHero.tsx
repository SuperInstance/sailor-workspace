import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';

export default function QuestHero() {
  return (
    <section
      className="relative min-h-[400px] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: 'url(/quest-board.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/60 via-void-900/70 to-void-900" />

      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#FFD700]"
            initial={{
              opacity: 0,
              x: `${20 + Math.random() * 60}%`,
              y: `${80 + Math.random() * 20}%`,
            }}
            animate={{
              opacity: [0, 0.5, 0],
              y: `${Math.random() * 40}%`,
            }}
            transition={{
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: [0.45, 0.05, 0.55, 0.95] as [number, number, number, number],
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <ScrollText className="w-8 h-8 text-amber-300" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
            The Adventure Awaits
          </span>
          <ScrollText className="w-8 h-8 text-amber-300" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="font-display font-bold text-[#E8E8F0] mb-4"
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            textShadow: '0 0 60px rgba(245,203,78,0.3), 0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          The Quest Board
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg text-[#B8B8D0] max-w-lg mx-auto font-ui"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
        >
          Every challenge conquered is a step toward mastery. Track your quests, earn rewards, and rise through the ranks.
        </motion.p>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="w-24 h-0.5 mx-auto mt-6 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #F5CB4E, transparent)' }}
        />
      </div>
    </section>
  );
}
