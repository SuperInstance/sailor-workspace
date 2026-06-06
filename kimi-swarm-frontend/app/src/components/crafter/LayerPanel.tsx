import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Layers, TreePine, Settings2 } from 'lucide-react';
import type { ForestLayer } from '@/lib/rooms';
import { FOREST_LAYERS, FOREST_LAYER_COLORS, FOREST_LAYER_DESCRIPTIONS } from '@/lib/rooms';

interface EditorLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string;
}

interface LayerPanelProps {
  activeForestLayer: ForestLayer;
  onForestLayerChange: (layer: ForestLayer) => void;
}

export default function LayerPanel({ activeForestLayer, onForestLayerChange }: LayerPanelProps) {
  const [editorLayers, setEditorLayers] = useState<EditorLayer[]>([
    { id: 'terrain', name: 'Terrain', visible: true, color: '#8B6914' },
    { id: 'objects', name: 'Objects', visible: true, color: '#4A90D9' },
    { id: 'npcs', name: 'NPCs', visible: true, color: '#5BBD76' },
    { id: 'effects', name: 'Effects', visible: true, color: '#9B6DD1' },
    { id: 'grid', name: 'Grid', visible: true, color: '#5A5A78' },
    { id: 'collision', name: 'Collision', visible: false, color: '#D94A4A' },
  ]);

  const toggleLayer = (id: string) => {
    setEditorLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  return (
    <div className="w-[200px] bg-[#12121A] border-r border-[#252536] flex flex-col overflow-y-auto">
      {/* Forest Layer Selector */}
      <div className="p-3 border-b border-[#252536]">
        <div className="flex items-center gap-2 mb-3">
          <TreePine className="w-3.5 h-3.5 text-[#5BBD76]" />
          <h3 className="font-ui font-semibold text-sm text-[#E8E8F0]">Forest Layer</h3>
        </div>
        <div className="space-y-1">
          {FOREST_LAYERS.map((layer) => {
            const color = FOREST_LAYER_COLORS[layer];
            const isActive = layer === activeForestLayer;
            return (
              <motion.button
                key={layer}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onForestLayerChange(layer)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all text-left"
                style={{
                  backgroundColor: isActive ? `${color}18` : 'transparent',
                  borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <div className="text-xs font-medium text-[#E8E8F0]">{layer}</div>
                  <div className="text-[9px] text-[#5A5A78]">{FOREST_LAYER_DESCRIPTIONS[layer]}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Editor Layer Toggles */}
      <div className="p-3 border-b border-[#252536]">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-3.5 h-3.5 text-[#8A8AA8]" />
          <h3 className="font-ui font-semibold text-sm text-[#E8E8F0]">View Layers</h3>
        </div>
        <div className="space-y-1">
          {editorLayers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => toggleLayer(layer.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1A1A26] transition-colors"
            >
              {layer.visible ? (
                <Eye className="w-3 h-3 text-[#8A8AA8]" />
              ) : (
                <EyeOff className="w-3 h-3 text-[#3A3A50]" />
              )}
              <span className={`text-xs ${layer.visible ? 'text-[#B8B8D0]' : 'text-[#3A3A50]'}`}>{layer.name}</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: layer.visible ? layer.color : '#3A3A50' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Room Properties */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-3.5 h-3.5 text-[#8A8AA8]" />
          <h3 className="font-ui font-semibold text-sm text-[#E8E8F0]">Room Settings</h3>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-[#5A5A78] uppercase tracking-wider">Room Name</label>
            <input
              type="text"
              defaultValue="Untitled Room"
              className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] focus:outline-none focus:border-[#E8B820]/40"
            />
          </div>
          <div className="flex gap-2">
            <div>
              <label className="text-[10px] text-[#5A5A78] uppercase tracking-wider">Width</label>
              <input
                type="number"
                defaultValue={32}
                className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#5A5A78] uppercase tracking-wider">Height</label>
              <input
                type="number"
                defaultValue={24}
                className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] focus:outline-none font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#5A5A78] uppercase tracking-wider">Ambient Light</label>
            <div className="flex items-center gap-2 mt-0.5">
              <input type="color" defaultValue="#1A1A26" className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer" />
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                className="flex-1 h-1 accent-[#F5CB4E]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
