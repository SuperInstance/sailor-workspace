import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Mountain, Box, Sofa, Sparkles, MousePointer, BookOpen, User, ChevronUp, ChevronDown } from 'lucide-react';
import type { TerrainType, PlacedObject, NpcDef } from '@/lib/rooms';
import { TERRAIN_TYPES, OBJECT_LIBRARY, NPC_TEMPLATES } from '@/lib/rooms';

interface AssetLibraryProps {
  onTerrainSelect: (terrain: TerrainType) => void;
  onObjectSelect: (obj: PlacedObject) => void;
  onNpcSelect: (npc: NpcDef) => void;
  selectedTerrain: TerrainType;
  selectedObject: PlacedObject | null;
}

type AssetTab = 'terrain' | 'structures' | 'furniture' | 'decor' | 'interactive' | 'npcs' | 'plato';

const tabs: { id: AssetTab; label: string; icon: React.ElementType }[] = [
  { id: 'terrain', label: 'Terrain', icon: Mountain },
  { id: 'structures', label: 'Structures', icon: Box },
  { id: 'furniture', label: 'Furniture', icon: Sofa },
  { id: 'decor', label: 'Decor', icon: Sparkles },
  { id: 'interactive', label: 'Interactive', icon: MousePointer },
  { id: 'npcs', label: 'NPCs', icon: User },
  { id: 'plato', label: 'PLATO', icon: BookOpen },
];

export default function AssetLibrary({
  onTerrainSelect, onObjectSelect, onNpcSelect, selectedTerrain, selectedObject,
}: AssetLibraryProps) {
  const [activeTab, setActiveTab] = useState<AssetTab>('terrain');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categoryMap: Record<string, AssetTab> = {
    structures: 'structures',
    furniture: 'furniture',
    decor: 'decor',
    interactive: 'interactive',
    plato: 'plato',
  };

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 220, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#12121A] border-t border-[#252536] flex flex-col overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#252536]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#252536] text-[#F5CB4E]'
                      : 'text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1A1A26] border border-[#252536]">
              <Search className="w-3 h-3 text-[#5A5A78]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-transparent text-[11px] text-[#E8E8F0] placeholder:text-[#3A3A50] focus:outline-none w-20"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* Terrain */}
            {activeTab === 'terrain' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                {TERRAIN_TYPES.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())).map((terrain) => (
                  <motion.button
                    key={terrain.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onTerrainSelect(terrain.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      selectedTerrain === terrain.id
                        ? 'border-[#E8B820] bg-[#C99A10]/10'
                        : 'border-[#252536] bg-[#1A1A26] hover:border-[#3A3A50]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded"
                      style={{
                        backgroundColor: terrain.color,
                        boxShadow: `0 0 8px ${terrain.color}40`,
                      }}
                    />
                    <span className="text-[9px] text-[#8A8AA8]">{terrain.name}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Objects */}
            {(['structures', 'furniture', 'decor', 'interactive', 'plato'] as AssetTab[]).includes(activeTab) && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                {OBJECT_LIBRARY.filter((obj) => {
                  const matchTab = categoryMap[obj.category] === activeTab;
                  const matchSearch = obj.name.toLowerCase().includes(search.toLowerCase());
                  return matchTab && matchSearch;
                }).map((obj) => {
                  const isFav = favorites.has(obj.id);
                  const isSelected = selectedObject?.id === obj.id;
                  return (
                    <motion.button
                      key={obj.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onObjectSelect(obj)}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-[#E8B820] bg-[#C99A10]/10'
                          : 'border-[#252536] bg-[#1A1A26] hover:border-[#3A3A50]'
                      }`}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(obj.id); }}
                        className="absolute top-1 right-1"
                      >
                        <Star className={`w-2.5 h-2.5 ${isFav ? 'text-[#FFD700] fill-[#FFD700]' : 'text-[#3A3A50]'}`} />
                      </button>
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${obj.color}25` }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: obj.color }}>{obj.name[0]}</span>
                      </div>
                      <span className="text-[9px] text-[#8A8AA8]">{obj.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* NPCs */}
            {activeTab === 'npcs' && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                {NPC_TEMPLATES.filter((npc) => npc.name.toLowerCase().includes(search.toLowerCase())).map((npc) => (
                  <motion.button
                    key={npc.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNpcSelect(npc)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-[#252536] bg-[#1A1A26] hover:border-[#3A3A50] transition-all"
                  >
                    <div
                      className="w-8 h-10 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${npc.color}25`, border: `1px solid ${npc.color}50` }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: npc.color }}>{npc.agentType[0]}</span>
                    </div>
                    <span className="text-[9px] text-[#8A8AA8]">{npc.name}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="h-8 bg-[#12121A] border-t border-[#252536] flex items-center justify-center gap-2 text-[10px] text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        <span>Assets</span>
        {!expanded && <span className="text-[#3A3A50]">({activeTab})</span>}
      </button>
    </AnimatePresence>
  );
}
