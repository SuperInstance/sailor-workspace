import { motion } from 'framer-motion';
import {
  MousePointer2, Paintbrush, PlusSquare, Code2,
  Undo2, Redo2, Grid3X3, Play, Upload, Settings,
  Minus, Plus, Save
} from 'lucide-react';

export type EditorMode = 'select' | 'paint' | 'place' | 'script';

interface EditorToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  roomName: string;
  onRoomNameChange?: (name: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  gridVisible: boolean;
  onGridToggle: () => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSave?: () => void;
  onPublish?: () => void;
}

const modes: { id: EditorMode; icon: React.ElementType; label: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'paint', icon: Paintbrush, label: 'Paint' },
  { id: 'place', icon: PlusSquare, label: 'Place' },
  { id: 'script', icon: Code2, label: 'Script' },
];

export default function EditorToolbar({
  mode, onModeChange, roomName, zoom, onZoomChange, gridVisible, onGridToggle, isPlaying, onPlayToggle, onSave, onPublish,
}: EditorToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-12 bg-[#12121A] border-b border-[#252536] flex items-center justify-between px-4 flex-shrink-0"
    >
      {/* Mode Toggles */}
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#1A1A26] border border-[#252536]">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#C99A10] text-white'
                  : 'text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#252536]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Room Info */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={roomName}
          onChange={() => {}}
          className="bg-transparent text-sm text-[#E8E8F0] font-medium text-center focus:outline-none focus:text-[#F5CB4E] cursor-pointer"
          readOnly
        />
        <span className="text-[10px] text-[#5A5A78]">32 x 24 tiles</span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
        <span className="text-[10px] text-[#4ADE80]">Saved</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors" title="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors" title="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onGridToggle}
          className={`p-1.5 rounded-md transition-colors ${gridVisible ? 'text-[#F5CB4E] bg-[#C99A10]/10' : 'text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26]'}`}
          title="Toggle Grid"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-md bg-[#1A1A26] border border-[#252536]">
          <button onClick={() => onZoomChange(Math.max(25, zoom - 25))} className="p-0.5 text-[#5A5A78] hover:text-[#8A8AA8]">
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[10px] text-[#8A8AA8] w-10 text-center font-mono">{zoom}%</span>
          <button onClick={() => onZoomChange(Math.min(200, zoom + 25))} className="p-0.5 text-[#5A5A78] hover:text-[#8A8AA8]">
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <button onClick={onSave} className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#F5CB4E] hover:bg-[#C99A10]/10 transition-colors" title="Save">
          <Save className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onPlayToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isPlaying
              ? 'bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30'
              : 'bg-[#4ADE80]/20 text-[#4ADE80] hover:bg-[#4ADE80]/30'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isPlaying ? 'Stop' : 'Play'}</span>
        </button>

        <button onClick={onPublish} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#C99A10]/20 text-[#F5CB4E] text-xs font-medium hover:bg-[#C99A10]/30 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>

        <button className="p-1.5 rounded-md text-[#5A5A78] hover:text-[#8A8AA8] hover:bg-[#1A1A26] transition-colors">
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
