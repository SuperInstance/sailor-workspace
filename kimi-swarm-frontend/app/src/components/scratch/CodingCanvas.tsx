import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ZoomIn, ZoomOut, MousePointer2 } from 'lucide-react';
import type { ScratchBlock, CanvasBlock } from '@/lib/blocks';
import { BlockShapeRenderer } from './BlockPalette';

interface CodingCanvasProps {
  blocks: CanvasBlock[];
  onBlocksChange: (blocks: CanvasBlock[]) => void;
  running: boolean;
  activeBlockId: string | null;
}

export default function CodingCanvas({ blocks, onBlocksChange, running, activeBlockId }: CodingCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [trashHover, setTrashHover] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const blockData = JSON.parse(data) as ScratchBlock;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const newBlock: CanvasBlock = {
        ...blockData,
        x: Math.round(x / 16) * 16,
        y: Math.round(y / 16) * 16,
      };
      onBlocksChange([...blocks, newBlock]);
    } catch {
      // ignore
    }
  }, [blocks, onBlocksChange, zoom]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('grid-bg')) {
      setSelectedId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedId) {
      onBlocksChange(blocks.filter(b => b.id !== selectedId));
      setSelectedId(null);
    }
  };

  const removeBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div
      className="flex-1 relative flex flex-col h-full overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label="Coding canvas"
    >
      {/* Grid background */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto cursor-crosshair"
        style={{
          backgroundColor: '#0A0A0F',
          backgroundImage: `
            radial-gradient(circle, #252536 1px, transparent 1px)
          `,
          backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
      >
        {/* Drop zone indicator */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10 border-2 border-dashed border-[#E8B820]/40 bg-[#E8B820]/5"
            />
          )}
        </AnimatePresence>

        {/* Blocks */}
        <div
          className="relative min-w-full min-h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
        >
          {blocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{
                opacity: 1,
                scale: running && activeBlockId === block.id ? 1.05 : 1,
                y: 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: index * 0.03,
              }}
              className="absolute cursor-pointer"
              style={{
                left: block.x,
                top: block.y,
                zIndex: selectedId === block.id ? 20 : 10,
              }}
              onClick={() => setSelectedId(block.id)}
            >
              {/* Selection outline */}
              {selectedId === block.id && (
                <motion.div
                  layoutId="selection"
                  className="absolute -inset-1 rounded-lg border-2 border-[#E8B820]/40 pointer-events-none"
                  style={{ boxShadow: '0 0 12px rgba(232,184,32,0.2)' }}
                  transition={{ duration: 0.15 }}
                />
              )}
              {/* Running highlight */}
              {running && activeBlockId === block.id && (
                <motion.div
                  className="absolute -inset-1.5 rounded-lg border-2 border-[#E8B820]/80 pointer-events-none"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  style={{ boxShadow: '0 0 20px rgba(232,184,32,0.4)' }}
                />
              )}
              <BlockShapeRenderer block={block} />
            </motion.div>
          ))}

          {/* Empty state */}
          {blocks.length === 0 && !dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <MousePointer2 className="w-10 h-10 text-[#3A3A50] mx-auto mb-3" />
                <p className="text-[#3A3A50] text-sm font-ui">Drag blocks here to start coding</p>
                <p className="text-[#252536] text-xs font-ui mt-1">Your agent program will appear here</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Trash zone */}
        <div
          className="absolute bottom-4 right-4 z-30"
          onDragOver={e => { e.preventDefault(); setTrashHover(true); }}
          onDragLeave={() => setTrashHover(false)}
          onDrop={e => {
            e.preventDefault();
            setTrashHover(false);
            try {
              const data = JSON.parse(e.dataTransfer.getData('application/json'));
              if (data?.id) removeBlock(data.id);
            } catch { /* ignore */ }
          }}
        >
          <motion.div
            animate={{ scale: trashHover ? 1.2 : 1, opacity: trashHover ? 1 : 0.6 }}
            className="w-12 h-12 rounded-full bg-[#D94A4A]/20 border border-[#D94A4A]/30 flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 text-[#D94A4A]" />
          </motion.div>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 bg-[#1A1A26] border border-[#252536] rounded-full px-2 py-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 hover:bg-[#252536] rounded-full transition-colors">
            <ZoomOut className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
          <span className="text-[10px] text-[#8A8AA8] font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="p-1.5 hover:bg-[#252536] rounded-full transition-colors">
            <ZoomIn className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
        </div>
      </div>
    </div>
  );
}
