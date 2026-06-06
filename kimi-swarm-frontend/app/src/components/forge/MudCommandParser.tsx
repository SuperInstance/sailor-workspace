import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Sparkles } from 'lucide-react';

interface LogEntry {
  id: string;
  text: string;
  type: 'user' | 'system' | 'agent' | 'forge';
  timestamp: number;
}

const AUTOCOMPLETE_COMMANDS = [
  'deploy', 'build', 'preview', 'export', 'add component',
  'set breakpoint', 'connect api', 'bind state',
  'Builder-7', 'Scout-3', 'deploy to canopy',
];

export default function MudCommandParser() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l0', text: 'Frontend Forge ready. Build something extraordinary.', type: 'forge', timestamp: 0 },
    { id: 'l1', text: 'Type "deploy" to publish your app.', type: 'system', timestamp: 1 },
  ]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const matches = input.trim()
    ? AUTOCOMPLETE_COMMANDS.filter(c => c.toLowerCase().includes(input.toLowerCase()))
    : [];

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const entry: LogEntry = {
      id: 'l' + Date.now(),
      text: '> ' + input.trim(),
      type: 'user',
      timestamp: Date.now(),
    };
    setLogs(prev => [...prev, entry]);

    // Simulate forge-specific responses
    setTimeout(() => {
      let resp: LogEntry;
      if (input.toLowerCase().includes('deploy')) {
        resp = {
          id: 'r' + Date.now(),
          text: 'Deploying to Canopy layer... Build successful! URL: https://app.openroom.dev',
          type: 'forge',
          timestamp: Date.now(),
        };
      } else {
        const responses = [
          'Component added to canvas.',
          'Style applied successfully.',
          'Breakpoint set to Desktop (1440px).',
          'State binding configured.',
        ];
        resp = {
          id: 'r' + Date.now(),
          text: responses[Math.floor(Math.random() * responses.length)],
          type: 'agent',
          timestamp: Date.now(),
        };
      }
      setLogs(prev => [...prev, resp]);
    }, 400);

    setInput('');
    setShowAutocomplete(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showAutocomplete && matches[selectedIdx]) {
        setInput(matches[selectedIdx]);
        setShowAutocomplete(false);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(matches.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
    }
  };

  return (
    <div className="w-full bg-[#0A0A0F] border-t border-[#252536] flex flex-col">
      {/* Log */}
      <div className="max-h-24 overflow-y-auto px-4 py-1 font-terminal text-sm space-y-0.5">
        {logs.map(log => (
          <div
            key={log.id}
            className={
              log.type === 'user' ? 'text-[#E8B820]' :
              log.type === 'agent' ? 'text-[#4AD9C9]' :
              log.type === 'forge' ? 'text-[#9B6DD1]' :
              'text-[#5A5A78]'
            }
          >
            {log.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Input */}
      <div className="relative px-4 py-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-[#9B6DD1] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setShowAutocomplete(true); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowAutocomplete(true)}
            placeholder="Enter forge command or summon an agent..."
            className="flex-1 bg-transparent text-[#E8E8F0] font-terminal text-base placeholder-[#3A3A50] focus:outline-none"
          />
          <button className="p-1.5 rounded hover:bg-[#1A1A26] transition-colors">
            <Mic className="w-4 h-4 text-[#5A5A78]" />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSubmit}
            className="p-1.5 rounded bg-[#9B6DD1]/20 hover:bg-[#9B6DD1]/30 transition-colors"
          >
            <Send className="w-4 h-4 text-[#9B6DD1]" />
          </motion.button>
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showAutocomplete && matches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-12 right-4 bottom-full mb-1 bg-[#1A1A26] border border-[#252536] rounded-lg shadow-xl overflow-hidden z-50"
            >
              {matches.map((match, i) => (
                <button
                  key={match}
                  onClick={() => { setInput(match); setShowAutocomplete(false); inputRef.current?.focus(); }}
                  className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors ${
                    i === selectedIdx ? 'bg-[#9B6DD1]/15 text-[#9B6DD1]' : 'text-[#8A8AA8] hover:bg-[#252536]'
                  }`}
                >
                  {match}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
