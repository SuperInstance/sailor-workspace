import { motion } from 'framer-motion';
import { Hammer } from 'lucide-react';

export default function Forge() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <Hammer className="w-16 h-16 text-commander-purple mx-auto mb-6" />
        <h1 className="display-md text-void-100 mb-4">Frontend Forge</h1>
        <p className="text-void-400 text-lg mb-8">Drag-and-drop frontend builder with gamified backend — coming soon.</p>
        <div className="w-48 h-1 bg-void-700 rounded-full mx-auto overflow-hidden">
          <motion.div
            className="h-full bg-commander-purple rounded-full"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
