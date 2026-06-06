import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticleBackground from './ParticleBackground';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-[100dvh] relative bg-void-900">
      {/* Particle background - more intense on home */}
      <ParticleBackground intensity={isHome ? 'high' : 'low'} />

      {/* Noise overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* Navigation */}
      <Navbar />

      {/* Main content */}
      <main className="relative z-[1]">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
