import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, ChevronRight,
  Box, LayoutGrid, Columns, Layers, Square,
  Heading, Type, Code, Terminal, Quote, Tag,
  TextCursorInput, AlignLeft, ListFilter, CheckSquare, ToggleLeft, SlidersHorizontal,
  PanelTop, PanelLeft, Table2, ArrowRightCircle,
  DoorOpen, User, Bookmark, BarChart2,
  Bell, SquareStack, AlertTriangle, Loader2,
  Star,
} from 'lucide-react';
import type { ForgeComponent } from '@/lib/blocks';
import { COMPONENT_LIBRARY } from '@/lib/blocks';

const iconMap: Record<string, React.ElementType> = {
  box: Box, 'layout-grid': LayoutGrid, columns: Columns, layers: Layers, square: Square,
  heading: Heading, type: Type, code: Code, terminal: Terminal, quote: Quote, tag: Tag,
  'text-cursor-input': TextCursorInput, 'align-left': AlignLeft, 'list-filter': ListFilter,
  'check-square': CheckSquare, 'toggle-left': ToggleLeft, sliders: SlidersHorizontal,
  'panel-top': PanelTop, 'panel-left': PanelLeft, tab: Table2, 'arrow-right-circle': ArrowRightCircle,
  'door-open': DoorOpen, user: User, bookmark: Bookmark, 'bar-chart-2': BarChart2,
  bell: Bell, 'square-stack': SquareStack, 'alert-triangle': AlertTriangle, loader: Loader2,
  table: LayoutGrid,
};

const catOrder = ['Layout', 'Typography', 'Form', 'Navigation', 'Data Display', 'Feedback', 'OpenRoom'];

interface ComponentLibraryProps {
  onDragStart: (comp: ForgeComponent) => void;
}

export default function ComponentLibrary({ onDragStart }: ComponentLibraryProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Layout: true, Typography: true, Form: false, Navigation: false, 'Data Display': false, Feedback: false, OpenRoom: false,
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleCat = (cat: string) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const filtered = search.trim()
    ? COMPONENT_LIBRARY.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="w-[260px] flex-shrink-0 bg-[#12121A] border-r border-[#252536] flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#252536]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A78]" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#1A1A26] border border-[#252536] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E8E8F0] placeholder-[#5A5A78] focus:outline-none focus:border-[#E8B820]/50 font-ui"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {filtered ? (
          <div className="space-y-2">
            <p className="text-xs text-[#5A5A78] font-ui mb-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.map(comp => (
              <CompItem key={comp.id} comp={comp} onDragStart={() => onDragStart(comp)} onToggleFav={toggleFav} isFav={favorites.has(comp.id)} />
            ))}
          </div>
        ) : (
          <>
            {/* Favorites */}
            {favorites.size > 0 && (
              <div className="mb-3">
                <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#1A1A26] transition-colors">
                  <Star className="w-3.5 h-3.5 text-[#E8B820]" />
                  <span className="text-xs font-semibold text-[#E8E8F0] font-ui">Favorites</span>
                </button>
                <div className="pl-2 space-y-1">
                  {COMPONENT_LIBRARY.filter(c => favorites.has(c.id)).map(comp => (
                    <CompItem key={comp.id} comp={comp} onDragStart={() => onDragStart(comp)} onToggleFav={toggleFav} isFav />
                  ))}
                </div>
              </div>
            )}
            {/* By category */}
            {catOrder.map(cat => {
              const comps = COMPONENT_LIBRARY.filter(c => c.category === cat);
              if (!comps.length) return null;
              const isOpen = expanded[cat];
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#1A1A26] transition-colors"
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#5A5A78]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#5A5A78]" />}
                    <span className="text-xs font-semibold text-[#B8B8D0] font-ui">{cat}</span>
                    <span className="text-[10px] text-[#5A5A78] ml-auto font-mono">{comps.length}</span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-2 space-y-1">
                          {comps.map(comp => (
                            <CompItem key={comp.id} comp={comp} onDragStart={() => onDragStart(comp)} onToggleFav={toggleFav} isFav={favorites.has(comp.id)} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function CompItem({ comp, onDragStart, onToggleFav, isFav }: {
  comp: ForgeComponent;
  onDragStart: () => void;
  onToggleFav: (id: string, e: React.MouseEvent) => void;
  isFav: boolean;
}) {
  const Icon = iconMap[comp.icon] || Box;
  const [isDrag, setIsDrag] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => {
        setIsDrag(true);
        onDragStart();
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(comp));
      }}
      onDragEnd={() => setIsDrag(false)}
      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1A1A26] hover:bg-[#252536] cursor-grab active:cursor-grabbing transition-all border-l-2 border-transparent hover:border-[#E8B820] hover:translate-x-0.5"
      style={{ opacity: isDrag ? 0.5 : 1 }}
    >
      <Icon className="w-4 h-4 text-[#8A8AA8] group-hover:text-[#E8B820] transition-colors flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-[#E8E8F0] font-ui truncate">{comp.name}</span>
        </div>
        <span className="text-[10px] text-[#5A5A78] font-ui truncate block">{comp.description}</span>
      </div>
      <button
        onClick={e => onToggleFav(comp.id, e)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
      >
        <Star className={`w-3 h-3 ${isFav ? 'text-[#E8B820] fill-[#E8B820]' : 'text-[#5A5A78]'}`} />
      </button>
    </div>
  );
}
