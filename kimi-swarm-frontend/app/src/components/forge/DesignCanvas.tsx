import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer, ZoomIn, ZoomOut, Maximize, Copy, Trash2, Move } from 'lucide-react';
import type { ForgeComponent, CanvasComponent } from '@/lib/blocks';
import { generateId } from '@/lib/blocks';

const BREAKPOINTS = [
  { label: 'Mobile', width: 375, icon: 'phone' },
  { label: 'Tablet', width: 768, icon: 'tablet' },
  { label: 'Laptop', width: 1024, icon: 'laptop' },
  { label: 'Desktop', width: 1440, icon: 'monitor' },
  { label: 'Wide', width: 1920, icon: 'tv' },
];

interface DesignCanvasProps {
  breakpoint: number;
  onBreakpointChange: (bp: number) => void;
  viewMode: string;
}

export default function DesignCanvas({ breakpoint, onBreakpointChange, viewMode }: DesignCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [components, setComponents] = useState<CanvasComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
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
      const compData = JSON.parse(data) as ForgeComponent;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const newComp: CanvasComponent = {
        id: generateId('comp'),
        type: compData.name,
        x: Math.round(x / 8) * 8,
        y: Math.round(y / 8) * 8,
        w: compData.category === 'Layout' ? 280 : 200,
        h: compData.category === 'Layout' ? 120 : 48,
        props: { label: compData.name, text: compData.name + ' content' },
      };
      setComponents(prev => [...prev, newComp]);
      setSelectedId(newComp.id);
    } catch {
      // ignore
    }
  }, [zoom]);

  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateComponent = (id: string) => {
    const comp = components.find(c => c.id === id);
    if (!comp) return;
    const newComp: CanvasComponent = {
      ...comp,
      id: generateId('comp'),
      x: comp.x + 20,
      y: comp.y + 20,
    };
    setComponents(prev => [...prev, newComp]);
    setSelectedId(newComp.id);
  };

  const fitToWidth = () => {
    const containerWidth = canvasRef.current?.clientWidth ?? 1200;
    setZoom(Math.min(1, (containerWidth - 80) / breakpoint));
  };

  // Render placeholder component
  const renderComponent = (comp: CanvasComponent, isPreview: boolean) => {
    const isSelected = selectedId === comp.id && !isPreview;
    const baseClasses = "relative border rounded-lg transition-all";
    const style: React.CSSProperties = {
      position: 'absolute',
      left: comp.x,
      top: comp.y,
      width: comp.w,
      height: comp.h,
      zIndex: isSelected ? 30 : 10,
    };

    if (isPreview) {
      return (
        <div key={comp.id} className={`${baseClasses} bg-[#1A1A26] border-[#252536] p-3`} style={style}>
          <span className="text-xs text-[#8A8AA8] font-ui">{comp.props?.text as string || comp.type}</span>
        </div>
      );
    }

    return (
      <motion.div
        key={comp.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${baseClasses} ${
          isSelected
            ? 'border-[#4A90D9] shadow-[0_0_0_1px_#4A90D9] bg-[#1A1A26]'
            : 'border-[#252536] hover:border-[#4A90D9]/40 bg-[#12121A]'
        }`}
        style={style}
        onClick={e => { e.stopPropagation(); setSelectedId(comp.id); }}
      >
        {/* Component content */}
        <div className="p-3 h-full">
          <span className="text-xs text-[#8A8AA8] font-ui">{comp.props?.text as string || comp.type}</span>
        </div>

        {/* Selection UI */}
        {isSelected && viewMode === 'design' && (
          <>
            {/* Bounding box */}
            <div className="absolute -inset-[1px] border-2 border-[#4A90D9] rounded-lg pointer-events-none" />
            {/* Resize handles */}
            {['nw', 'ne', 'sw', 'se'].map(pos => (
              <div
                key={pos}
                className="absolute w-2 h-2 bg-[#4A90D9] border border-[#0A0A0F]"
                style={{
                  top: pos.includes('n') ? -4 : undefined,
                  bottom: pos.includes('s') ? -4 : undefined,
                  left: pos.includes('w') ? -4 : undefined,
                  right: pos.includes('e') ? -4 : undefined,
                  cursor: pos + '-resize',
                }}
              />
            ))}
            {/* Quick actions */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#1A1A26] border border-[#252536] rounded-md px-1.5 py-0.5 shadow-lg">
              <button onClick={() => duplicateComponent(comp.id)} className="p-1 hover:bg-[#252536] rounded" title="Duplicate">
                <Copy className="w-3 h-3 text-[#8A8AA8]" />
              </button>
              <button onClick={() => deleteComponent(comp.id)} className="p-1 hover:bg-[#252536] rounded" title="Delete">
                <Trash2 className="w-3 h-3 text-[#D94A4A]" />
              </button>
              <button className="p-1 hover:bg-[#252536] rounded cursor-move" title="Move">
                <Move className="w-3 h-3 text-[#8A8AA8]" />
              </button>
            </div>
            {/* Type label */}
            <div className="absolute -top-1 left-2 -translate-y-full">
              <span className="text-[9px] text-[#4A90D9] font-mono bg-[#0A0A0F] px-1.5 py-0.5 rounded">{comp.type}</span>
            </div>
          </>
        )}
      </motion.div>
    );
  };

  if (viewMode === 'code') {
    return (
      <div className="flex-1 bg-[#0A0A0F] flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#252536]">
          <span className="text-[10px] text-[#5A5A78] font-mono uppercase tracking-wider">Generated Code</span>
        </div>
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-[#8A8AA8] leading-relaxed">
          <code>{`import { useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';

export default function GeneratedPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-void-900 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-display text-void-100">
          My OpenRoom App
        </h1>
        <Badge variant="amber">Live</Badge>
      </header>
      <main className="space-y-4">
        <Card>
          <p className="text-void-200">Welcome to your generated app!</p>
          <Button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </Button>
        </Card>
      </main>
    </div>
  );
}`}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0F] overflow-hidden">
      {/* Breakpoint bar */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 border-b border-[#252536]">
        {BREAKPOINTS.map(bp => {
          const isActive = breakpoint === bp.width;
          return (
            <button
              key={bp.width}
              onClick={() => onBreakpointChange(bp.width)}
              className={`px-3 py-1 rounded-md text-[10px] font-mono transition-colors ${
                isActive ? 'bg-[#E8B820]/15 text-[#E8B820]' : 'text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26]'
              }`}
            >
              {bp.label} ({bp.width}px)
            </button>
          );
        })}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative flex justify-center"
        style={{
          backgroundColor: '#0A0A0F',
          backgroundImage: 'radial-gradient(circle, #252536 0.5px, transparent 0.5px)',
          backgroundSize: '16px 16px',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setSelectedId(null)}
      >
        <motion.div
          animate={{ width: breakpoint * zoom }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="relative my-8 bg-[#12121A] shadow-2xl"
          style={{
            minHeight: '600px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Drop indicator */}
          <AnimatePresence>
            {dragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none z-20 border-2 border-dashed border-[#E8B820]/40 bg-[#E8B820]/5 rounded-lg"
              />
            )}
          </AnimatePresence>

          {/* Empty state */}
          {components.length === 0 && !dragOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MousePointer className="w-10 h-10 text-[#3A3A50] mx-auto mb-3" />
                <p className="text-sm text-[#3A3A50] font-ui">Drag components here</p>
                <p className="text-xs text-[#252536] font-ui mt-1">Build your page by dropping components</p>
              </div>
            </div>
          )}

          {/* Components */}
          {components.map(comp => renderComponent(comp, viewMode === 'preview'))}
        </motion.div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1A1A26] border border-[#252536] rounded-full px-3 py-1.5 shadow-lg">
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1 hover:bg-[#252536] rounded-full transition-colors">
            <ZoomOut className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
          <span className="text-[10px] text-[#8A8AA8] font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="p-1 hover:bg-[#252536] rounded-full transition-colors">
            <ZoomIn className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
          <div className="w-px h-4 bg-[#252536] mx-1" />
          <button onClick={fitToWidth} className="p-1 hover:bg-[#252536] rounded-full transition-colors" title="Fit to width">
            <Maximize className="w-3.5 h-3.5 text-[#8A8AA8]" />
          </button>
        </div>
      </div>
    </div>
  );
}
