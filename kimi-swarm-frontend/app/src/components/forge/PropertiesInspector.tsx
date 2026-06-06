import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layout, Palette, Type, MousePointer, Database, RotateCcw } from 'lucide-react';

interface PropertiesInspectorProps {
  selectedType: string | null;
}

const tabs = [
  { id: 'layout', label: 'Layout', icon: Layout },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'content', label: 'Content', icon: Type },
  { id: 'interactions', label: 'Interactions', icon: MousePointer },
  { id: 'data', label: 'Data', icon: Database },
];

export default function PropertiesInspector({ selectedType }: PropertiesInspectorProps) {
  const [activeTab, setActiveTab] = useState('layout');
  const [padding, setPadding] = useState({ top: 16, right: 16, bottom: 16, left: 16 });
  const [margin, setMargin] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [bgColor, setBgColor] = useState('#12121A');
  const [textColor, setTextColor] = useState('#E8E8F0');
  const [opacity, setOpacity] = useState(100);
  const [borderRadius, setBorderRadius] = useState(8);

  const presetColors = [
    '#0A0A0F', '#12121A', '#1A1A26', '#252536',
    '#E8E8F0', '#B8B8D0', '#8A8AA8', '#5A5A78',
    '#E8B820', '#4ADE80', '#D94A4A', '#4A90D9',
  ];

  return (
    <div className="w-[300px] flex-shrink-0 bg-[#12121A] border-l border-[#252536] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#252536]">
        {selectedType ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#4A90D9]/20 border border-[#4A90D9] flex items-center justify-center">
              <Layout className="w-3 h-3 text-[#4A90D9]" />
            </div>
            <span className="text-sm font-semibold text-[#E8E8F0] font-ui">{selectedType}</span>
          </div>
        ) : (
          <span className="text-sm text-[#5A5A78] font-ui">Select a component</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#252536] overflow-x-auto hide-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium font-ui transition-colors whitespace-nowrap border-b-2 ${
                isActive
                  ? 'text-[#E8B820] border-[#E8B820]'
                  : 'text-[#5A5A78] border-transparent hover:text-[#8A8AA8]'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'layout' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Dimensions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider">Dimensions</label>
                <RotateCcw className="w-3 h-3 text-[#5A5A78] cursor-pointer hover:text-[#8A8AA8]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] text-[#5A5A78] font-mono block mb-1">W</span>
                  <div className="flex items-center bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1">
                    <input type="text" defaultValue="auto" className="w-full bg-transparent text-[11px] text-[#E8E8F0] font-mono focus:outline-none" />
                    <span className="text-[9px] text-[#5A5A78] font-mono ml-1">px</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-[#5A5A78] font-mono block mb-1">H</span>
                  <div className="flex items-center bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1">
                    <input type="text" defaultValue="auto" className="w-full bg-transparent text-[11px] text-[#E8E8F0] font-mono focus:outline-none" />
                    <span className="text-[9px] text-[#5A5A78] font-mono ml-1">px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Padding */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Padding</label>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                  <div key={side}>
                    <span className="text-[9px] text-[#5A5A78] font-mono uppercase block mb-1">{side[0]}</span>
                    <input
                      type="number"
                      value={padding[side]}
                      onChange={e => setPadding(prev => ({ ...prev, [side]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Margin</label>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                  <div key={side}>
                    <span className="text-[9px] text-[#5A5A78] font-mono uppercase block mb-1">{side[0]}</span>
                    <input
                      type="number"
                      value={margin[side]}
                      onChange={e => setMargin(prev => ({ ...prev, [side]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Display */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Display</label>
              <div className="grid grid-cols-4 gap-1">
                {['block', 'flex', 'grid', 'inline'].map(d => (
                  <button key={d} className={`px-2 py-1 rounded text-[9px] font-mono capitalize transition-colors ${
                    d === 'flex' ? 'bg-[#E8B820]/15 text-[#E8B820] border border-[#E8B820]/30' : 'bg-[#0A0A0F] text-[#5A5A78] border border-[#252536] hover:text-[#8A8AA8]'
                  }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'style' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Background */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#252536] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="flex-1 bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {presetColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className="w-5 h-5 rounded-sm border border-[#252536] hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#252536] bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="flex-1 bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50"
                />
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider">Opacity</label>
                <span className="text-[10px] text-[#E8E8F0] font-mono">{opacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={opacity}
                onChange={e => setOpacity(parseInt(e.target.value))}
                className="w-full h-1 bg-[#252536] rounded-full appearance-none cursor-pointer accent-[#E8B820]"
              />
            </div>

            {/* Border Radius */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider">Border Radius</label>
                <span className="text-[10px] text-[#E8E8F0] font-mono">{borderRadius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                value={borderRadius}
                onChange={e => setBorderRadius(parseInt(e.target.value))}
                className="w-full h-1 bg-[#252536] rounded-full appearance-none cursor-pointer accent-[#E8B820]"
              />
            </div>

            {/* Shadow */}
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Shadow</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>None</option>
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
                <option>Amber Glow</option>
              </select>
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Text Content</label>
              <textarea
                defaultValue={selectedType || 'Select a component to edit'}
                rows={3}
                className="w-full bg-[#0A0A0F] border border-[#252536] rounded-lg px-3 py-2 text-xs text-[#E8E8F0] font-ui focus:outline-none focus:border-[#E8B820]/50 resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Font Size</label>
              <div className="grid grid-cols-5 gap-1">
                {['xs', 'sm', 'base', 'lg', 'xl'].map(s => (
                  <button key={s} className={`px-2 py-1 rounded text-[9px] font-mono capitalize transition-colors ${
                    s === 'base' ? 'bg-[#E8B820]/15 text-[#E8B820] border border-[#E8B820]/30' : 'bg-[#0A0A0F] text-[#5A5A78] border border-[#252536]'
                  }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Font Weight</label>
              <div className="grid grid-cols-4 gap-1">
                {['300', '400', '500', '600', '700'].map(w => (
                  <button key={w} className={`px-2 py-1 rounded text-[9px] font-mono transition-colors ${
                    w === '400' ? 'bg-[#E8B820]/15 text-[#E8B820] border border-[#E8B820]/30' : 'bg-[#0A0A0F] text-[#5A5A78] border border-[#252536]'
                  }`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'interactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">On Click</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>None</option>
                <option>Navigate to page</option>
                <option>Toggle state</option>
                <option>Call API</option>
                <option>Trigger animation</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">On Hover</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>No effect</option>
                <option>Scale up</option>
                <option>Change color</option>
                <option>Show tooltip</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Entrance Animation</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>None</option>
                <option>Fade in</option>
                <option>Slide up</option>
                <option>Scale in</option>
                <option>Bounce</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Duration</label>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                defaultValue={300}
                className="w-full h-1 bg-[#252536] rounded-full appearance-none cursor-pointer accent-[#E8B820]"
              />
              <div className="flex justify-between text-[9px] text-[#5A5A78] font-mono mt-1">
                <span>100ms</span>
                <span>2s</span>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'data' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Bind to State</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>None</option>
                <option>userName (string)</option>
                <option>roomCount (number)</option>
                <option>isLoading (boolean)</option>
                <option>agents (array)</option>
                <option>currentRoom (object)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Transform</label>
              <select className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50">
                <option>None</option>
                <option>Uppercase</option>
                <option>Lowercase</option>
                <option>Date format</option>
                <option>Number format</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#8A8AA8] font-ui uppercase tracking-wider block mb-2">Fallback</label>
              <input
                type="text"
                placeholder="Value when null..."
                className="w-full bg-[#0A0A0F] border border-[#252536] rounded px-2 py-1.5 text-[11px] text-[#E8E8F0] font-mono focus:outline-none focus:border-[#E8B820]/50 placeholder-[#3A3A50]"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
