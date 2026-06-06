import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, ChevronRight } from 'lucide-react';

interface CommandEntry {
  id: string;
  command: string;
  response: string;
  type: 'user' | 'system' | 'agent';
  timestamp: Date;
}

const AUTOCOMPLETE_COMMANDS = [
  'look', 'go', 'summon', 'dismiss', 'cast', 'absorb',
  'walk', 'inventory', 'status', 'help', 'say',
  'summon Builder', 'summon Scout', 'summon Scholar',
  'summon Critic', 'summon Commander', 'summon Alchemist',
];

export default function MudCommandParser() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandEntry[]>([
    { id: 'h1', command: '', response: 'Welcome to OpenRoom. Type "help" for available commands.', type: 'system', timestamp: new Date() },
    { id: 'h2', command: 'status', response: 'Fleet coherence: 1.127 | 24 agents active | 42 rooms online', type: 'system', timestamp: new Date() },
  ]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (input.length > 0) {
      const f = AUTOCOMPLETE_COMMANDS.filter((c) => c.toLowerCase().startsWith(input.toLowerCase()));
      setFiltered(f);
      setShowAutocomplete(f.length > 0);
    } else {
      setShowAutocomplete(false);
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const entry: CommandEntry = {
      id: Date.now().toString(),
      command: input,
      response: generateResponse(input),
      type: 'user',
      timestamp: new Date(),
    };
    setHistory((prev) => [...prev, entry]);
    setInput('');
    setShowAutocomplete(false);
  };

  const generateResponse = (cmd: string): string => {
    const lower = cmd.toLowerCase();
    if (lower === 'help') return 'Commands: look, go <room>, summon <agent>, dismiss <agent>, status, inventory, say <message>';
    if (lower === 'look') return 'You stand in the OpenRoom lobby. Rooms stretch out in every direction. Agents move between tasks.';
    if (lower === 'status') return 'Fleet coherence: 1.127 | 24 agents active | 42 rooms online | All systems nominal.';
    if (lower === 'inventory') return 'You carry: 12 PLATO tiles, 3 agent tokens, 1 master key.';
    if (lower.startsWith('say ')) return `You say: "${cmd.slice(4)}"`;
    if (lower.startsWith('go ')) return `Walking to ${cmd.slice(3)}... You arrive.`;
    if (lower.startsWith('summon ')) return `Summoning ${cmd.slice(7)} agent... Agent materializes in a swirl of light.`;
    if (lower.startsWith('dismiss ')) return `Dismissing ${cmd.slice(8)}... Agent fades into the void.`;
    return `Command "${cmd}" executed. Result: success.`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowAutocomplete(false);
  };

  return (
    <div className="w-full bg-[#0A0A0F] border-t border-[#252536]">
      {/* History */}
      <div className="max-h-32 overflow-y-auto px-4 py-2 space-y-1">
        {history.map((entry) => (
          <div key={entry.id} className="text-sm">
            {entry.command && (
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-[#E8B820]" />
                <span className="font-terminal text-[#E8E8F0] tracking-wide">{entry.command}</span>
              </div>
            )}
            <span className={`font-mono text-xs ${entry.type === 'system' ? 'text-[#8A8AA8]' : 'text-[#5BBD76]'}`}>
              {entry.response}
            </span>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Input */}
      <div className="relative flex items-center h-12 px-4">
        <span className="text-[#E8B820] font-terminal text-xl mr-3 select-none">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command or speak to agents..."
          className="flex-1 bg-transparent text-[#E8E8F0] font-terminal text-lg tracking-wide placeholder:text-[#3A3A50] focus:outline-none"
        />
        <button className="p-2 text-[#5A5A78] hover:text-[#F5CB4E] transition-colors">
          <Mic className="w-4 h-4" />
        </button>
        <button
          onClick={handleSubmit}
          className="p-2 text-[#E8B820] hover:text-[#F5CB4E] transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>

        {/* Autocomplete */}
        <AnimatePresence>
          {showAutocomplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full left-0 right-0 bg-[#1A1A26] border border-[#252536] rounded-lg mb-1 py-1 z-50 max-h-40 overflow-y-auto"
            >
              {filtered.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => { setInput(cmd); setShowAutocomplete(false); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-1.5 text-sm font-mono text-[#8A8AA8] hover:bg-[#252536] hover:text-[#F5CB4E] transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
