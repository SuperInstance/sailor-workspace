import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { COHERENCE_DATA } from '@/lib/tiles';

type TimeRange = '1H' | '24H' | '7D' | '30D';

const timeRangeData: Record<TimeRange, { value: number }[]> = {
  '1H': COHERENCE_DATA.hourly.map(d => ({ value: d.value, label: d.timestamp })),
  '24H': Array.from({ length: 24 }, (_, i) => ({
    value: 1.1 + Math.sin(i * 0.3) * 0.02 + Math.random() * 0.015,
    label: `${i}:00`,
  })),
  '7D': COHERENCE_DATA.history.slice(-7).map(d => ({ value: d.value, label: d.timestamp.slice(5, 10) })),
  '30D': COHERENCE_DATA.history.map(d => ({ value: d.value, label: d.timestamp.slice(5, 10) })),
};

export default function CoherenceChart() {
  const [range, setRange] = useState<TimeRange>('7D');
  const data = timeRangeData[range];

  const current = COHERENCE_DATA.current;
  const status = COHERENCE_DATA.status;
  const statusColors: Record<string, string> = {
    Harmonic: '#4ADE80', Stable: '#F5CB4E', Stressed: '#E8913A', Critical: '#EF4444',
  };

  const chartColor = useMemo(() => {
    const v = current.sum;
    if (v > 1.1) return '#4ADE80';
    if (v > 1.0) return '#60A5FA';
    if (v > 0.8) return '#F5CB4E';
    return '#EF4444';
  }, [current.sum]);

  return (
    <div className="space-y-6">
      {/* Formula display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-void-700 rounded-xl border border-void-600 p-6 sm:p-8 text-center"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <span className="font-display text-xl sm:text-2xl font-semibold text-void-100">gamma + H</span>
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-amber-400 text-2xl font-display"
          >
            =
          </motion.span>
          <span className="font-display text-xl sm:text-2xl font-semibold text-amber-300">
            1.283 - 0.159 &times; log(V)
          </span>
        </div>
        <div className="mt-3 font-mono text-lg" style={{ color: statusColors[status] }}>
          = {current.sum.toFixed(3)}
        </div>
        <div className="text-xs text-void-500 font-mono mt-1">
          V = {current.V} repos | log(V) = {current.logV.toFixed(3)} | H = {current.H} | gamma = {current.gamma}
        </div>
      </motion.div>

      {/* Time range toggle */}
      <div className="flex items-center justify-center gap-2">
        {(['1H', '24H', '7D', '30D'] as TimeRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              range === r ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-void-400 hover:bg-void-700 border border-transparent'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        key={range}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-void-900 rounded-xl border border-void-600 p-4"
        style={{ height: 340 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="coherenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252536" />
            <XAxis dataKey="label" stroke="#5A5A78" fontSize={11} tickLine={false} />
            <YAxis domain={[0.9, 1.2]} stroke="#5A5A78" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#1A1A26', border: '1px solid #252536', borderRadius: '8px',
                fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#E8E8F0',
              }}
              formatter={(value: number) => [`${value.toFixed(3)}`, 'Coherence']}
            />
            <ReferenceLine y={1.0} stroke="#4ADE80" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={0.8} stroke="#EF4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#coherenceGrad)"
              animationDuration={1500}
              animationEasing="ease"
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Volume gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-void-800 rounded-xl border border-void-600 p-4 flex flex-col items-center"
        >
          <svg viewBox="0 0 120 120" className="w-28 h-28">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#252536" strokeWidth="8" />
            <motion.circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#8A8AA8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(current.V / 100) * 314} 314`}
              transform="rotate(-90 60 60)"
              initial={{ strokeDasharray: '0 314' }}
              whileInView={{ strokeDasharray: `${(current.V / 100) * 314} 314` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <text x="60" y="58" textAnchor="middle" fill="#E8E8F0" fontSize="18" fontFamily="Cinzel" fontWeight="600">
              {current.V}
            </text>
            <text x="60" y="74" textAnchor="middle" fill="#5A5A78" fontSize="9" fontFamily="Inter">
              repos
            </text>
          </svg>
          <span className="text-xs text-void-400 mt-1">Fleet Volume (V)</span>
        </motion.div>

        {/* Entropy bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-void-800 rounded-xl border border-void-600 p-4 flex flex-col items-center justify-center"
        >
          <div className="w-full mb-3">
            <div className="h-3 bg-void-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #F5CB4E, #E8B820)' }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(current.H / 1.5) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
          <span className="font-display text-2xl font-semibold text-amber-400">{current.H.toFixed(3)}</span>
          <span className="text-xs text-void-400 mt-1">Entropy (H)</span>
        </motion.div>

        {/* Coherence bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-void-800 rounded-xl border border-void-600 p-4 flex flex-col items-center justify-center"
        >
          <div className="w-full mb-3">
            <div className="h-3 bg-void-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #4ADE80, #60A5FA)' }}
                initial={{ width: 0 }}
                whileInView={{ width: `${(current.gamma / 0.5) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
          <span className="font-display text-2xl font-semibold text-quest-green">{current.gamma.toFixed(3)}</span>
          <span className="text-xs text-void-400 mt-1">Coherence (gamma)</span>
        </motion.div>
      </div>

      {/* Status panel */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="bg-void-800 rounded-xl border border-void-600 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm text-void-400 uppercase tracking-wider">Status</span>
            <span className="font-display text-lg font-semibold" style={{ color: statusColors[status] }}>
              {status}
            </span>
          </div>
          <p className="text-sm text-void-300 mt-1">
            The fleet is operating within optimal coherence bounds. All agents are synchronized.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-quest-green text-sm">
              <span>↑</span>
              <span>{COHERENCE_DATA.trend} from yesterday</span>
            </div>
            <div className="text-[10px] text-void-500 font-mono mt-1">
              Alert threshold: 0.800
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
