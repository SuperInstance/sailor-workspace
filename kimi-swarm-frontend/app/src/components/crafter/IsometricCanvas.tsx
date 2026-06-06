import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TerrainType, PlacedObject, ForestLayer } from '@/lib/rooms';
import { FOREST_LAYER_COLORS } from '@/lib/rooms';
import { MousePointer2, Paintbrush, PlusSquare, Code2, Hand } from 'lucide-react';
import type { EditorMode } from './EditorToolbar';

interface CanvasTile {
  x: number;
  y: number;
  terrain: TerrainType;
  objects: PlacedObject[];
}

interface IsometricCanvasProps {
  mode: EditorMode;
  selectedTerrain: TerrainType;
  selectedObject: PlacedObject | null;
  zoom: number;
  gridVisible: boolean;
  isPlaying: boolean;
  activeLayer: ForestLayer;
  onTilePaint?: (x: number, y: number) => void;
  onObjectPlace?: (x: number, y: number, z: number) => void;
}

const GRID_W = 24;
const GRID_H = 16;
const TILE_W = 48;
const TILE_H = 24;

const terrainColorMap: Record<TerrainType, string> = {
  stone: '#1A1A26',
  amber: '#A17A0A',
  crystal: '#4AD9C9',
  moss: '#5BBD76',
  magma: '#D94A4A',
  void: '#9B6DD1',
  marble: '#4A90D9',
  workshop: '#E8913A',
};

function generateInitialGrid(): CanvasTile[][] {
  const grid: CanvasTile[][] = [];
  for (let y = 0; y < GRID_H; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_W; x++) {
      grid[y][x] = { x, y, terrain: 'stone', objects: [] };
    }
  }
  // Create some interesting patterns
  for (let y = 4; y < 8; y++) {
    for (let x = 6; x < 12; x++) {
      grid[y][x].terrain = 'amber';
    }
  }
  for (let y = 2; y < 5; y++) {
    for (let x = 14; x < 18; x++) {
      grid[y][x].terrain = 'moss';
    }
  }
  // Water pool
  for (let y = 9; y < 12; y++) {
    for (let x = 3; x < 7; x++) {
      grid[y][x].terrain = 'crystal';
    }
  }
  // Add some objects
  grid[6][8].objects.push({ id: 'o1', name: 'Table', category: 'furniture', x: 8, y: 6, z: 1, color: '#8B6914', icon: 'Table' });
  grid[6][10].objects.push({ id: 'o2', name: 'Bookshelf', category: 'furniture', x: 10, y: 6, z: 1, color: '#A17A0A', icon: 'Book' });
  grid[5][8].objects.push({ id: 'o3', name: 'Torch', category: 'decor', x: 8, y: 5, z: 1, color: '#E8B820', icon: 'Flame' });
  grid[10][5].objects.push({ id: 'o4', name: 'Portal', category: 'interactive', x: 5, y: 10, z: 1, color: '#9B6DD1', icon: 'Orbit' });
  return grid;
}

