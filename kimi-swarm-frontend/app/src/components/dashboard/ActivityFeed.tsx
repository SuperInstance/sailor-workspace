import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, GitCommit, AlertCircle, BookOpen, Settings, ChevronDown } from 'lucide-react';
import type { ActivityItem, ActivityType } from '@/lib/rooms';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const typeConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string }> = {
  agent: { icon: Bot, color: '#E8913A', bg: '#E8913A15' },
  commit: { icon: GitCommit, color: '#5BBD76', bg: '#5BBD7615' },
  issue: { icon: AlertCircle, color: '#D94A4A', bg: '#D94A4A15' },
  tile: { icon: BookOpen, color: '#4A90D9', bg: '#4A90D915' },
  system: { icon: Settings, color: '#9B6DD1', bg: '#9B6DD115' },
};

const filterOptions: (ActivityType | 'all')[] = ['all', 'agent', 'commit', 'issue', 'tile', 'system'];

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);
  const visible = expanded ? filtered : filtered.slice(0, 6);

  return (
    <div className="w-full bg-[#12121A] border-t border-[#252536]">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-ui font-sem text-base text-[#E8E8F0]">Recent Activity</h3>
          <div className="flex items-center gap-1">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${filter === opt ? 'bg-[#252536] text-[#E8E8F0]' : 'text-[#5A5A78] hover:text-[#8A8AA8]'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {visible.map((item, i) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1A1A26] transition-colors cursor-pointer group"
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: config.bg }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#B8B8D0] truncate group-hover:text-[#E8E8F0] transition-colors">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[#5A5A78] px-1.5 py-0.5 rounded bg-[#1A1A26]">{item.room}</span>
                    <span className="text-[10px] text-[#3A3A50]">{item.timestamp}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Load More */}
        {filtered.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-xs text-[#5A5A78] hover:text-[#8A8AA8] transition-colors"
          >
            <span>{expanded ? 'Show less' : 'Load older activity'}</span>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3 h-3" />
            </motion.div>
          </button>
        )}
      </div>
    </div>
  );
}
