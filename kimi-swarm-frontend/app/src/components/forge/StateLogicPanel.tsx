import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Plus, GitBranch, Zap, Database, MousePointer } from 'lucide-react';
import type { StateVial } from '@/lib/blocks';
import { STATE_VIALS } from '@/lib/blocks';

interface StateLogicPanelProps {
  isActive: boolean;
}

const typeIcons: Record<string, string> = {
  string: 'T',
  number: '#',
  boolean: '◉',
  array: '[]',
  object: '{}',
};

const typeColors: Record<string, string> = {
  string: '#4A90D9',
  number: '#E8913A',
  boolean: '#4ADE80',
  array: '#9B6DD1',
  object: '#4AD9C9',
};

// Mock spell weaving nodes
const spellNodes = [
  { id: 'sn1', label: 'userName', type: 'source', x: 20, y: 20, color: '#5BBD76' },
  { id: 'sn2', label: 'formatGreeting', type: 'transform', x: 180, y: 20, color: '#E8B820' },
  { id: 'sn3', label: 'isLoggedIn', type: 'condition', x: 180, y: 100, color: '#9B6DD1' },
  { id: 'sn4', label: 'showWelcome', type: 'effect', x: 340, y: 20, color: '#D94A4A' },
  { id: 'sn5', label: 'Header.title', type: 'sink', x: 500, y: 20, color: '#4A90D9' },
];

const spellConnections = [
  { from: 'sn1', to: 'sn2' },
  { from: 'sn2', to: 'sn3' },
  { from: 'sn3', to: 'sn4', label: 'true' },
  { from: 'sn4', to: 'sn5' },
];

