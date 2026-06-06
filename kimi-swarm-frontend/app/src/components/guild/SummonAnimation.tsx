import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentType } from '@/lib/agents';

interface SummonAnimationProps {
  agent: AgentType | null;
  onComplete: () => void;
  isOpen: boolean;
}

export default function SummonAnimation({ agent, onComplete, isOpen }: SummonAnimationProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isOpen || !agent) return;
    setPhase(0);
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => { onComplete(); }, 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isOpen, agent, onComplete]);

  if (!agent || !isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center"
        style={{ background: 'rgba(10, 10, 15, 0.95)' }}
      >
        {/* Ground circle */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute w-40 h-40 rounded-full border-2"
              style={{ borderColor: agent.color, boxShadow: `0 0 40px ${agent.color}60` }}
            />
          )}
        </AnimatePresence>

        {/* Rising particles */}
        {phase >= 1 && phase <= 3 && (
          <>
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: 60, x: 0, opacity: 0, scale: 0.5 }}
                animate={{
                  y: -180 - Math.random() * 120,
                  x: (Math.random() - 0.5) * 200,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.2, 0.3],
                }}
                transition={{
                  duration: 1 + Math.random() * 0.5,
                  delay: Math.random() * 0.4,
                  ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
                }}
                className="absolute w-2 h-2 rounded-full"
                style={{ background: agent.color, boxShadow: `0 0 8px ${agent.color}` }}
              />
            ))}
          </>
        )}

        {/* Swirl effect */}
        {phase >= 1 && phase <= 2 && (
          <motion.div
            animate={{ rotate: 720 }}
            transition={{ duration: 1.5, ease: 'linear' }}
            className="absolute"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: agent.color,
                  boxShadow: `0 0 12px ${agent.color}`,
                  left: `${Math.cos((i * Math.PI) / 4) * 60}px`,
                  top: `${Math.sin((i * Math.PI) / 4) * 60}px`,
                }}
                animate={{ scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.05 }}
              />
            ))}
          </motion.div>
        )}

        {/* Agent figure */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className="w-32 h-32 rounded-full overflow-hidden border-4 mb-4"
                style={{ borderColor: agent.color, boxShadow: `0 0 40px ${agent.color}60` }}
              >
                <img src={agent.image} alt={agent.name} className="w-full h-full object-cover" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nameplate */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute mt-48 flex flex-col items-center z-10"
            >
              <h2 className="font-display text-3xl font-bold text-void-100" style={{ textShadow: `0 0 20px ${agent.color}60` }}>
                {agent.name}
              </h2>
              <p className="text-void-300 mt-2 font-mono text-sm">has answered your summons</p>
              {/* Ambient glow */}
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-64 h-32 rounded-full -z-10"
                style={{ background: `radial-gradient(ellipse, ${agent.color}30 0%, transparent 70%)`, top: -20 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress text */}
        <div className="absolute bottom-12 text-void-500 font-mono text-xs">
          {phase === 0 && 'Channeling energy...'}
          {phase === 1 && 'Opening summoning circle...'}
          {phase === 2 && 'Materializing form...'}
          {phase === 3 && 'Binding contract...'}
          {phase === 4 && 'Summoning complete'}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
