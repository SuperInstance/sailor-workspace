import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { BlockCategory, ScratchBlock } from '@/lib/blocks';
import { SCRATCH_BLOCKS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/blocks';

const categories = Object.keys(CATEGORY_LABELS) as BlockCategory[];

interface BlockPaletteProps {
  onDragStart: (block: ScratchBlock) => void;
  activeCategory: BlockCategory | null;
  onToggleCategory: (cat: BlockCategory) => void;
}

export default function BlockPalette({ onDragStart, activeCategory, onToggleCategory }: BlockPaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? SCRATCH_BLOCKS.filter(b => b.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="w-[280px] flex-shrink-0 bg-[#12121A] border-r border-[#252536] flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#252536]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A78]" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1A1A26] border border-[#252536] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8F0] placeholder-[#5A5A78] focus:outline-none focus:border-[#E8B820]/50 font-ui"
          />
        </div>
      </div>

      {/* Block Categories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered ? (
          <div className="space-y-2">
            <p className="text-xs text-[#5A5A78] font-ui mb-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(block => (
              <BlockItem key={block.id} block={block} onDragStart={() => onDragStart(block)} />
            ))}
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat}>
              <button
                onClick={() => onToggleCategory(cat)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#1A1A26] transition-colors group"
              >
                {activeCategory === cat ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#5A5A78]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#5A5A78]" />
                )}
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                <span className="text-sm font-medium text-[#B8B8D0] font-ui">{CATEGORY_LABELS[cat]}</span>
              </button>
              <AnimatePresence>
                {activeCategory === cat && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                    className="overflow-hidden"
                  >
                    <div className="pl-6 pr-1 py-1 space-y-1.5">
                      {SCRATCH_BLOCKS.filter(b => b.category === cat).map(block => (
                        <BlockItem key={block.id} block={block} onDragStart={() => onDragStart(block)} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function BlockItem({ block, onDragStart }: { block: ScratchBlock; onDragStart: () => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart();
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(block));
  };

  const handleDragEnd = () => setIsDragging(false);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="cursor-grab active:cursor-grabbing select-none hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
      style={{ opacity: isDragging ? 0.6 : 1 }}
    >
      <BlockShapeRenderer block={block} />
    </div>
  );
}

export function BlockShapeRenderer({ block, mini }: { block: ScratchBlock; mini?: boolean }) {
  const baseColor = block.color;
  const darkColor = block.color + 'CC';

  const innerStyle: React.CSSProperties = {
    backgroundColor: baseColor,
    border: `1px solid ${darkColor}`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.2)`,
  };

  const textStyle: React.CSSProperties = {
    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
  };

  return (
    <div className={mini ? 'scale-75 origin-left' : ''}>
      {/* Hat block */}
      {block.shape === 'hat' && (
        <div
          className="relative px-3 py-1.5 rounded-t-xl rounded-b-lg min-w-[140px] inline-flex items-center gap-2"
          style={innerStyle}
        >
          <GripVertical className="w-3 h-3 text-white/50" />
          <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
            {block.label}
          </span>
        </div>
      )}
      {/* Stack block */}
      {block.shape === 'stack' && (
        <div
          className="relative px-3 py-1.5 rounded-lg min-w-[140px] inline-flex items-center gap-2"
          style={innerStyle}
        >
          <GripVertical className="w-3 h-3 text-white/50" />
          <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
            {block.label}
          </span>
        </div>
      )}
      {/* Cap block */}
      {block.shape === 'cap' && (
        <div
          className="relative px-3 py-1.5 rounded-t-lg rounded-b-xl min-w-[140px] inline-flex items-center gap-2"
          style={innerStyle}
        >
          <GripVertical className="w-3 h-3 text-white/50" />
          <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
            {block.label}
          </span>
        </div>
      )}
      {/* Reporter block */}
      {block.shape === 'reporter' && (
        <div
          className="relative px-3 py-1 rounded-full min-w-[80px] inline-flex items-center justify-center gap-1"
          style={innerStyle}
        >
          <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
            {block.label}
          </span>
        </div>
      )}
      {/* Boolean block */}
      {block.shape === 'boolean' && (
        <div
          className="relative px-3 py-1 min-w-[80px] inline-flex items-center justify-center gap-1"
          style={{
            ...innerStyle,
            clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)',
          }}
        >
          <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
            {block.label}
          </span>
        </div>
      )}
      {/* C-block */}
      {block.shape === 'c-block' && (
        <div className="inline-flex flex-col min-w-[160px]">
          <div
            className="px-3 py-1.5 rounded-t-lg inline-flex items-center gap-2"
            style={innerStyle}
          >
            <GripVertical className="w-3 h-3 text-white/50" />
            <span className="text-white text-xs font-medium font-ui whitespace-nowrap" style={textStyle}>
              {block.label}
            </span>
          </div>
          <div
            className="ml-6 px-4 py-3 rounded-bl-lg border-l border-b"
            style={{ borderColor: darkColor, backgroundColor: 'transparent' }}
          >
            <span className="text-[#5A5A78] text-[10px] font-ui italic">drop blocks here</span>
          </div>
          <div
            className="h-4 rounded-b-lg"
            style={{ backgroundColor: baseColor, border: `1px solid ${darkColor}`, borderTop: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