export default function StateLogicPanel({ isActive }: StateLogicPanelProps) {
  const [vials, setVials] = useState<StateVial[]>(STATE_VIALS);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<StateVial['type']>('string');

  const addVial = () => {
    if (!newName.trim()) return;
    const newVial: StateVial = {
      id: `sv${Date.now()}`,
      name: newName,
      type: newType,
      value: newType === 'string' ? '' : newType === 'number' ? 0 : newType === 'boolean' ? false : [],
    };
    setVials(prev => [...prev, newVial]);
    setNewName('');
    setShowAdd(false);
  };

  if (!isActive) return null;

  return (
    <div className="w-[360px] flex-shrink-0 bg-[#12121A] border-l border-[#252536] flex flex-col h-full overflow-hidden">
      {/* State Vials Section */}
      <div className="p-4 border-b border-[#252536]">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-[#4AD9C9]" />
          <span className="text-sm font-semibold text-[#E8E8F0] font-ui">State Vials</span>
          <span className="text-[10px] text-[#5A5A78] font-mono ml-auto">{vials.length}</span>
        </div>

        <div className="space-y-1.5">
          {vials.map(vial => (
            <motion.div
              key={vial.id}
              layout
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0A0A0F] border border-[#252536] hover:border-[#4AD9C9]/30 transition-colors group cursor-pointer"
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold font-mono flex-shrink-0"
                style={{ backgroundColor: typeColors[vial.type] + '20', color: typeColors[vial.type] }}
              >
                {typeIcons[vial.type]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-[#E8E8F0] font-mono block truncate">{vial.name}</span>
              </div>
              <span className="text-[10px] text-[#5A5A78] font-mono truncate max-w-[80px]">
                {JSON.stringify(vial.value).slice(0, 20)}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Add vial */}
        {showAdd ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 p-2 rounded-lg bg-[#0A0A0F] border border-[#252536] space-y-2"
          >
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Variable name"
              className="w-full bg-[#1A1A26] border border-[#252536] rounded px-2 py-1 text-xs text-[#E8E8F0] font-mono focus:outline-none focus:border-[#4AD9C9]/50"
              onKeyDown={e => e.key === 'Enter' && addVial()}
              autoFocus
            />
            <div className="flex gap-1">
              {(['string', 'number', 'boolean', 'array', 'object'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono transition-colors ${
                    newType === t ? 'text-[#0A0A0F]' : 'text-[#8A8AA8] hover:text-[#E8E8F0]'
                  }`}
                  style={newType === t ? { backgroundColor: typeColors[t] } : { backgroundColor: '#252536' }}
                >
                  {t[0].toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={addVial} className="flex-1 py-1 rounded bg-[#4AD9C9]/20 text-[#4AD9C9] text-[10px] font-ui hover:bg-[#4AD9C9]/30 transition-colors">
                Add
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-1 rounded bg-[#252536] text-[#5A5A78] text-[10px] font-ui hover:bg-[#3A3A50] transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#4AD9C9] hover:text-[#4AD9C9]/80 font-ui transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vial
          </button>
        )}
      </div>

      {/* Spell Weaving Section */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-[#9B6DD1]" />
          <span className="text-sm font-semibold text-[#E8E8F0] font-ui">Spell Weaving</span>
        </div>

        {/* Mini node graph */}
        <div className="flex-1 bg-[#0A0A0F] rounded-lg border border-[#252536] relative overflow-hidden">
          <svg className="absolute inset-0 w-full h-full">
            {/* Connection lines */}
            {spellConnections.map((conn, i) => {
              const from = spellNodes.find(n => n.id === conn.from);
              const to = spellNodes.find(n => n.id === conn.to);
              if (!from || !to) return null;
              return (
                <g key={i}>
                  <motion.path
                    d={`M ${from.x + 60} ${from.y + 20} C ${from.x + 120} ${from.y + 20}, ${to.x - 20} ${to.y + 20}, ${to.x} ${to.y + 20}`}
                    fill="none"
                    stroke="#252536"
                    strokeWidth="1.5"
                    strokeDasharray={conn.label ? '4 2' : 'none'}
                  />
                  {/* Animated flow dot */}
                  <motion.circle
                    r="3"
                    fill={from.color}
                    opacity={0.8}
                  >
                    <animateMotion
                      dur={`${2 + i * 0.5}s`}
                      repeatCount="indefinite"
                      path={`M ${from.x + 60} ${from.y + 20} C ${from.x + 120} ${from.y + 20}, ${to.x - 20} ${to.y + 20}, ${to.x} ${to.y + 20}`}
                    />
                  </motion.circle>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {spellNodes.map(node => (
            <motion.div
              key={node.id}
              className="absolute cursor-pointer"
              style={{ left: node.x, top: node.y, width: 60 }}
              whileHover={{ scale: 1.05 }}
              drag
            >
              <div
                className="rounded-lg border p-1.5 text-center"
                style={{
                  backgroundColor: node.color + '15',
                  borderColor: node.color + '40',
                }}
              >
                {node.type === 'source' && <Database className="w-3 h-3 mx-auto mb-0.5" style={{ color: node.color }} />}
                {node.type === 'transform' && <Zap className="w-3 h-3 mx-auto mb-0.5" style={{ color: node.color }} />}
                {node.type === 'condition' && <GitBranch className="w-3 h-3 mx-auto mb-0.5" style={{ color: node.color }} />}
                {node.type === 'effect' && <FlaskConical className="w-3 h-3 mx-auto mb-0.5" style={{ color: node.color }} />}
                {node.type === 'sink' && <MousePointer className="w-3 h-3 mx-auto mb-0.5" style={{ color: node.color }} />}
                <span className="text-[8px] text-[#E8E8F0] font-mono block truncate">{node.label}</span>
              </div>
            </motion.div>
          ))}

          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1">
            {[
              { label: 'Source', color: '#5BBD76', icon: Database },
              { label: 'Transform', color: '#E8B820', icon: Zap },
              { label: 'Condition', color: '#9B6DD1', icon: GitBranch },
              { label: 'Effect', color: '#D94A4A', icon: FlaskConical },
              { label: 'Sink', color: '#4A90D9', icon: MousePointer },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <item.icon className="w-2.5 h-2.5" style={{ color: item.color }} />
                <span className="text-[8px] text-[#5A5A78] font-ui">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test button */}
        <button className="mt-3 w-full py-2 rounded-lg bg-[#9B6DD1]/15 border border-[#9B6DD1]/30 text-[#9B6DD1] text-xs font-ui hover:bg-[#9B6DD1]/25 transition-colors flex items-center justify-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Test Spell
        </button>
      </div>
    </div>
  );
}
