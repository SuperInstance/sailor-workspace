import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, LockOpen } from 'lucide-react';
import type { SkillTree, SkillNode, AgentType } from '@/lib/agents';

interface SkillTreeViewerProps {
  skillTree: SkillTree;
  agentType: AgentType;
  onUnlock: (nodeId: string) => void;
  availableXp: number;
}

export default function SkillTreeViewer({ skillTree, agentType, onUnlock, availableXp }: SkillTreeViewerProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [confirmNode, setConfirmNode] = useState<string | null>(null);

  const handleNodeHover = (nodeId: string | null, e?: React.MouseEvent) => {
    setHoveredNode(nodeId);
    if (e) {
      const rect = (e.target as HTMLElement).closest('svg')?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  };

  const handleNodeClick = (node: SkillNode) => {
    if (node.available && !node.unlocked) {
      setConfirmNode(node.id);
    }
  };

  const confirmUnlock = () => {
    if (confirmNode) {
      onUnlock(confirmNode);
      setConfirmNode(null);
    }
  };

  // Build connections from prerequisites
  const connections: { from: SkillNode; to: SkillNode }[] = [];
  for (const node of skillTree.nodes) {
    for (const prereq of node.prerequisites) {
      const fromNode = skillTree.nodes.find(n => n.id === prereq);
      if (fromNode) connections.push({ from: fromNode, to: node });
    }
  }

  const hoveredNodeData = skillTree.nodes.find(n => n.id === hoveredNode);
  const confirmNodeData = skillTree.nodes.find(n => n.id === confirmNode);

  return (
    <div className="relative">
      {/* SVG Skill Tree */}
      <div className="relative overflow-auto rounded-xl border border-void-600 bg-void-900" style={{ minHeight: 480 }}>
        <svg viewBox="0 0 800 480" className="w-full h-full" style={{ minHeight: 480 }}>
          {/* Connections */}
          {connections.map((conn, i) => {
            const isHighlighted = hoveredNode === conn.from.id || hoveredNode === conn.to.id;
            const isUnlocked = conn.from.unlocked && conn.to.unlocked;
            const isAvailable = conn.from.unlocked && !conn.to.unlocked;
            return (
              <motion.line
                key={`${conn.from.id}-${conn.to.id}`}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                stroke={isUnlocked ? agentType.color : isAvailable ? `${agentType.color}60` : '#3A3A50'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeDasharray={isUnlocked ? '0' : isAvailable ? '6 4' : '4 8'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                style={{ opacity: isHighlighted ? 1 : 0.7 }}
              />
            );
          })}

          {/* Tier labels */}
          {[1, 2, 3, 4].map(tier => {
            const labels = ['', 'Basic', 'Advanced', 'Mastery', 'Ultimate'];
            const yPos = tier === 1 ? 430 : tier === 2 ? 310 : tier === 3 ? 190 : 90;
            return (
              <text key={tier} x={30} y={yPos} fill="#5A5A78" fontSize="11" fontFamily="Inter">
                {labels[tier]} (Lv.{tier === 1 ? 1 : tier === 2 ? 5 : tier === 3 ? 10 : 20})
              </text>
            );
          })}

          {/* Nodes */}
          {skillTree.nodes.map((node, i) => {
            const isHighlighted = hoveredNode === node.id;
            const hasPrereqHover = node.prerequisites.some(p => p === hoveredNode);
            const isRevealed = node.unlocked || node.available || isHighlighted || hasPrereqHover;

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: isRevealed ? 1 : 0.3 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
                onMouseEnter={(e) => handleNodeHover(node.id, e as unknown as React.MouseEvent)}
                onMouseLeave={() => handleNodeHover(null)}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: node.available && !node.unlocked ? 'pointer' : 'default' }}
              >
                {/* Glow for unlocked */}
                {node.unlocked && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={28}
                    fill="none"
                    stroke={agentType.color}
                    strokeWidth={1}
                    opacity={0.3}
                    animate={{ r: [26, 32, 26], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={22}
                  fill={node.unlocked ? agentType.color : node.available ? `${agentType.color}30` : '#252536'}
                  stroke={node.unlocked ? agentType.color : node.available ? agentType.color : '#3A3A50'}
                  strokeWidth={isHighlighted ? 2.5 : node.unlocked ? 2 : 1.5}
                  strokeDasharray={node.available && !node.unlocked ? '4 3' : '0'}
                />

                {/* Inner icon */}
                <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
                  <div className="flex items-center justify-center w-full h-full">
                    {node.unlocked ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : node.available ? (
                      <LockOpen className="w-4 h-4" style={{ color: agentType.color }} />
                    ) : (
                      <Lock className="w-4 h-4 text-void-500" />
                    )}
                  </div>
                </foreignObject>

                {/* Node label */}
                <text
                  x={node.x}
                  y={node.y + 38}
                  textAnchor="middle"
                  fill={node.unlocked ? agentType.color : node.available ? '#8A8AA8' : '#5A5A78'}
                  fontSize="10"
                  fontFamily="Inter"
                  fontWeight={node.unlocked ? 600 : 400}
                >
                  {node.name}
                </text>
              </motion.g>
            );
          })}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNodeData && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 pointer-events-none bg-void-700 border border-void-600 rounded-lg p-3 shadow-xl"
              style={{ left: Math.min(tooltipPos.x + 20, 400), top: Math.max(tooltipPos.y - 60, 10), maxWidth: 220 }}
            >
              <h4 className="text-sm font-semibold text-void-100">{hoveredNodeData.name}</h4>
              <p className="text-xs text-void-300 mt-1">{hoveredNodeData.description}</p>
              {!hoveredNodeData.unlocked && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-amber-400 font-mono">{hoveredNodeData.xpCost} XP</span>
                  {hoveredNodeData.prerequisites.length > 0 && (
                    <span className="text-[10px] text-void-400">Requires: {hoveredNodeData.prerequisites.join(', ')}</span>
                  )}
                </div>
              )}
              {hoveredNodeData.unlocked && (
                <span className="text-[10px] text-quest-green">Unlocked</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirm unlock modal */}
      <AnimatePresence>
        {confirmNodeData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-void-900/80"
            onClick={() => setConfirmNode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-void-800 border border-void-600 rounded-xl p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-display text-lg font-semibold text-void-100 mb-2">Unlock {confirmNodeData.name}?</h3>
              <p className="text-sm text-void-300 mb-1">{confirmNodeData.description}</p>
              <p className="text-sm text-amber-400 font-mono mb-4">Cost: {confirmNodeData.xpCost} XP</p>
              <div className="flex gap-3">
                <button
                  onClick={confirmUnlock}
                  disabled={availableXp < confirmNodeData.xpCost}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: agentType.color, color: '#0A0A0F' }}
                >
                  {availableXp >= confirmNodeData.xpCost ? 'Unlock' : 'Not enough XP'}
                </button>
                <button
                  onClick={() => setConfirmNode(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-void-300 bg-void-700 hover:bg-void-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
