import { useState } from 'react';
import { motion } from 'framer-motion';
import { TreePine, ArrowUp, ArrowDown } from 'lucide-react';
import type { ForestLayer } from '@/lib/rooms';
import { FOREST_LAYERS, FOREST_LAYER_COLORS, FOREST_LAYER_DESCRIPTIONS } from '@/lib/rooms';

interface ForestLayerIndicatorProps {
  activeLayer?: ForestLayer;
  onLayerChange?: (layer: ForestLayer) => void;
}

export default function ForestLayerIndicator({ activeLayer = 'Floor', onLayerChange }: ForestLayerIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeIndex = FOREST_LAYERS.indexOf(activeLayer);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Collapsed indicator */}
      <div className="flex items-center gap-2 mb-2">
        <TreePine className="w-4 h-4 text-[#5BBD76]" />
        <span className="text-xs text-[#5A5A78] font-medium">AI-Forest</span>
      </div>

      {/* Vertical layer stack */}
      <div className="flex flex-col gap-0.5">
        {FOREST_LAYERS.map((layer, i) => {
          const color = FOREST_LAYER_COLORS[layer];
          const isActive = layer === activeLayer;
          const isVisible = isExpanded || isActive || Math.abs(i - activeIndex) <= 1;

          if (!isVisible) return null;

          return (
            <motion.button
              key={layer}
              onClick={() => { onLayerChange?.(layer); setIsExpanded(false); }}
              whileHover={{ scale: 1.05, x: 4 }}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: isActive ? `${color}20` : '#12121A',
                borderLeft: `3px solid ${isActive ? color : 'transparent'}`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <div className="text-left">
                <div className="text-xs font-medium text-[#E8E8F0] leading-tight">{layer}</div>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-[9px] text-[#5A5A78] leading-tight"
                  >
                    {FOREST_LAYER_DESCRIPTIONS[layer]}
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-1 p-1 rounded text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors"
      >
        {isExpanded ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      </button>

      {/* Visual bar */}
      <div className="w-1 h-16 rounded-full bg-[#252536] overflow-hidden mt-1 relative">
        {FOREST_LAYERS.map((layer, i) => {
          const color = FOREST_LAYER_COLORS[layer];
          const segmentHeight = 100 / FOREST_LAYERS.length;
          return (
            <div
              key={layer}
              className="absolute w-full transition-opacity"
              style={{
                top: `${i * segmentHeight}%`,
                height: `${segmentHeight}%`,
                backgroundColor: color,
                opacity: layer === activeLayer ? 1 : 0.3,
              }}
            />
          );
        })}
        {/* Active indicator */}
        <motion.div
          className="absolute w-3 h-3 -left-1 rounded-full border-2 border-[#0A0A0F]"
          style={{ backgroundColor: FOREST_LAYER_COLORS[activeLayer] }}
          animate={{ top: `${(activeIndex / FOREST_LAYERS.length) * 100 + 10}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>
    </motion.div>
  );
}
