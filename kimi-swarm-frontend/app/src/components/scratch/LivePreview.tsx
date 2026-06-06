import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, SkipForward, Share2, Box, Zap, Terminal } from 'lucide-react';
import type { ConsoleMessage } from '@/lib/blocks';
import { INITIAL_CONSOLE } from '@/lib/blocks';

interface LivePreviewProps {
  running: boolean;
  onRun: () => void;
  onStop: () => void;
  onStep: () => void;
  activeBlockId: string | null;
}

export default function LivePreview({ running, onRun, onStop, onStep }: LivePreviewProps) {
  const [speed, setSpeed] = useState(1);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>(INITIAL_CONSOLE);
  const [agentPos, setAgentPos] = useState({ x: 50, y: 50 });
  const [currentRoom] = useState('flux-runtime');
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleMessages]);

  // Simulate agent movement when running
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setAgentPos(prev => ({
        x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * 20)),
        y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * 10)),
      }));
      // Add random console messages
      if (Math.random() > 0.7) {
        const messages = [
          { text: '> Scanning room...', type: 'system' as const },
          { text: '> Builder-7: Moving to target...', type: 'agent' as const },
          { text: '> Tile collected successfully', type: 'success' as const },
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        setConsoleMessages(prev => [...prev, {
          id: 'sim_' + Date.now(),
          text: msg.text,
          type: msg.type,
          timestamp: Date.now(),
        }]);
      }
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [running, speed]);

  const clearConsole = () => setConsoleMessages([]);

  return (
    <div className="w-[360px] flex-shrink-0 bg-[#12121A] border-l border-[#252536] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#E8E8F0] font-ui">Live Preview</span>
          <motion.div
            animate={running ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ repeat: running ? Infinity : 0, duration: 1.5 }}
            className={`w-2 h-2 rounded-full ${running ? 'bg-[#4ADE80]' : 'bg-[#5A5A78]'}`}
          />
          <span className="text-[10px] text-[#5A5A78] font-mono">{running ? 'Running' : 'Stopped'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onStop} className="p-1.5 rounded-md bg-[#D94A4A]/20 hover:bg-[#D94A4A]/30 transition-colors" title="Stop">
            <Square className="w-3.5 h-3.5 text-[#D94A4A]" />
          </button>
          <motion.button
            onClick={running ? onStop : onRun}
            whileTap={{ scale: 0.95 }}
            className={`p-1.5 rounded-md transition-colors ${running ? 'bg-[#D94A4A]/20 hover:bg-[#D94A4A]/30' : 'bg-[#4ADE80]/20 hover:bg-[#4ADE80]/30'}`}
            title={running ? 'Stop' : 'Run'}
          >
            {running ? <Square className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Play className="w-3.5 h-3.5 text-[#4ADE80]" />}
          </motion.button>
          <button onClick={onStep} className="p-1.5 rounded-md bg-[#E8B820]/20 hover:bg-[#E8B820]/30 transition-colors" title="Step">
            <SkipForward className="w-3.5 h-3.5 text-[#E8B820]" />
          </button>
          <button className="p-1.5 rounded-md bg-[#1A1A26] hover:bg-[#252536] transition-colors border border-[#252536]" title="Share">
            <Share2 className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
        </div>
      </div>

      {/* Room Viewport */}
      <div className="p-4">
        <div className="w-[320px] h-[320px] rounded-xl bg-[#0A0A0F] border border-[#252536] relative overflow-hidden mx-auto">
          {/* Room gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, rgba(232,145,58,0.1) 0%, transparent 70%)`,
            }}
          />
          {/* Room name */}
          <div className="absolute top-3 left-0 right-0 text-center">
            <span className="font-display font-semibold text-xs text-[#E8B820]">{currentRoom}</span>
          </div>
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10">
            <defs>
              <pattern id="roomGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4A90D9" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#roomGrid)" />
          </svg>
          {/* Tile icons */}
          <div className="absolute top-12 left-8 w-3 h-3 rounded-sm bg-[#4A90D9]/60" />
          <div className="absolute top-20 right-12 w-3 h-3 rounded-sm bg-[#9B6DD1]/60" />
          <div className="absolute bottom-16 left-16 w-3 h-3 rounded-sm bg-[#4AD9C9]/60" />
          {/* Agent avatar */}
          <AnimatePresence>
            <motion.div
              className="absolute w-12 h-12 -ml-6 -mt-6"
              animate={{ left: `${agentPos.x}%`, top: `${agentPos.y}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            >
              <div className="w-full h-full rounded-full bg-[#E8913A]/20 border-2 border-[#E8913A] flex items-center justify-center">
                <Box className="w-6 h-6 text-[#E8913A]" />
              </div>
              {/* Agent label */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[9px] text-[#E8913A] font-mono">Builder-7</span>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Other agents */}
          <div className="absolute top-16 left-20 w-6 h-6 -ml-3 -mt-3">
            <div className="w-full h-full rounded-full bg-[#5BBD76]/20 border border-[#5BBD76] flex items-center justify-center">
              <Zap className="w-3 h-3 text-[#5BBD76]" />
            </div>
          </div>
          {/* Status overlay */}
          {running && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute top-2 right-2 flex items-center gap-1 bg-[#0A0A0F]/80 px-2 py-0.5 rounded-full"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]"
              />
              <span className="text-[9px] text-[#4ADE80] font-mono">executing</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Console Output */}
      <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-[#5A5A78]" />
            <span className="text-[10px] text-[#5A5A78] font-ui uppercase tracking-wider">Console</span>
          </div>
          <button onClick={clearConsole} className="text-[10px] text-[#5A5A78] hover:text-[#8A8AA8] font-ui">Clear</button>
        </div>
        <div
          ref={consoleRef}
          className="flex-1 overflow-y-auto bg-[#0A0A0F] rounded-lg p-3 font-mono text-xs space-y-1 min-h-0"
        >
          <AnimatePresence initial={false}>
            {consoleMessages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={
                  msg.type === 'error' ? 'text-[#D94A4A]' :
                  msg.type === 'success' ? 'text-[#4ADE80]' :
                  msg.type === 'agent' ? 'text-[#E8E8F0]' :
                  'text-[#8A8AA8]'
                }
              >
                {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
          {consoleMessages.length === 0 && (
            <span className="text-[#3A3A50] text-xs italic">No output yet...</span>
          )}
        </div>
      </div>

      {/* Speed Control */}
      <div className="px-4 py-3 border-t border-[#252536]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#5A5A78] font-ui w-14">Speed: {speed}x</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-[#252536] rounded-full appearance-none cursor-pointer accent-[#E8B820]"
          />
        </div>
      </div>
    </div>
  );
}
