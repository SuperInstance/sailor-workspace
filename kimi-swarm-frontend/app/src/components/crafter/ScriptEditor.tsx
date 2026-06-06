import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Play, Zap, MessageSquare, Music, Sparkles, Gift, Route, Variable, Bot, GitBranch } from 'lucide-react';
import {
  ReactFlow, Background, Controls, type Node, type Edge, type Connection,
  addEdge, useNodesState, useEdgesState, Handle, Position, type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SCRIPT_NODE_TYPES } from '@/lib/rooms';

interface ScriptEditorProps {
  objectName?: string;
  onClose?: () => void;
}

// Custom node components
function EventNode({ data }: { data: { label: string; color: string } }) {
  return (
    <div className="min-w-[140px]">
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
      <div className="bg-[#E8B820] rounded-t-md px-3 py-1.5">
        <span className="text-xs font-semibold text-[#0A0A0F]">{data.label}</span>
      </div>
      <div className="bg-[#1A1A26] rounded-b-md px-3 py-2 border border-t-0 border-[#252536]">
        <span className="text-[10px] text-[#5A5A78]">Trigger</span>
      </div>
    </div>
  );
}

function ActionNode({ data }: { data: { label: string; color: string; description: string } }) {
  return (
    <div className="min-w-[140px]">
      <Handle type="target" position={Position.Top} style={{ background: '#8A8AA8' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
      <div className="rounded-t-md px-3 py-1.5" style={{ backgroundColor: data.color }}>
        <span className="text-xs font-semibold text-white">{data.label}</span>
      </div>
      <div className="bg-[#1A1A26] rounded-b-md px-3 py-2 border border-t-0 border-[#252536]">
        <span className="text-[10px] text-[#5A5A78]">{data.description}</span>
      </div>
    </div>
  );
}

function ConditionNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div className="min-w-[140px]">
      <Handle type="target" position={Position.Top} style={{ background: '#9B6DD1' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#4ADE80' }} id="true" />
      <Handle type="source" position={Position.Right} style={{ background: '#D94A4A' }} id="false" />
      <div className="bg-[#9B6DD1] px-3 py-1.5" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', padding: '12px 24px' }}>
        <span className="text-xs font-semibold text-white">{data.label}</span>
      </div>
      <div className="bg-[#1A1A26] rounded-md px-3 py-2 border border-[#252536] mt-1">
        <span className="text-[10px] text-[#5A5A78]">{data.description}</span>
      </div>
    </div>
  );
}

function VariableNode({ data }: { data: { label: string; description: string } }) {
  return (
    <div className="min-w-[120px]">
      <Handle type="target" position={Position.Top} style={{ background: '#4ADE80' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#4ADE80' }} />
      <div className="bg-[#4ADE80] rounded-full px-4 py-1.5">
        <span className="text-xs font-semibold text-[#0A0A0F]">{data.label}</span>
      </div>
      <div className="bg-[#1A1A26] rounded-md px-3 py-1 border border-[#252536] mt-1 text-center">
        <span className="text-[10px] text-[#5A5A78]">{data.description}</span>
      </div>
    </div>
  );
}

function AgentNode({ data }: { data: { label: string; color: string; description: string } }) {
  return (
    <div className="min-w-[140px]">
      <Handle type="target" position={Position.Top} style={{ background: '#D94A4A' }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
      <div className="rounded-t-md px-3 py-1.5" style={{ backgroundColor: '#D94A4A' }}>
        <span className="text-xs font-semibold text-white">{data.label}</span>
      </div>
      <div className="bg-[#1A1A26] rounded-b-md px-3 py-2 border border-t-0 border-[#252536]">
        <span className="text-[10px] text-[#5A5A78]">{data.description}</span>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  eventNode: EventNode,
  actionNode: ActionNode,
  conditionNode: ConditionNode,
  variableNode: VariableNode,
  agentNode: AgentNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'eventNode', position: { x: 250, y: 30 }, data: { label: 'On Player Enter', color: '#E8B820' } },
  { id: '2', type: 'actionNode', position: { x: 250, y: 150 }, data: { label: 'Show Dialog', color: '#5BBD76', description: 'Welcome message' } },
  { id: '3', type: 'conditionNode', position: { x: 250, y: 280 }, data: { label: 'If Quest Active', description: 'Check quest state' } },
  { id: '4', type: 'actionNode', position: { x: 100, y: 420 }, data: { label: 'Give Item', color: '#FFD700', description: 'Reward player' } },
  { id: '5', type: 'actionNode', position: { x: 400, y: 420 }, data: { label: 'Show Dialog', color: '#5BBD76', description: 'Hint message' } },
  { id: '6', type: 'agentNode', position: { x: 100, y: 550 }, data: { label: 'Summon Agent', color: '#D94A4A', description: 'Guide NPC' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#5BBD76' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#9B6DD1' } },
  { id: 'e3-4', source: '3', target: '4', sourceHandle: 'true', animated: true, style: { stroke: '#4ADE80' } },
  { id: 'e3-5', source: '3', target: '5', sourceHandle: 'false', animated: true, style: { stroke: '#D94A4A' } },
  { id: 'e4-6', source: '4', target: '6', animated: true, style: { stroke: '#D94A4A' } },
];

const paletteCategories = [
  { label: 'Events', icon: Zap, color: '#E8B820', nodes: ['On Player Enter', 'On Click', 'On Timer', 'On Quest Complete'] },
  { label: 'Actions', icon: Sparkles, color: '#4A90D9', nodes: ['Show Dialog', 'Play Sound', 'Spawn Effect', 'Give Item'] },
  { label: 'Conditions', icon: GitBranch, color: '#9B6DD1', nodes: ['If Player Has', 'If Quest Active', 'Random Chance'] },
  { label: 'Variables', icon: Variable, color: '#4ADE80', nodes: ['Set Variable', 'Get Variable'] },
  { label: 'Agents', icon: Bot, color: '#D94A4A', nodes: ['Summon Agent', 'Command Agent'] },
];

export default function ScriptEditor({ objectName = 'Untitled Object', onClose }: ScriptEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#F5CB4E' } }, eds));
  }, [setEdges]);

  const addNode = (category: string, label: string) => {
    const typeMap: Record<string, string> = {
      Events: 'eventNode',
      Actions: 'actionNode',
      Conditions: 'conditionNode',
      Variables: 'variableNode',
      Agents: 'agentNode',
    };
    const colorMap: Record<string, string> = {
      Events: '#E8B820',
      Actions: '#4A90D9',
      Conditions: '#9B6DD1',
      Variables: '#4ADE80',
      Agents: '#D94A4A',
    };
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: typeMap[category] || 'actionNode',
      position: { x: 150 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label, color: colorMap[category] || '#4A90D9', description: `${label} node` },
    };
    setNodes((prev) => [...prev, newNode]);
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-[380px] bg-[#12121A] border-l border-[#252536] flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536]">
        <div>
          <h3 className="font-ui font-semibold text-sm text-[#E8E8F0]">Script: {objectName}</h3>
          <p className="text-[10px] text-[#5A5A78]">{nodes.length} nodes · {edges.length} connections</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#4ADE80] hover:bg-[#4ADE80]/10 transition-colors" title="Run">
            <Play className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#F5CB4E] hover:bg-[#C99A10]/10 transition-colors" title="Save">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#D94A4A] hover:bg-[#D94A4A]/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Node Palette */}
      <div className="p-3 border-b border-[#252536]">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
          {paletteCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.label} className="flex-shrink-0">
                <div className="flex items-center gap-1 mb-1">
                  <Icon className="w-3 h-3" style={{ color: cat.color }} />
                  <span className="text-[10px] font-medium text-[#8A8AA8]">{cat.label}</span>
                </div>
                <div className="space-y-0.5">
                  {cat.nodes.map((node) => (
                    <button
                      key={node}
                      onClick={() => addNode(cat.label, node)}
                      className="block w-full text-left px-2 py-0.5 rounded text-[10px] text-[#5A5A78] hover:bg-[#1A1A26] hover:text-[#B8B8D0] transition-colors"
                    >
                      + {node}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini Node Canvas */}
      <div className="flex-1 min-h-[200px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#252536" gap={16} size={0.5} />
          <Controls className="!bg-[#12121A] !border-[#252536] [&>button]:!bg-[#1A1A26] [&>button]:!border-[#252536] [&>button]:!text-[#8A8AA8]" />
        </ReactFlow>
      </div>
    </motion.div>
  );
}
