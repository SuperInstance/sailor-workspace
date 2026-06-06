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
  'look', 'place', 'paint', 'select', 'erase', 'undo', 'redo',
  'grid on', 'grid off', 'play', 'stop', 'save', 'publish',
  'summon npc', 'add wall', 'add door', 'terrain stone',
  'terrain amber', 'terrain grass', 'layer floor', 'layer canopy',
];

export default function MudCommandParser() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandEntry[]>([
    { id: 'h1', command: '', response: 'Room Crafter v1.0 — Type "help" for editor commands.', type: 'system', timestamp: new Date() },
    { id: 'h2', command: '', response: 'Current room: "Untitled Room" (32x24 tiles) | Layer: Floor', type: 'system', timestamp: new Date() },
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
    if (lower === 'help') return 'Commands: place <object>, paint <terrain>, select, erase, undo, redo, grid, play, save, layer <name>';
    if (lower === 'look') return 'You are in the Room Crafter. The canvas stretches before you. Tools await your command.';
    if (lower === 'select') return 'Select mode activated. Click objects to select them.';
    if (lower === 'paint') return 'Paint mode activated. Choose a terrain and click the canvas.';
    if (lower === 'play') return 'Entering play test mode... Player avatar spawned at entry point.';
    if (lower === 'stop') return 'Exiting play test mode. Returning to editor.';
    if (lower === 'save') return 'Room saved successfully.';
    if (lower.startsWith('place ')) return `Placing ${cmd.slice(6)}... Object placed on canvas.`;
    if (lower.startsWith('terrain ')) return `Switched to ${cmd.slice(8)} terrain.`;
    if (lower.startsWith('layer ')) return `Switched to ${cmd.slice(6)} layer.`;
    return `Command "${cmd}" executed.`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setShowAutocomplete(false);
  };

  return (
    <div className="w-full bg-[#0A0A0F] border-t border-[#252536]">
      <div className="max-h-24 overflow-y-auto px-4 py-1.5 space-y-0.5">
        {history.map((entry) => (
          <div key={entry.id} className="text-sm">
            {entry.command && (
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-[#E8B820]" />
                <span className="font-terminal text-[#E8E8F0] tracking-wide text-sm">{entry.command}</span>
              </div>
            )}
            <span className={`font-mono text-xs ${entry.type === 'system' ? 'text-[#8A8AA8]' : 'text-[#5BBD76]'}`}>
              {entry.response}
            </span>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>
      <div className="relative flex items-center h-10 px-4">
        <span className="text-[#E8B820] font-terminal text-lg mr-3 select-none">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter editor command..."
          className="flex-1 bg-transparent text-[#E8E8F0] font-terminal text-base tracking-wide placeholder:text-[#3A3A50] focus:outline-none"
        />
        <button className="p-1.5 text-[#5A5A78] hover:text-[#F5CB4E] transition-colors">
          <Mic className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleSubmit} className="p-1.5 text-[#E8B820] hover:text-[#F5CB4E] transition-colors">
          <Send className="w-3.5 h-3.5" />
        </button>
        <AnimatePresence>
          {showAutocomplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full left-0 right-0 bg-[#1A1A26] border border-[#252536] rounded-lg mb-1 py-1 z-50 max-h-32 overflow-y-auto"
            >
              {filtered.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => { setInput(cmd); setShowAutocomplete(false); inputRef.current?.focus(); }}
                  className="w-full text-left px-4 py-1 text-sm font-mono text-[#8A8AA8] hover:bg-[#252536] hover:text-[#F5CB4E] transition-colors"
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
