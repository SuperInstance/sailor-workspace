import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Map, FileText, AlertTriangle, Scroll, Monitor, FlaskConical } from 'lucide-react';
import type { PlatoTile, TileType } from '@/lib/rooms';
import { TILE_COLORS } from '@/lib/rooms';

interface TileInventoryProps {
  tiles: PlatoTile[];
}

const tileTypeIcons: Record<TileType, React.ElementType> = {
  Book: BookOpen,
  Map: Map,
  Blueprint: FileText,
  Warning: AlertTriangle,
  Scroll: Scroll,
  Console: Monitor,
  Vial: FlaskConical,
};

const tileTypeLabels: TileType[] = ['Book', 'Map', 'Blueprint', 'Warning', 'Scroll', 'Console', 'Vial'];

export default function TileInventory({ tiles }: TileInventoryProps) {
  const [filter, setFilter] = useState<TileType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  const filtered = tiles.filter((t) => {
    const matchesType = filter === 'All' || t.type === filter;
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.sourceRoom.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const recentTiles = tiles.slice(0, 5);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-xl text-[#E8E8F0]">Knowledge Inventory</h2>
          <p className="text-sm text-[#5A5A78]">{tiles.length} tiles collected</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Type filter pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('All')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'All' ? 'bg-[#252536] text-[#E8E8F0]' : 'text-[#5A5A78] hover:text-[#8A8AA8]'}`}
            >
              All
            </button>
            {tileTypeLabels.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === type ? 'text-[#E8E8F0]' : 'text-[#5A5A78] hover:text-[#8A8AA8]'}`}
                style={filter === type ? { backgroundColor: `${TILE_COLORS[type]}25` } : {}}
              >
                {type}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A26] border border-[#252536]">
            <Search className="w-3.5 h-3.5 text-[#5A5A78]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tiles..."
              className="bg-transparent text-xs text-[#E8E8F0] placeholder:text-[#3A3A50] focus:outline-none w-32"
            />
          </div>
        </div>
      </div>

      {/* Recently Absorbed */}
      <div className="mb-4">
        <p className="text-xs text-[#5A5A78] mb-2">Recently Absorbed</p>
        <div className="flex items-center gap-3">
          {recentTiles.map((tile) => (
            <motion.div
              key={tile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-[52px] h-[52px] rounded-lg flex items-center justify-center border animate-pulse-glow"
                style={{
                  backgroundColor: `${tile.color}18`,
                  borderColor: `${tile.color}40`,
                  boxShadow: `0 0 20px ${tile.color}15`,
                }}
              >
                {(() => {
                  const Icon = tileTypeIcons[tile.type];
                  return <Icon className="w-5 h-5" style={{ color: tile.color }} />;
                })()}
              </div>
              <span className="text-[9px] text-[#5A5A78] max-w-[52px] truncate">{tile.sourceRoom}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tile Grid */}
      <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((tile, i) => {
            const Icon = tileTypeIcons[tile.type];
            return (
              <motion.div
                key={tile.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                onMouseEnter={() => setHoveredTile(tile.id)}
                onMouseLeave={() => setHoveredTile(null)}
                className="relative flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all hover:scale-110"
                style={{
                  backgroundColor: hoveredTile === tile.id ? `${tile.color}20` : '#12121A',
                  border: `1px solid ${hoveredTile === tile.id ? `${tile.color}50` : '#252536'}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${tile.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: tile.color }} />
                </div>
                <span className="text-[9px] text-[#8A8AA8] truncate max-w-full text-center leading-tight">{tile.name}</span>

                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredTile === tile.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1A1A26] border border-[#252536] rounded-lg p-2 z-30 w-48 shadow-xl"
                    >
                      <p className="text-xs font-medium text-[#E8E8F0]">{tile.name}</p>
                      <p className="text-[10px] text-[#5A5A78]">from {tile.sourceRoom}</p>
                      <p className="text-[10px] text-[#8A8AA8] mt-1 line-clamp-2">{tile.knowledge}</p>
                      <span
                        className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{ backgroundColor: `${tile.color}20`, color: tile.color }}
                      >
                        {tile.rarity}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
