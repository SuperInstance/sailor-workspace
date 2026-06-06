import { motion } from 'framer-motion';
import { Lightbulb, Wand2, X } from 'lucide-react';
import { DESIGN_SUGGESTIONS } from '@/lib/blocks';
import { useState } from 'react';

interface DesignSuggestionsProps {
  visible: boolean;
  onClose: () => void;
}

export default function DesignSuggestions({ visible, onClose }: DesignSuggestionsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!visible) return null;

  const visibleSuggestions = DESIGN_SUGGESTIONS.filter(s => !dismissed.has(s.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 10, x: '-50%' }}
      className="absolute bottom-16 left-1/2 z-40 w-[400px] bg-[#12121A] border border-[#252536] rounded-xl shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536]">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#9B6DD1]" />
          <span className="text-sm font-semibold text-[#E8E8F0] font-ui">Agent Suggestions</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#252536] transition-colors">
          <X className="w-3.5 h-3.5 text-[#5A5A78]" />
        </button>
      </div>

      {/* Suggestions list */}
      <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
        {visibleSuggestions.map((suggestion, i) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-[#0A0A0F] border border-[#252536] hover:border-[#E8B820]/20 transition-colors group"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: suggestion.agentColor + '20' }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: suggestion.agentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-[#E8E8F0] font-ui">{suggestion.title}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: suggestion.agentColor + '20',
                    color: suggestion.agentColor,
                  }}
                >
                  {suggestion.category}
                </span>
              </div>
              <p className="text-[11px] text-[#8A8AA8] font-ui leading-relaxed">{suggestion.description}</p>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(suggestion.id))}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <X className="w-3 h-3 text-[#5A5A78]" />
            </button>
          </motion.div>
        ))}

        {visibleSuggestions.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-[#5A5A78] font-ui">All suggestions dismissed</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
