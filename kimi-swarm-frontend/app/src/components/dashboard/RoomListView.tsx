import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, Users, AlertCircle, BookOpen, ArrowUp, ArrowDown } from 'lucide-react';
import type { Room } from '@/lib/rooms';
import { CATEGORY_COLORS, CERT_COLORS } from '@/lib/rooms';

interface RoomListViewProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
}

type SortKey = 'name' | 'category' | 'agents' | 'issues' | 'tiles' | 'status' | 'lastActive';
type SortDir = 'asc' | 'desc';

export default function RoomListView({ rooms, onRoomClick }: RoomListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...rooms].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
    else if (sortKey === 'agents') cmp = a.agents - b.agents;
    else if (sortKey === 'issues') cmp = a.issues - b.issues;
    else if (sortKey === 'tiles') cmp = a.tiles - b.tiles;
    else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
    else if (sortKey === 'lastActive') cmp = a.lastActive.localeCompare(b.lastActive);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-[#3A3A50]" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#F5CB4E]" /> : <ArrowDown className="w-3 h-3 text-[#F5CB4E]" />;
  };

  const columns: { key: SortKey; label: string; icon?: React.ElementType }[] = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'agents', label: 'Agents', icon: Users },
    { key: 'issues', label: 'Issues', icon: AlertCircle },
    { key: 'tiles', label: 'Tiles', icon: BookOpen },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="w-full rounded-xl border border-[#252536] bg-[#12121A] overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1.5fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-2.5 border-b border-[#252536] bg-[#0A0A0F]">
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className="flex items-center gap-1.5 text-left group"
          >
            {col.icon && <col.icon className="w-3 h-3 text-[#5A5A78]" />}
            <span className="text-[10px] uppercase tracking-wider text-[#5A5A78] font-medium group-hover:text-[#8A8AA8] transition-colors">
              {col.label}
            </span>
            <SortIcon col={col.key} />
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#1A1A26]">
        {sorted.map((room, i) => {
          const catColor = CATEGORY_COLORS[room.category];
          const certColor = CERT_COLORS[room.certStatus];
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => onRoomClick?.(room)}
              className="grid grid-cols-[2fr_1.5fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-3 items-center hover:bg-[#1A1A26] transition-colors cursor-pointer group"
            >
              {/* Name */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: certColor }}
                />
                <span className="text-sm text-[#E8E8F0] font-medium truncate group-hover:text-[#F5CB4E] transition-colors">
                  {room.name}
                </span>
              </div>

              {/* Category */}
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full w-fit"
                style={{ backgroundColor: `${catColor}18`, color: catColor }}
              >
                {room.category}
              </span>

              {/* Agents */}
              <span className="text-xs text-[#8A8AA8]">{room.agents}</span>

              {/* Issues */}
              <span className="text-xs text-[#8A8AA8]">{room.issues}</span>

              {/* Tiles */}
              <span className="text-xs text-[#8A8AA8]">{room.tiles}</span>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: room.status === 'active' ? '#4ADE80' : room.status === 'building' ? '#F5CB4E' : room.status === 'error' ? '#EF4444' : '#5A5A78',
                  }}
                />
                <span className="text-xs text-[#8A8AA8] capitalize">{room.status}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
