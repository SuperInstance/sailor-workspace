import { Hexagon } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-void-600 bg-void-900 py-8 px-4 lg:px-8">
      <div className="max-w-content mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border border-amber-400/40 flex items-center justify-center bg-amber-500/10">
            <span className="font-display font-bold text-amber-300 text-[10px]">OR</span>
          </div>
          <span className="font-display font-semibold text-void-400 text-sm">OpenRoom</span>
        </div>

        {/* Center */}
        <p className="text-void-500 text-xs">
          Powered by SuperInstance
        </p>

        {/* Right: Links */}
        <div className="flex items-center gap-6">
          <a href="#" className="text-void-400 text-xs hover:text-void-200 transition-colors">Docs</a>
          <a href="#" className="text-void-400 text-xs hover:text-void-200 transition-colors">GitHub</a>
          <a href="#" className="text-void-400 text-xs hover:text-void-200 transition-colors">Discord</a>
        </div>
      </div>

      {/* Fleet coherence display */}
      <div className="max-w-content mx-auto mt-6 pt-4 border-t border-void-800 flex items-center justify-center gap-3">
        <Hexagon className="w-3 h-3 text-quest-green" />
        <span className="text-void-500 text-[10px] uppercase tracking-wider">Fleet Coherence:</span>
        <span className="text-quest-green text-[10px] font-mono">gamma + H = 1.127</span>
        <span className="text-void-500 text-[10px]">|</span>
        <span className="text-mana-blue text-[10px] font-mono">24 agents active</span>
      </div>
    </footer>
  );
}
