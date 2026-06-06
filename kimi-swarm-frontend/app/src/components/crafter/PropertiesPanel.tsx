import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Code2, Box, Crosshair, Eye, EyeOff, Grip, RotateCcw } from 'lucide-react';

interface PropertiesPanelProps {
  selectedObject: { name: string; type: string; color: string } | null;
  onEditScript?: () => void;
}

export default function PropertiesPanel({ selectedObject, onEditScript }: PropertiesPanelProps) {
  const [opacity, setOpacity] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [collision, setCollision] = useState(true);
  const [interactive, setInteractive] = useState(true);
  const [visible, setVisible] = useState(true);

  if (!selectedObject) {
    return (
      <motion.div
        initial={{ x: 200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-[260px] bg-[#12121A] border-l border-[#252536] flex flex-col"
      >
        <div className="p-4 border-b border-[#252536]">
          <h3 className="font-ui font-semibold text-sm text-[#E8E8F0]">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Box className="w-8 h-8 text-[#252536] mx-auto mb-2" />
            <p className="text-xs text-[#3A3A50]">No object selected</p>
            <p className="text-[10px] text-[#3A3A50] mt-1">Click on an object to edit</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={selectedObject.name}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="w-[260px] bg-[#12121A] border-l border-[#252536] flex flex-col overflow-y-auto"
    >
      {/* Selection Info */}
      <div className="p-4 border-b border-[#252536]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: `${selectedObject.color}25`, border: `1px solid ${selectedObject.color}40` }}
            >
              <span className="text-xs font-bold" style={{ color: selectedObject.color }}>{selectedObject.name[0]}</span>
            </div>
            <div>
              <input
                type="text"
                defaultValue={selectedObject.name}
                className="bg-transparent text-sm font-medium text-[#E8E8F0] focus:outline-none focus:text-[#F5CB4E] w-32"
              />
              <p className="text-[10px] text-[#5A5A78]">{selectedObject.type}</p>
            </div>
          </div>
          <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transform Controls */}
      <div className="p-4 border-b border-[#252536]">
        <h4 className="text-[10px] uppercase tracking-wider text-[#5A5A78] font-medium mb-3">Transform</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-[#3A3A50] uppercase">X Position</label>
            <input type="number" defaultValue={8} className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/40" />
          </div>
          <div>
            <label className="text-[9px] text-[#3A3A50] uppercase">Y Position</label>
            <input type="number" defaultValue={6} className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/40" />
          </div>
          <div>
            <label className="text-[9px] text-[#3A3A50] uppercase">Width</label>
            <input type="number" defaultValue={48} className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/40" />
          </div>
          <div>
            <label className="text-[9px] text-[#3A3A50] uppercase">Height</label>
            <input type="number" defaultValue={48} className="w-full mt-0.5 px-2 py-1 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/40" />
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[9px] text-[#3A3A50] uppercase">Rotation</label>
          <div className="flex items-center gap-2 mt-0.5">
            <RotateCcw className="w-3 h-3 text-[#5A5A78]" />
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1 accent-[#F5CB4E]"
            />
            <span className="text-[10px] font-mono text-[#8A8AA8] w-8 text-right">{rotation}°</span>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="p-4 border-b border-[#252536]">
        <h4 className="text-[10px] uppercase tracking-wider text-[#5A5A78] font-medium mb-3">Appearance</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#8A8AA8]">Color Tint</label>
            <div className="flex items-center gap-2">
              <input type="color" defaultValue={selectedObject.color} className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs text-[#8A8AA8]">Opacity</label>
              <span className="text-[10px] font-mono text-[#8A8AA8]">{opacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full h-1 accent-[#F5CB4E]"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-[#8A8AA8]">Layer Order</label>
            <input type="number" defaultValue={1} className="w-12 px-2 py-0.5 rounded bg-[#1A1A26] border border-[#252536] text-xs text-[#E8E8F0] font-mono text-right focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Behavior */}
      <div className="p-4 border-b border-[#252536]">
        <h4 className="text-[10px] uppercase tracking-wider text-[#5A5A78] font-medium mb-3">Behavior</h4>
        <div className="space-y-2">
          {[
            { label: 'Collision', state: collision, setState: setCollision, icon: Crosshair },
            { label: 'Interactive', state: interactive, setState: setInteractive, icon: Grip },
            { label: 'Visible', state: visible, setState: setVisible, icon: visible ? Eye : EyeOff },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.setState(!item.state)}
                className="w-full flex items-center justify-between py-1.5 rounded hover:bg-[#1A1A26] px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-[#5A5A78]" />
                  <span className="text-xs text-[#8A8AA8]">{item.label}</span>
                </div>
                <div className={`w-7 h-4 rounded-full transition-colors relative ${item.state ? 'bg-[#4ADE80]' : 'bg-[#252536]'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${item.state ? 'left-3.5' : 'left-0.5'}`} />
                </div>
              </button>
            );
          })}
          <button
            onClick={onEditScript}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-lg border border-[#9B6DD1]/30 text-[#9B6DD1] text-xs font-medium hover:bg-[#9B6DD1]/10 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            Edit Script
          </button>
        </div>
      </div>
    </motion.div>
  );
}
