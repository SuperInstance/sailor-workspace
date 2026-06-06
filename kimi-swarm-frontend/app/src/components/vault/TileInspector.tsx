import { motion } from 'framer-motion';
import {
  X, BookOpen, Map, DraftingCompass, AlertTriangle, Scroll, Terminal, FlaskConical,
  Share2, Star, Trash2, ArrowRight, Sparkles,
} from 'lucide-react';
import type { PLATOTile, TileType } from '@/lib/tiles';
import { TILE_TYPE_CONFIG, RARITY_COLORS, SAMPLE_TILES } from '@/lib/tiles';

const iconMap: Record<TileType, React.ElementType> = {
  Book: BookOpen, Map, Blueprint: DraftingCompass, Warning: AlertTriangle,
  Scroll, Console: Terminal, Vial: FlaskConical,
};

interface TileInspectorProps {
  tile: PLATOTile | null;
  onClose: () => void;
  onSelectRelated: (tile: PLATOTile) => void;
}

export default function TileInspector({ tile, onClose, onSelectRelated }: TileInspectorProps) {
  if (!tile) return null;

  const config = TILE_TYPE_CONFIG[tile.type];
  const Icon = iconMap[tile.type];
  const rarityColor = RARITY_COLORS[tile.rarity];
  const relatedTiles = SAMPLE_TILES.filter(t => tile.relatedTileIds.includes(t.id)).slice(0, 6);
  const createdDate = new Date(tile.createdAt).toLocaleDateString();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[150] bg-void-900/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 440, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-16 bottom-0 w-full max-w-[440px] z-[160] overflow-y-auto"
        style={{
          background: '#12121A',
          borderLeft: `1px solid ${config.color}40`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-void-700 flex items-center justify-center text-void-400 hover:text-void-100 hover:bg-void-600 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${config.color}30, ${config.color}10)` }}
          >
            <Icon className="w-10 h-10" style={{ color: config.color }} />
          </div>
          <h2 className="font-display text-xl font-semibold text-void-100 pr-8">{tile.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: `${config.color}15`, color: config.color }}
            >
              {tile.type}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
              style={{ background: `${rarityColor}15`, color: rarityColor }}
            >
              {tile.rarity}
            </span>
          </div>
        </div>

        {/* Knowledge Content */}
        <div className="px-6 pb-4">
          <h3 className="text-xs font-semibold text-void-400 uppercase tracking-wider mb-3">Knowledge</h3>

          {/* Q&A */}
          <div className="bg-void-700/50 rounded-lg p-4 mb-3 border border-void-600">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-void-200 font-medium">{tile.question}</p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-quest-green mt-0.5 flex-shrink-0" />
              <p className="text-sm text-void-300">{tile.answer}</p>
            </div>
          </div>

          {/* Full content */}
          <p className="text-sm text-void-300 leading-relaxed">{tile.content}</p>
        </div>

        {/* Metadata */}
        <div className="px-6 pb-4">
          <h3 className="text-xs font-semibold text-void-400 uppercase tracking-wider mb-3">Metadata</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Source Room</span>
              <p className="text-sm text-void-200 font-medium mt-0.5">{tile.sourceRoom}</p>
            </div>
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Collected By</span>
              <p className="text-sm text-void-200 font-medium mt-0.5">{tile.source}</p>
            </div>
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Date</span>
              <p className="text-sm text-void-200 font-medium mt-0.5">{createdDate}</p>
            </div>
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Confidence</span>
              <p className="text-sm font-medium mt-0.5" style={{ color: tile.confidence > 0.9 ? '#4ADE80' : tile.confidence > 0.7 ? '#F5CB4E' : '#EF4444' }}>
                {(tile.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Times Absorbed</span>
              <p className="text-sm text-void-200 font-medium mt-0.5">{tile.timesAbsorbed}</p>
            </div>
            <div className="bg-void-800/60 rounded-lg p-3 border border-void-700">
              <span className="text-[10px] text-void-500 uppercase">Agent Type</span>
              <p className="text-sm text-void-200 font-medium mt-0.5 capitalize">{tile.agentType}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tile.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-void-700 rounded-md text-[10px] text-void-300">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related tiles */}
        {relatedTiles.length > 0 && (
          <div className="px-6 pb-4">
            <h3 className="text-xs font-semibold text-void-400 uppercase tracking-wider mb-3">Related Tiles</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {relatedTiles.map(related => {
                const rc = TILE_TYPE_CONFIG[related.type];
                const RIcon = iconMap[related.type];
                return (
                  <motion.button
                    key={related.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectRelated(related)}
                    className="flex-shrink-0 w-16 h-16 rounded-lg border border-void-600 flex flex-col items-center justify-center gap-1 hover:border-void-500 transition-colors"
                    style={{ background: `${rc.color}10` }}
                  >
                    <RIcon className="w-5 h-5" style={{ color: rc.color }} />
                    <span className="text-[8px] text-void-400 truncate w-full text-center px-1">{related.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-void-800/95 backdrop-blur border-t border-void-600 p-4 flex gap-2">
          <button className="flex-1 h-10 rounded-lg bg-amber-500 text-void-900 text-sm font-semibold hover:bg-amber-400 transition-colors flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Absorb
          </button>
          <button className="w-10 h-10 rounded-lg border border-void-600 text-void-400 hover:text-void-200 hover:bg-void-700 transition-colors flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-lg border border-void-600 text-void-400 hover:text-xp-gold hover:bg-void-700 transition-colors flex items-center justify-center">
            <Star className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-lg border border-void-600 text-void-400 hover:text-critic-red hover:bg-critic-red/10 transition-colors flex items-center justify-center">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </>
  );
}
