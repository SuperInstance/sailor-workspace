import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  type Connection, type Edge, type Node,
  Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Activity, Plus, Server } from 'lucide-react';
import type { BackendRoom } from '@/lib/blocks';
import { BACKEND_ROOMS } from '@/lib/blocks';

interface BackendRoomViewProps {
  isActive: boolean;
}

// Custom node component for backend rooms
function RoomNode({ data }: { data: Record<string, unknown> }) {
  const room = data as unknown as BackendRoom;
  const [showDetails, setShowDetails] = useState(false);

  const statusColor = room.status === 'healthy' ? '#4ADE80' : room.status === 'warning' ? '#E8B820' : '#D94A4A';

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <div
        className="w-[200px] rounded-xl border p-3 cursor-pointer transition-shadow hover:shadow-lg"
        style={{
          backgroundColor: '#12121A',
          borderColor: room.color + '40',
          boxShadow: `0 0 20px ${room.color}15`,
        }}
      >
        {/* Target handle (top) */}
        <Handle type="target" position={Position.Top} style={{ background: room.color, border: 'none' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4" style={{ color: room.color }} />
            <span className="text-xs font-semibold text-[#E8E8F0] font-ui truncate">{room.name}</span>
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
          />
        </div>

        {/* Metrics */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[#5A5A78] font-mono">requests</span>
            <span className="text-[10px] text-[#8A8AA8] font-mono">{room.requestRate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#5A5A78]" />
            <div className="flex-1 h-1 bg-[#252536] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: room.color }}
                animate={{ width: ['40%', '70%', '50%', '40%'] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </div>

        {/* Source handle (bottom) */}
        <Handle type="source" position={Position.Bottom} style={{ background: room.color, border: 'none' }} />
      </div>

      {/* Tooltip */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-full ml-2 top-0 w-48 bg-[#1A1A26] border border-[#252536] rounded-lg p-3 z-50 shadow-xl"
        >
          <p className="text-[10px] text-[#5A5A78] font-mono mb-1">Type: {room.type}</p>
          <p className="text-[10px] text-[#5A5A78] font-mono mb-1">Status: <span style={{ color: statusColor }}>{room.status}</span></p>
          <p className="text-[10px] text-[#5A5A78] font-mono">Connections: {room.connections.length}</p>
          <div className="mt-2 pt-2 border-t border-[#252536]">
            <button className="text-[10px] text-[#E8B820] font-ui hover:underline">View logs</button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

const nodeTypes = { roomNode: RoomNode };

export default function BackendRoomView({ isActive }: BackendRoomViewProps) {
  // Build nodes from mock data
  const initialNodes: Node[] = BACKEND_ROOMS.map(room => ({
    id: room.id,
    type: 'roomNode',
    position: room.position,
    data: room as unknown as Record<string, unknown>,
  }));

  // Build edges from connections
  const initialEdges: Edge[] = BACKEND_ROOMS.flatMap(room =>
    room.connections.map((targetId, i) => ({
      id: `e-${room.id}-${targetId}-${i}`,
      source: room.id,
      target: targetId,
      animated: true,
      style: { stroke: room.color + '80', strokeWidth: 2 },
      type: 'smoothstep' as const,
    }))
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#4A90D980', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  if (!isActive) return null;

  return (
    <div className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#252536" gap={20} size={1} />
        <Controls className="!bg-[#1A1A26] !border-[#252536]" />
        <MiniMap
          className="!bg-[#1A1A26] !border-[#252536]"
          nodeColor={(n) => (n.data as unknown as BackendRoom)?.color || '#5A5A78'}
          maskColor="#0A0A0F80"
        />
      </ReactFlow>

      {/* Add Service FAB */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const newId = `br${Date.now()}`;
          const newNode: Node = {
            id: newId,
            type: 'roomNode',
            position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
            data: {
              id: newId,
              name: 'New Service',
              type: 'custom',
              color: '#9B6DD1',
              status: 'healthy',
              requestRate: '0 req/s',
              connections: [],
              position: { x: 100, y: 100 },
            } as unknown as Record<string, unknown>,
          };
          setNodes(prev => [...prev, newNode]);
        }}
        className="absolute bottom-6 right-6 z-10 w-10 h-10 rounded-full bg-[#E8B820] hover:bg-[#E8B820]/90 flex items-center justify-center shadow-lg shadow-[#E8B820]/20"
      >
        <Plus className="w-5 h-5 text-[#0A0A0F]" />
      </motion.button>
    </div>
  );
}
