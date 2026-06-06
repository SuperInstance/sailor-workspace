import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, BookOpen, Layers, FlaskConical, Box, ScrollText, Terminal } from 'lucide-react';

const navItems = [
  { label: 'Rooms', path: '/dashboard', icon: Layers },
  { label: 'Agents', path: '/guild', icon: Users },
  { label: 'Scratch', path: '/scratch', icon: Terminal },
  { label: 'Forge', path: '/forge', icon: FlaskConical },
  { label: 'Vault', path: '/vault', icon: BookOpen },
  { label: 'Quests', path: '/quests', icon: ScrollText },
];

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = location.pathname === '/';
  const showSolid = !isHome || scrolled;

  return (
    <motion.nav
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
      className="fixed top-0 left-0 right-0 z-[100] h-16 transition-all duration-300"
      style={{
        background: showSolid ? 'rgba(10, 10, 15, 0.9)' : 'transparent',
        backdropFilter: showSolid ? 'blur(12px)' : 'none',
        borderBottom: showSolid ? '1px solid rgba(37, 37, 54, 0.8)' : '1px solid transparent',
      }}
    >
      <div className="max-w-content mx-auto h-full flex items-center justify-between px-4 lg:px-8">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg border border-amber-400/40 flex items-center justify-center bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
            <span className="font-display font-bold text-amber-300 text-sm tracking-tight">OR</span>
          </div>
          <span className="font-display font-semibold text-void-100 text-lg tracking-wide hidden sm:block">
            OpenRoom
          </span>
        </Link>

        {/* Center: Nav Pills */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item, i) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
              >
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-void-300 hover:bg-void-700 hover:text-void-100 border border-transparent'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Status indicators */}
        <div className="flex items-center gap-4">
          {/* Coherence Meter (mini) */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-void-400 uppercase tracking-wider">Coherence</span>
              <div className="w-20 h-2 rounded-full bg-void-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full coherence-gradient"
                  initial={{ width: '0%' }}
                  animate={{ width: '70%' }}
                  transition={{ delay: 1, duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>

          {/* XP Badge */}
          <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center text-void-900 font-bold text-xs shadow-lg shadow-yellow-500/20">
            7
          </div>

          {/* Agent Avatar */}
          <div className="w-9 h-9 rounded-full bg-void-700 border-2 border-builder-orange/50 flex items-center justify-center overflow-hidden">
            <Box className="w-4 h-4 text-builder-orange" />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
