import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Hexagon, AlertCircle, BookOpen, Plus, ScrollText, Layers, Activity } from 'lucide-react';

interface FleetOverviewProps {
  activeAgents: number;
  totalRooms: number;
  totalIssues: number;
  totalTiles: number;
  coherence: number;
}

function AnimatedNumber({ value, duration = 1000, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startRef.current) startRef.current = timestamp;
        const progress = Math.min((timestamp - startRef.current) / duration, 1);
        setDisplay(Math.floor(progress * value));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
  }, [value, duration, delay]);

  return <span>{display}</span>;
}

export default function FleetOverview({ activeAgents, totalRooms, totalIssues, totalTiles, coherence }: FleetOverviewProps) {
  const coherencePercent = Math.min(Math.max((coherence / 2) * 100, 0), 100);
  const coherenceLabel = coherence > 1.1 ? 'Harmonic' : coherence > 0.9 ? 'Stable' : coherence > 0.7 ? 'Stressed' : 'Critical';
  const coherenceColor = coherence > 1.1 ? '#4ADE80' : coherence > 0.9 ? '#F5CB4E' : coherence > 0.7 ? '#E8B820' : '#EF4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="w-full h-[72px] bg-[#12121A] border-b border-[#252536] flex items-center justify-between px-6 sticky top-0 z-10"
    >
      {/* Fleet Label */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#E8E8F0]" />
          <span className="font-ui font-medium text-base text-[#E8E8F0]">SuperInstance Fleet</span>
        </div>
        <motion.div
          className="w-2 h-2 rounded-full bg-[#4ADE80]"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      {/* Coherence Mini */}
      <div className="flex flex-col w-40 gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#5A5A78]">Coherence</span>
          <span className="text-xs font-mono text-[#8A8AA8]">{coherenceLabel}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#252536] overflow-hidden relative">
          <div
            className="h-full rounded-full coherence-gradient transition-all duration-1000"
            style={{ width: `${coherencePercent}%` }}
          />
          <motion.div
            className="absolute top-0 w-1 h-full rounded-full bg-white"
            style={{ left: `${coherencePercent}%`, marginLeft: -2 }}
            animate={{ x: [0, 2, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: coherenceColor }}>
          gamma + H = {coherence.toFixed(3)}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-6">
        {[
          { value: activeAgents, icon: Users, color: '#60A5FA', label: 'agents' },
          { value: totalRooms, icon: Hexagon, color: '#E8B820', label: 'rooms' },
          { value: totalIssues, icon: AlertCircle, color: '#D94A4A', label: 'issues' },
          { value: totalTiles, icon: BookOpen, color: '#4A90D9', label: 'tiles' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 * i, duration: 0.4 }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            <div className="flex flex-col">
              <span className="text-base font-semibold text-[#E8E8F0] leading-tight">
                <AnimatedNumber value={stat.value} delay={i * 150} />
              </span>
              <span className="text-[10px] text-[#5A5A78] leading-tight">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C99A10]/40 text-[#F5CB4E] text-xs font-medium hover:bg-[#C99A10]/10 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span>Summon</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#8A8AA8] text-xs font-medium hover:bg-[#1A1A26] transition-colors">
          <ScrollText className="w-3.5 h-3.5" />
          <span>Quest</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#8A8AA8] text-xs font-medium hover:bg-[#1A1A26] transition-colors">
          <Layers className="w-3.5 h-3.5" />
          <span>Forest</span>
        </button>
      </div>
    </motion.div>
  );
}