export default function IsometricCanvas({
  mode, selectedTerrain, selectedObject, zoom, gridVisible, isPlaying, activeLayer, onTilePaint, onObjectPlace,
}: IsometricCanvasProps) {
  const [grid, setGrid] = useState<CanvasTile[][]>(generateInitialGrid);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 100, y: 50 });
  const [, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTiles, setSelectedTiles] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);

  const layerTint = FOREST_LAYER_COLORS[activeLayer];

  const isoToScreen = useCallback((x: number, y: number) => {
    const sx = (x - y) * (TILE_W / 2) + offset.x;
    const sy = (x + y) * (TILE_H / 2) + offset.y;
    return { x: sx, y: sy };
  }, [offset]);

  const screenToIso = useCallback((sx: number, sy: number) => {
    const adjustedX = sx - offset.x;
    const adjustedY = sy - offset.y;
    const x = (adjustedX / (TILE_W / 2) + adjustedY / (TILE_H / 2)) / 2;
    const y = (adjustedY / (TILE_H / 2) - adjustedX / (TILE_W / 2)) / 2;
    return { x: Math.floor(x), y: Math.floor(y) };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / (zoom / 100);
    const sy = (e.clientY - rect.top) / (zoom / 100);
    const iso = screenToIso(sx, sy);
    if (iso.x >= 0 && iso.x < GRID_W && iso.y >= 0 && iso.y < GRID_H) {
      setHoveredTile({ x: iso.x, y: iso.y });
    } else {
      setHoveredTile(null);
    }

    if (isDragging && mode === 'select') {
      setOffset({
        x: offset.x + e.movementX / (zoom / 100),
        y: offset.y + e.movementY / (zoom / 100),
      });
    }
  }, [canvasRef, screenToIso, zoom, isDragging, mode, offset]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && mode === 'select')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    if (e.button === 0 && hoveredTile) {
      if (mode === 'paint') {
        setGrid((prev) => {
          const next = prev.map((row) => row.map((t) => ({ ...t })));
          next[hoveredTile.y][hoveredTile.x].terrain = selectedTerrain;
          return next;
        });
        onTilePaint?.(hoveredTile.x, hoveredTile.y);
      } else if (mode === 'place' && selectedObject) {
        setGrid((prev) => {
          const next = prev.map((row) => row.map((t) => ({ ...t, objects: [...t.objects] })));
          next[hoveredTile.y][hoveredTile.x].objects.push({
            ...selectedObject,
            id: `${selectedObject.id}-${Date.now()}`,
            x: hoveredTile.x,
            y: hoveredTile.y,
          });
          return next;
        });
        onObjectPlace?.(hoveredTile.x, hoveredTile.y, 1);
      } else if (mode === 'select') {
        const key = `${hoveredTile.x},${hoveredTile.y}`;
        setSelectedTiles((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      }
    }
  }, [hoveredTile, mode, selectedTerrain, selectedObject, onTilePaint, onObjectPlace]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const scale = zoom / 100;

  // Play mode: player position
  const [playerPos, setPlayerPos] = useState({ x: 8, y: 8 });
  useEffect(() => {
    if (!isPlaying) return;
    const handleKey = (e: KeyboardEvent) => {
      setPlayerPos((p) => {
        let { x, y } = p;
        if (e.key === 'ArrowUp' || e.key === 'w') y = Math.max(0, y - 1);
        if (e.key === 'ArrowDown' || e.key === 's') y = Math.min(GRID_H - 1, y + 1);
        if (e.key === 'ArrowLeft' || e.key === 'a') x = Math.max(0, x - 1);
        if (e.key === 'ArrowRight' || e.key === 'd') x = Math.min(GRID_W - 1, x + 1);
        return { x, y };
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden cursor-crosshair select-none"
      style={{ background: '#0A0A0F' }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Layer tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 transition-colors duration-500"
        style={{ backgroundColor: `${layerTint}08` }}
      />

      {/* Isometric Grid */}
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {grid.map((row, y) =>
          row.map((tile, x) => {
            const pos = isoToScreen(x, y);
            const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
            const isSelected = selectedTiles.has(`${x},${y}`);
            const terrainColor = terrainColorMap[tile.terrain];

            return (
              <div
                key={`${x}-${y}`}
                className="absolute transition-colors duration-100"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: TILE_W,
                  height: TILE_H,
                }}
              >
                {/* Tile diamond */}
                <div
                  className="absolute"
                  style={{
                    width: TILE_W,
                    height: TILE_H,
                    backgroundColor: isHovered
                      ? `${terrainColor}cc`
                      : isSelected
                      ? `${terrainColor}aa`
                      : terrainColor,
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                    border: gridVisible ? '1px solid rgba(37, 37, 54, 0.5)' : 'none',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.1s ease',
                    boxShadow: isHovered ? `0 0 12px ${terrainColor}60` : 'none',
                  }}
                />

                {/* Grid lines */}
                {gridVisible && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{ width: TILE_W, height: TILE_H }}
                  >
                    <line x1="50%" y1="0" x2="100%" y2="50%" stroke="#252536" strokeWidth="0.5" opacity="0.4" />
                    <line x1="100%" y1="50%" x2="50%" y2="100%" stroke="#252536" strokeWidth="0.5" opacity="0.4" />
                    <line x1="50%" y1="100%" x2="0" y2="50%" stroke="#252536" strokeWidth="0.5" opacity="0.4" />
                    <line x1="0" y1="50%" x2="50%" y2="0" stroke="#252536" strokeWidth="0.5" opacity="0.4" />
                  </svg>
                )}

                {/* Objects */}
                {tile.objects.map((obj, oi) => (
                  <motion.div
                    key={obj.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: TILE_W * 0.2,
                      top: -TILE_H * 0.4,
                      width: TILE_W * 0.6,
                      height: TILE_H * 1.2,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-sm flex items-center justify-center"
                      style={{
                        backgroundColor: `${obj.color}40`,
                        border: `1px solid ${obj.color}80`,
                      }}
                    >
                      <span className="text-[8px] font-bold" style={{ color: obj.color }}>
                        {obj.name[0]}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {/* Coordinate labels (on hover) */}
                {isHovered && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1A1A26] border border-[#252536] rounded px-1.5 py-0.5 whitespace-nowrap z-30">
                    <span className="text-[9px] font-mono text-[#8A8AA8]">X:{x} Y:{y}</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Player in play mode */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{
                scale: 1,
                x: isoToScreen(playerPos.x, playerPos.y).x + TILE_W * 0.3,
                y: isoToScreen(playerPos.x, playerPos.y).y - TILE_H * 0.3,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute z-10"
            >
              <div className="w-5 h-8 bg-[#F5CB4E] rounded-sm border border-[#E8B820] shadow-lg shadow-[#F5CB4E]/30 flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#0A0A0F]">P</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cursor indicator */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-[#12121A]/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-[#252536]">
        {mode === 'select' && <MousePointer2 className="w-3.5 h-3.5 text-[#8A8AA8]" />}
        {mode === 'paint' && <Paintbrush className="w-3.5 h-3.5 text-[#E8913A]" />}
        {mode === 'place' && <PlusSquare className="w-3.5 h-3.5 text-[#5BBD76]" />}
        {mode === 'script' && <Code2 className="w-3.5 h-3.5 text-[#9B6DD1]" />}
        <span className="text-[10px] text-[#8A8AA8] capitalize">{mode} Mode</span>
        {isDragging && <Hand className="w-3 h-3 text-[#F5CB4E] ml-1" />}
      </div>

      {/* Coordinate display */}
      <div className="absolute bottom-3 left-3 z-30 bg-[#12121A]/80 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[#252536]">
        <span className="text-[10px] font-mono text-[#5A5A78]">
          {hoveredTile ? `X: ${hoveredTile.x}, Y: ${hoveredTile.y}, Z: 0` : 'Hover canvas'}
        </span>
      </div>

      {/* Play mode overlay */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 right-3 z-30 bg-[#EF4444]/20 border border-[#EF4444]/40 rounded-lg px-3 py-1.5"
          >
            <span className="text-xs font-medium text-[#EF4444]">Play Test Mode — WASD to move</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
