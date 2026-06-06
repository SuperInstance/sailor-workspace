import { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge, type NodeTypes, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Room } from '@/lib/rooms';
import { CATEGORY_COLORS } from '@/lib/rooms';

interface RoomMapViewProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
}

// Custom node component
function RoomNode({ data }: { data: { room: Room; onClick: (r: Room) => void } }) {
  const { room, onClick } = data;
  const color = CATEGORY_COLORS[room.category];

  return (
    <div
      className="group cursor-pointer"
      onClick={() => onClick(room)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-130"
        style={{
          backgroundColor: `${color}25`,
          borderColor: `${color}80`,
          boxShadow: `0 0 12px ${color}30`,
        }}
      >
        <span className="text-xs font-bold" style={{ color }}>{room.name.slice(0, 2).toUpperCase()}</span>
      </div>
      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#1A1A26] border border-[#252536] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
        <p className="text-xs font-medium text-[#E8E8F0]">{room.name}</p>
        <p className="text-[10px] text-[#5A5A78]">{room.agents} agents | {room.issues} issues</p>
      </div>
      {/* Glowing dot for active status */}
      {room.status === 'active' && (
        <div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0F] animate-pulse"
          style={{ backgroundColor: '#4ADE80' }}
        />
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  roomNode: RoomNode,
};

export default function RoomMapView({ rooms, onRoomClick }: RoomMapViewProps) {
  // Generate nodes from rooms - position them in a force-like layout
  const nodes: Node[] = rooms.map((room, i) => {
    const angle = (i / rooms.length) * Math.PI * 2;
    const radius = 200 + (i % 3) * 80;
    const x = 400 + Math.cos(angle) * radius;
    const y = 300 + Math.sin(angle) * radius;

    return {
      id: room.id,
      type: 'roomNode',
      position: { x, y },
      data: { room, onClick: onRoomClick || (() => {}) },
    };
  });

  // Generate edges between related rooms (same category or shared connections)
  const edges: Edge[] = [];
  rooms.forEach((room, i) => {
    // Connect to next room in same category
    const sameCategory = rooms.filter((r, j) => r.category === room.category && j !== i);
    sameCategory.slice(0, 2).forEach((related) => {
      edges.push({
        id: `${room.id}-${related.id}`,
        source: room.id,
        target: related.id,
        style: { stroke: `${CATEGORY_COLORS[room.category]}40`, strokeWidth: 1 },
        animated: room.status === 'active',
      });
    });
  });

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const room = rooms.find((r) => r.id === node.id);
    if (room && onRoomClick) onRoomClick(room);
  }, [rooms, onRoomClick]);

  return (
    <div className="w-full h-[500px] rounded-xl border border-[#252536] bg-[#0A0A0F] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#252536" gap={20} size={1} />
        <Controls className="!bg-[#12121A] !border-[#252536] [&>button]:!bg-[#1A1A26] [&>button]:!border-[#252536] [&>button]:!text-[#8A8AA8] [&>button:hover]:!bg-[#252536]" />
        <MiniMap
          className="!bg-[#12121A] !border-[#252536]"
          nodeColor={(node) => {
            const room = rooms.find((r) => r.id === node.id);
            return room ? CATEGORY_COLORS[room.category] : '#3A3A50';
          }}
          maskColor="#0A0A0F80"
        />
      </ReactFlow>
    </div>
  );
}
