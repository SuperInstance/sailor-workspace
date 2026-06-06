import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <LayoutDashboard className="w-16 h-16 text-amber-400 mx-auto mb-6" />
        <h1 className="display-md text-void-100 mb-4">Dashboard</h1>
        <p className="text-void-400 text-lg mb-8">Room map, fleet status, and live activity feed — coming soon.</p>
        <div className="w-48 h-1 bg-void-700 rounded-full mx-auto overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
