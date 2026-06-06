import { motion } from 'framer-motion';
import {
  BookOpen, Map, DraftingCompass, AlertTriangle, Scroll, Terminal, FlaskConical,
} from 'lucide-react';
import type { PLATOTile, TileType } from '@/lib/tiles';
import { TILE_TYPE_CONFIG, RARITY_COLORS } from '@/lib/tiles';

const iconMap: Record<TileType, React.ElementType> = {
  Book: BookOpen, Map, Blueprint: DraftingCompass, Warning: AlertTriangle,
  Scroll, Console: Terminal, Vial: FlaskConical,
};

interface TileCardProps {
  tile: PLATOTile;
  index: number;
  onClick: (tile: PLATOTile) => void;
}

export default function TileCard({ tile, index, onClick }: TileCardProps) {
  const config = TILE_TYPE_CONFIG[tile.type];
  const Icon = iconMap[tile.type];
  const rarityColor = RARITY_COLORS[tile.rarity];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: (index % 20) * 0.02, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(tile)}
      className="group cursor-pointer rounded-xl border border-void-600 overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{
        background: '#12121A',
      }}
    >
      {/* Visual area */}
      <div
        className="relative h-24 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${config.color}20 0%, ${config.color}08 100%)` }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `radial-gradient(circle, ${config.color}25 0%, transparent 70%)` }}
        />
        {/* Rarity glow for high rarity */}
        {(tile.rarity === 'epic' || tile.rarity === 'legendary') && (
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{ background: `radial-gradient(circle, ${rarityColor}20 0%, transparent 70%)` }}
          />
        )}
        <Icon
          className="w-10 h-10 relative z-10 transition-transform duration-300 group-hover:scale-110"
          style={{ color: config.color }}
        />
        {/* Type badge */}
        <span
          className="absolute top-2 right-2 text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: `${config.color}30`, color: config.color }}
        >
          {tile.type}
        </span>
      </div>

      {/* Info area */}
      <div className="p-2.5">
        <h4 className="text-xs font-medium text-void-100 truncate">{tile.name}</h4>
        <p className="text-[10px] text-void-400 truncate mt-0.5">{tile.sourceRoom}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: rarityColor }} />
            <span className="text-[9px] text-void-500 capitalize">{tile.rarity}</span>
          </div>
          <span className="text-[9px] text-void-500 font-mono">{(tile.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </motion.div>
  );
}
