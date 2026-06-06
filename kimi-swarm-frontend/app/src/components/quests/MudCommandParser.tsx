import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic } from 'lucide-react';

interface CommandLog {
  id: string;
  type: 'user' | 'system' | 'agent';
  text: string;
  timestamp: string;
}

const suggestions = [
  'look around',
  'inventory',
  'accept quest',
  'summon agent',
  'check coherence',
  'enter room',
  'talk to scholar',
  'collect tile',
];

export default function MudCommandParser() {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<CommandLog[]>([
    { id: '1', type: 'system', text: 'Welcome to the Quest Board. Type "help" for available commands.', timestamp: '14:23' },
  ]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (input.length > 0) {
      const filtered = suggestions.filter(s => s.includes(input.toLowerCase()));
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Add user command
    setLogs(prev => [...prev, { id: Date.now().toString(), type: 'user', text: input, timestamp }]);

    // Simulate response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'help': 'Available commands: look, inventory, accept, summon, check, enter, talk, collect, status',
        'look': 'You stand before the Quest Board. Parchment quests are pinned to a weathered wooden board. Amber light flickers from nearby torches.',
        'look around': 'You stand before the Quest Board. Parchment quests are pinned to a weathered wooden board. Amber light flickers from nearby torches.',
        'inventory': 'You are carrying: 312 tiles, 17 rewards, 3 boosters, 847 code blocks.',
        'status': `Level 7 Apprentice Architect | XP: 2,450/3,000 | Streak: 7 days | Quests: 47 completed`,
        'check coherence': 'Fleet Coherence: gamma + H = 1.127 (Stable)',
      };
      const responseText = responses[input.toLowerCase()] ?? `Command "${input}" executed. The system echoes your words back.`;

      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: input.toLowerCase().startsWith('talk') ? 'agent' : 'system',
        text: responseText,
        timestamp: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      }]);
    }, 400);

    setInput('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <section className="w-full border-t border-[#252536]" style={{ background: '#0A0A0F' }}>
      {/* Command Log */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        <div className="h-40 overflow-y-auto py-4 space-y-2 scroll-smooth">
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2"
              >
                <span className="text-[10px] text-[#3A3A50] font-mono mt-0.5 shrink-0">{log.timestamp}</span>
                {log.type === 'user' && (
                  <>
                    <span className="text-amber-400 font-terminal text-base shrink-0">&gt;</span>
                    <span className="text-[#E8E8F0] font-terminal text-base">{log.text}</span>
                  </>
                )}
                {log.type === 'system' && (
                  <span className="text-[#8A8AA8] font-terminal text-base italic">{log.text}</span>
                )}
                {log.type === 'agent' && (
                  <span className="text-[#4A90D9] font-terminal text-base">{log.text}</span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div
        className="w-full border-t border-[#252536] px-4 lg:px-8 py-3"
        style={{ background: '#0A0A0F' }}
      >
        <div className="max-w-[1200px] mx-auto relative">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <span className="text-amber-400 font-terminal text-xl shrink-0">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => input.length > 0 && setFilteredSuggestions(suggestions.filter(s => s.includes(input.toLowerCase()))) && setShowSuggestions(true)}
              placeholder="Enter command or speak to agents..."
              className="flex-1 bg-transparent text-[#E8E8F0] font-terminal text-base placeholder:text-[#3A3A50] focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="p-2 rounded-lg text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="submit"
              className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Autocomplete dropdown */}
          <AnimatePresence>
            {showSuggestions && filteredSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute bottom-full left-8 right-16 mb-1 rounded-lg border border-[#252536] overflow-hidden"
                style={{ background: '#1A1A26' }}
              >
                {filteredSuggestions.map((suggestion, i) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`
                      w-full text-left px-4 py-2 text-sm font-terminal transition-colors
                      ${i === 0 ? 'bg-amber-500/10 text-amber-300' : 'text-[#8A8AA8] hover:bg-[#252536]'}
                    `}
                  >
                    {suggestion}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
