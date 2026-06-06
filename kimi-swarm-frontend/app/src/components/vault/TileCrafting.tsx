import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Map, DraftingCompass, AlertTriangle, Scroll, Terminal, FlaskConical,
  Plus, Sparkles, Wand2, FilePlus,
} from 'lucide-react';
import type { PLATOTile, TileType, Rarity } from '@/lib/tiles';
import { TILE_TYPE_CONFIG, RARITY_COLORS, SAMPLE_TILES } from '@/lib/tiles';

const iconMap: Record<TileType, React.ElementType> = {
  Book: BookOpen, Map, Blueprint: DraftingCompass, Warning: AlertTriangle,
  Scroll, Console: Terminal, Vial: FlaskConical,
};

type CraftMode = 'merge' | 'enhance' | 'create';

export default function TileCrafting() {
  const [mode, setMode] = useState<CraftMode>('merge');
  const [mergeSlots, setMergeSlots] = useState<(PLATOTile | null)[]>([null, null, null]);
  const [selectedEnhance, setSelectedEnhance] = useState<PLATOTile | null>(null);
  const [craftAnimating, setCraftAnimating] = useState(false);
  const [craftResult, setCraftResult] = useState<PLATOTile | null>(null);

  const tabs: { id: CraftMode; label: string; icon: React.ElementType }[] = [
    { id: 'merge', label: 'Merge Tiles', icon: Sparkles },
    { id: 'enhance', label: 'Enhance Tile', icon: Wand2 },
    { id: 'create', label: 'Create New', icon: FilePlus },
  ];

  const handleSlotClick = (index: number) => {
    if (craftAnimating) return;
    // Pick a random tile for demo
    const available = SAMPLE_TILES.filter(t => !mergeSlots.some(s => s?.id === t.id));
    if (available.length > 0) {
      const newSlots = [...mergeSlots];
      newSlots[index] = available[Math.floor(Math.random() * available.length)];
      setMergeSlots(newSlots);
      setCraftResult(null);
    }
  };

  const handleTransmute = () => {
    if (mergeSlots.filter(Boolean).length < 2) return;
    setCraftAnimating(true);
    setCraftResult(null);
    setTimeout(() => {
      setCraftAnimating(false);
      // Generate a synthetic result
      const types = mergeSlots.filter(Boolean).map(s => s!.type);
      const dominantType = types[0] || 'Book';
      const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const inputRarityIdx = Math.max(...mergeSlots.filter(Boolean).map(s => rarities.indexOf(s!.rarity)));
      const resultRarity = rarities[Math.min(inputRarityIdx + 1, 4)];
      const result: PLATOTile = {
        id: `crafted-${Date.now()}`,
        name: `Synthesized ${dominantType}`,
        type: dominantType,
        rarity: resultRarity,
        content: 'A synthesized knowledge artifact created by merging multiple tiles. Contains combined insights.',
        question: 'What combined knowledge does this tile hold?',
        answer: 'Merged insights from multiple sources.',
        source: 'Tile Crafting',
        sourceRoom: 'Knowledge Vault',
        agentType: 'alchemist',
        confidence: 0.85,
        tags: ['crafted', 'synthesized'],
        createdAt: new Date().toISOString(),
        timesAbsorbed: 0,
        relatedTileIds: mergeSlots.filter(Boolean).map(s => s!.id),
      };
      setCraftResult(result);
    }, 1200);
  };

  const clearSlot = (index: number) => {
    if (craftAnimating) return;
    const newSlots = [...mergeSlots];
    newSlots[index] = null;
    setMergeSlots(newSlots);
    setCraftResult(null);
  };

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === tab.id
                  ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/10'
                  : 'text-void-400 hover:text-void-200 hover:bg-void-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'merge' && (
          <motion.div
            key="merge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-4 mb-8">
              {/* Input slots */}
              {mergeSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-4">
                  {i > 0 && <Plus className="w-5 h-5 text-void-500" />}
                  <motion.div
                    whileHover={!slot ? { scale: 1.05 } : {}}
                    whileTap={!slot ? { scale: 0.95 } : {}}
                    onClick={() => slot ? clearSlot(i) : handleSlotClick(i)}
                    className={`w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      slot ? 'border-solid' : 'border-void-600 hover:border-amber-400/50'
                    }`}
                    style={slot ? {
                      borderColor: TILE_TYPE_CONFIG[slot.type].color,
                      borderStyle: 'solid',
                      background: `${TILE_TYPE_CONFIG[slot.type].color}15`,
                    } : {}}
                  >
                    {slot ? (
                      <>
                        {(() => {
                          const Icon = iconMap[slot.type];
                          return <Icon className="w-8 h-8 mb-1" style={{ color: TILE_TYPE_CONFIG[slot.type].color }} />;
                        })()}
                        <span className="text-[10px] text-void-200 font-medium text-center px-2 line-clamp-2">{slot.name}</span>
                        <span className="text-[9px] mt-0.5" style={{ color: RARITY_COLORS[slot.rarity] }}>{slot.rarity}</span>
                      </>
                    ) : (
                      <span className="text-void-600 text-lg">+</span>
                    )}
                  </motion.div>
                </div>
              ))}

              {/* Arrow to result */}
              <div className="text-void-500 text-lg mx-2">→</div>

              {/* Result preview */}
              <motion.div
                animate={craftAnimating ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.5, repeat: craftAnimating ? Infinity : 0 }}
                className="w-32 h-32 rounded-xl border-2 flex flex-col items-center justify-center"
                style={craftResult ? {
                  borderColor: TILE_TYPE_CONFIG[craftResult.type].color,
                  background: `linear-gradient(135deg, ${TILE_TYPE_CONFIG[craftResult.type].color}25, ${RARITY_COLORS[craftResult.rarity]}15)`,
                  boxShadow: `0 0 20px ${TILE_TYPE_CONFIG[craftResult.type].color}30`,
                } : {
                  borderColor: '#3A3A50',
                  borderStyle: 'dashed',
                }}
              >
                {craftResult ? (
                  <>
                    {(() => {
                      const Icon = iconMap[craftResult.type];
                      return <Icon className="w-10 h-10 mb-1" style={{ color: TILE_TYPE_CONFIG[craftResult.type].color }} />;
                    })()}
                    <span className="text-xs text-void-100 font-medium text-center px-2">{craftResult.name}</span>
                    <span className="text-[10px] mt-0.5" style={{ color: RARITY_COLORS[craftResult.rarity] }}>{craftResult.rarity}</span>
                  </>
                ) : craftAnimating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </motion.div>
                ) : (
                  <span className="text-void-600 text-xs">Result</span>
                )}
              </motion.div>
            </div>

            <button
              onClick={handleTransmute}
              disabled={mergeSlots.filter(Boolean).length < 2 || craftAnimating}
              className="px-8 py-3 rounded-lg bg-amber-500 text-void-900 font-semibold text-sm hover:bg-amber-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Transmute
            </button>
            <p className="text-xs text-void-500 mt-3">
              {mergeSlots.filter(Boolean).length < 2 ? 'Add at least 2 tiles to transmute' : 'Click tiles to select, click again to remove'}
            </p>
          </motion.div>
        )}

        {mode === 'enhance' && (
          <motion.div
            key="enhance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto"
          >
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-24 h-24 rounded-xl border-2 border-dashed border-void-600 flex items-center justify-center cursor-pointer hover:border-amber-400/50 transition-colors mb-4"
                onClick={() => {
                  if (!selectedEnhance) {
                    setSelectedEnhance(SAMPLE_TILES[Math.floor(Math.random() * SAMPLE_TILES.length)]);
                  }
                }}
              >
                {selectedEnhance ? (
                  <div className="flex flex-col items-center" onClick={() => setSelectedEnhance(null)}>
                    {(() => {
                      const Icon = iconMap[selectedEnhance.type];
                      return <Icon className="w-8 h-8 mb-1" style={{ color: TILE_TYPE_CONFIG[selectedEnhance.type].color }} />;
                    })()}
                    <span className="text-[10px] text-void-200 text-center px-2">{selectedEnhance.name}</span>
                  </div>
                ) : (
                  <span className="text-void-600 text-lg">+</span>
                )}
              </div>
            </div>

            {selectedEnhance && (
              <div className="space-y-3">
                <div className="bg-void-800 rounded-lg p-3 border border-void-700">
                  <label className="text-xs text-void-400 mb-1 block">Add Knowledge</label>
                  <textarea
                    placeholder="Enter additional knowledge content..."
                    className="w-full h-20 bg-void-700 border border-void-600 rounded-md p-2 text-sm text-void-200 placeholder-void-500 focus:border-amber-400 focus:outline-none resize-none"
                  />
                </div>
                <div className="bg-void-800 rounded-lg p-3 border border-void-700">
                  <label className="text-xs text-void-400 mb-1 block">Upgrade Rarity</label>
                  <p className="text-sm text-amber-400 font-mono">200 XP → {(() => {
                    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                    const idx = rarities.indexOf(selectedEnhance.rarity);
                    return rarities[Math.min(idx + 1, 4)];
                  })()}</p>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-amber-500 text-void-900 font-semibold text-sm hover:bg-amber-400 transition-colors">
                  Enhance Tile
                </button>
              </div>
            )}
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg mx-auto space-y-4"
          >
            <div>
              <label className="text-xs text-void-400 mb-1 block">Tile Name</label>
              <input
                type="text"
                placeholder="Enter tile name..."
                className="w-full h-10 bg-void-800 border border-void-600 rounded-lg px-3 text-sm text-void-200 placeholder-void-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-void-400 mb-1 block">Tile Type</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TILE_TYPE_CONFIG) as TileType[]).map(type => {
                  const Icon = iconMap[type];
                  return (
                    <button
                      key={type}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-void-600 hover:border-void-500 transition-colors"
                    >
                      <Icon className="w-4 h-4" style={{ color: TILE_TYPE_CONFIG[type].color }} />
                      <span className="text-xs text-void-300">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-void-400 mb-1 block">Knowledge Content</label>
              <textarea
                placeholder="Enter the knowledge this tile contains..."
                className="w-full h-28 bg-void-800 border border-void-600 rounded-lg p-3 text-sm text-void-200 placeholder-void-500 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>
            <button className="w-full py-2.5 rounded-lg bg-amber-500 text-void-900 font-semibold text-sm hover:bg-amber-400 transition-colors">
              Create Tile
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
