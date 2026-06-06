import { motion } from 'framer-motion';
import { Users, AlertCircle, GitCommit, BookOpen, ArrowRight } from 'lucide-react';
import type { Room } from '@/lib/rooms';
import { CATEGORY_COLORS, CERT_COLORS } from '@/lib/rooms';

interface RoomCardProps {
  room: Room;
  index: number;
  onClick?: () => void;
}

export default function RoomCard({ room, index, onClick }: RoomCardProps) {
  const catColor = CATEGORY_COLORS[room.category];
  const certColor = CERT_COLORS[room.certStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative rounded-xl border border-[#252536] bg-[#12121A] overflow-hidden cursor-pointer transition-colors hover:border-[#E8B820]/40"
      style={{ aspectRatio: '16/10' }}
    >
      {/* Room Visual - Top 60% */}
      <div className="relative h-[60%] overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${catColor}25 0%, transparent 70%),
                         linear-gradient(135deg, ${catColor}15 0%, #12121A 60%, #0A0A0F 100%)`,
          }}
        />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${catColor} 0px, ${catColor} 1px, transparent 1px, transparent 12px)`,
        }} />
        {/* Category icon center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: `${catColor}20`, borderColor: `${catColor}40` }}
          >
            <GitCommit className="w-6 h-6" style={{ color: catColor }} />
          </div>
        </div>
        {/* Status indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: room.status === 'active' ? '#4ADE80' : room.status === 'building' ? '#F5CB4E' : room.status === 'error' ? '#EF4444' : '#5A5A78',
            }}
          />
          <span className="text-[10px] text-[#8A8AA8] capitalize">{room.status}</span>
        </div>
        {/* Enter Room overlay on hover */}
        <div className="absolute inset-0 bg-[#0A0A0F]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 text-[#F5CB4E] font-ui font-medium text-sm">
            <span>Enter Room</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Info Panel - Bottom 40% */}
      <div className="h-[40%] p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[#E8E8F0] truncate">{room.name}</h3>
          </div>
          <span
            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${catColor}18`, color: catColor }}
          >
            {room.category}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-[#8A8AA8]">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{room.agents}</span>
          </div>
          <div className="flex items-center gap-1 text-[#8A8AA8]">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[10px]">{room.issues}</span>
          </div>
          <div className="flex items-center gap-1 text-[#8A8AA8]">
            <GitCommit className="w-3 h-3" />
            <span className="text-[10px]">{room.commits}</span>
          </div>
          <div className="flex items-center gap-1 text-[#8A8AA8]">
            <BookOpen className="w-3 h-3" />
            <span className="text-[10px]">{room.tiles}</span>
          </div>
        </div>

        {/* Certification bar */}
        <div className="mt-1">
          <div className="w-full h-1 rounded-full bg-[#252536] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: certColor }}
              initial={{ width: 0 }}
              animate={{ width: `${room.certProgress}%` }}
              transition={{ duration: 0.8, delay: index * 0.04 + 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[9px] text-[#5A5A78] capitalize">{room.certStatus}</span>
            <span className="text-[9px] text-[#5A5A78]">{room.certProgress}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
