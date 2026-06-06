import { useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge, type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BookOpen, Map, DraftingCompass, AlertTriangle, Scroll, Terminal, FlaskConical } from 'lucide-react';
import type { PLATOTile, TileType } from '@/lib/tiles';
import { TILE_TYPE_CONFIG, RARITY_COLORS } from '@/lib/tiles';

const iconMap: Record<TileType, React.ElementType> = {
  Book: BookOpen, Map, Blueprint: DraftingCompass, Warning: AlertTriangle,
  Scroll, Console: Terminal, Vial: FlaskConical,
};

interface KnowledgeNetworkProps {
  tiles: PLATOTile[];
  onNodeClick: (tile: PLATOTile) => void;
}

interface CustomNodeData extends Record<string, unknown> {
  tile: PLATOTile;
  onClick: (tile: PLATOTile) => void;
}

function CustomNode({ data }: { data: CustomNodeData }) {
  const { tile, onClick } = data;
  const config = TILE_TYPE_CONFIG[tile.type];
  const Icon = iconMap[tile.type];
  const rarityColor = RARITY_COLORS[tile.rarity];
  const size = tile.rarity === 'legendary' ? 48 : tile.rarity === 'epic' ? 40 : tile.rarity === 'rare' ? 34 : tile.rarity === 'uncommon' ? 28 : 24;

  return (
    <div
      className="group cursor-pointer flex flex-col items-center"
      onClick={() => onClick(tile)}
    >
      <div
        className="rounded-full flex items-center justify-center border-2 transition-all duration-200 group-hover:scale-110"
        style={{
          width: size,
          height: size,
          background: `${config.color}30`,
          borderColor: config.color,
          boxShadow: `0 0 ${tile.rarity === 'legendary' ? 16 : 8}px ${config.color}40`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
      </div>
      <span className="text-[9px] text-void-300 mt-1 max-w-[80px] truncate group-hover:text-amber-300 transition-colors">
        {tile.name}
      </span>
      <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: rarityColor }} />
    </div>
  );
}

const nodeTypes = {
  tileNode: CustomNode as unknown as NodeTypes[string],
};

export default function KnowledgeNetwork({ tiles, onNodeClick }: KnowledgeNetworkProps) {
  // Generate nodes and edges from tiles
  const { nodes, edges } = useMemo(() => {
    const graphNodes: Node<CustomNodeData>[] = tiles.map((tile, i) => {
      // Position nodes in a spiral pattern
      const angle = i * 0.7;
      const radius = 100 + (i % 5) * 80;
      const x = 400 + Math.cos(angle) * radius + (Math.random() - 0.5) * 60;
      const y = 250 + Math.sin(angle) * radius + (Math.random() - 0.5) * 60;

      return {
        id: tile.id,
        type: 'tileNode',
        position: { x, y },
        data: { tile, onClick: onNodeClick },
        draggable: true,
      };
    });

    const graphEdges: Edge[] = [];
    tiles.forEach((tile, i) => {
      // Create edges to related tiles
      tile.relatedTileIds.forEach((relatedId, j) => {
        if (tiles.some(t => t.id === relatedId)) {
          graphEdges.push({
            id: `e-${tile.id}-${relatedId}-${j}`,
            source: tile.id,
            target: relatedId,
            style: { stroke: `${TILE_TYPE_CONFIG[tile.type].color}40`, strokeWidth: 1 },
            animated: tile.rarity === 'epic' || tile.rarity === 'legendary',
          });
        }
      });
      // Connect tiles of same type
      const sameType = tiles.filter((t, idx) => t.type === tile.type && idx > i);
      sameType.slice(0, 2).forEach(st => {
        graphEdges.push({
          id: `e-same-${tile.id}-${st.id}`,
          source: tile.id,
          target: st.id,
          style: { stroke: `${TILE_TYPE_CONFIG[tile.type].color}20`, strokeWidth: 1, strokeDasharray: '4 4' },
        });
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [tiles, onNodeClick]);

  return (
    <div style={{ height: 500 }} className="rounded-xl border border-void-600 overflow-hidden bg-void-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3A3A50" gap={20} size={1} />
        <Controls className="!bg-void-700 !border-void-600" />
        <MiniMap
          className="!bg-void-800 !border-void-600"
          nodeColor={(node) => {
            const tile = ((node.data as unknown) as CustomNodeData)?.tile;
            return tile ? TILE_TYPE_CONFIG[tile.type].color : '#5A5A78';
          }}
          maskColor="#0A0A0F80"
        />
      </ReactFlow>
    </div>
  );
}
