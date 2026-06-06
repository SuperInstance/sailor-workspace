import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ChevronRight, Users, AlertCircle, BookOpen,
  Check, Terminal, ArrowRight, Sparkles
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ──────────────────────── typed text hook ──────────────────────── */
function useTypedText(text: string, speed: number = 35, startDelay: number = 800) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        idx++;
        if (idx <= text.length) {
          setDisplayed(text.slice(0, idx));
        } else {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timer);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

/* ──────────────────────── Section 1: Hero ──────────────────────── */
function HeroSection() {
  const mudText = "You stand in a grand lobby. Amber torchlight flickers across hexagonal floor tiles. Corridors branch in every direction \u2014 each leading to a repository-room humming with activity. Summonable agents wait in the shadows, ready to assist. Knowledge tiles glow on the walls, pulsing with captured wisdom.";
  const { displayed, done } = useTypedText(mudText, 35, 800);
  const [parserValue, setParserValue] = useState('');
  const [parserShake, setParserShake] = useState(false);
  const [showSecondDesc, setShowSecondDesc] = useState(false);
  const parserRef = useRef<HTMLInputElement>(null);

  const handleCommand = useCallback(() => {
    const cmd = parserValue.trim().toLowerCase();
    if (!cmd) return;

    if (cmd === 'look' || cmd === 'look around') {
      setShowSecondDesc(true);
      setParserValue('');
    } else if (cmd === 'walk north') {
      document.getElementById('room-gallery')?.scrollIntoView({ behavior: 'smooth' });
      setParserValue('');
    } else if (cmd === 'summon builder') {
      document.getElementById('agent-section')?.scrollIntoView({ behavior: 'smooth' });
      setParserValue('');
    } else if (cmd === 'begin quest') {
      document.getElementById('tier-section')?.scrollIntoView({ behavior: 'smooth' });
      setParserValue('');
    } else {
      setParserShake(true);
      setTimeout(() => setParserShake(false), 400);
    }
  }, [parserValue]);

  const suggestedCommands = [
    { label: 'look around', action: () => { setShowSecondDesc(true); } },
    { label: 'walk north', action: () => document.getElementById('room-gallery')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'summon builder', action: () => document.getElementById('agent-section')?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'begin quest', action: () => document.getElementById('tier-section')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: 'url(/hero-room-entrance.jpg)' }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-void-900/80 via-void-900/50 to-void-900" />
      <div className="absolute inset-0 g-amber-glow opacity-50" />

      {/* Content */}
      <div className="relative z-10 max-w-[800px] mx-auto px-4 text-center">
        {/* Typed MUD Description */}
        <div className="min-h-[120px] mb-8">
          <p className="terminal-text text-amber-300 max-w-[680px] mx-auto">
            {displayed}
            {!done && <span className="inline-block w-[2px] h-[1.1em] bg-amber-400 ml-1 animate-cursor-blink align-middle" />}
          </p>
          {showSecondDesc && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              className="terminal-text text-amber-300/70 max-w-[680px] mx-auto mt-4"
            >
              The air hums with latent code-energy. Faint glyphs scroll across the ceiling — commit logs from a thousand repositories. You sense the presence of other travelers, their avatars flickering in and out of phase as they navigate distant rooms.
            </motion.p>
          )}
        </div>

        {/* Room Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={done ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="display-xl text-void-100 mb-4"
          style={{ textShadow: '0 0 40px rgba(245,203,78,0.2), 0 2px 4px rgba(0,0,0,0.5)' }}
        >
          The Grand Lobby
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={done ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className="text-void-300 text-lg mb-10"
        >
          OpenRoom — MUD Frontend to the SuperInstance Fleet
        </motion.p>

        {/* Command Parser */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={done ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
          className={`max-w-[640px] mx-auto ${parserShake ? 'animate-shake' : ''}`}
        >
          <div className="flex items-center gap-3 bg-void-900/90 border border-void-600 rounded-lg px-4 h-12">
            <Terminal className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-amber-400 font-terminal text-lg">&gt;</span>
            <input
              ref={parserRef}
              type="text"
              value={parserValue}
              onChange={(e) => setParserValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="What do you want to do? (type 'look', 'walk', 'summon', or 'begin')"
              className="flex-1 bg-transparent text-void-100 font-terminal text-lg placeholder:text-void-500 outline-none"
            />
            <button
              onClick={handleCommand}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          {parserShake && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-amber-400 text-sm mt-2 font-terminal"
            >
              I don&apos;t understand that command.
            </motion.p>
          )}
        </motion.div>

        {/* Suggested Commands */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={done ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-6"
        >
          {suggestedCommands.map((cmd, i) => (
            <motion.button
              key={cmd.label}
              initial={{ opacity: 0, y: 10 }}
              animate={done ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.9 + i * 0.15, duration: 0.3 }}
              onClick={cmd.action}
              className="px-5 py-2 rounded-full bg-void-700 text-amber-300 border border-void-600 text-sm font-medium hover:bg-amber-500/15 hover:border-amber-400/40 transition-all duration-200"
            >
              {cmd.label}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── Section 2: 3-Tier Cards ──────────────────────── */
const tiers = [
  {
    tier: 'I',
    title: 'Agentic Scratch',
    description: 'Program agents with visual blocks. Drag, snap, and watch your code come alive. The friendliest entry to agentic development — inspired by Scratch, powered by the fleet.',
    image: '/scratch-workspace.jpg',
    features: ['Visual block programming', 'Instant agent preview', 'Guided tutorials & quests'],
    cta: 'Enter Scratch',
    route: '/scratch',
    accentColor: 'amber',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    shadowClass: 'hover:shadow-amber-card-lg',
  },
  {
    tier: 'II',
    title: 'Room Crafter',
    description: 'Build games, rooms, and interactive experiences within the MUD itself. Place tiles, script NPCs, design quests — all within your repository-rooms.',
    image: '/crafter-workspace.jpg',
    features: ['Isometric room editor', 'NPC & quest scripting', 'Live multiplayer preview'],
    cta: 'Start Crafting',
    route: '/crafter',
    accentColor: 'builder-orange',
    badgeBg: 'bg-builder-orange/15',
    badgeText: 'text-builder-orange',
    shadowClass: 'hover:shadow-builder-card',
  },
  {
    tier: 'III',
    title: 'Frontend Forge',
    description: 'Design and build real applications with a gamified backend. Drag-and-drop components, visual state management, and agents that understand your product vision.',
    image: '/forge-workspace.jpg',
    features: ['Component library', 'Visual state designer', 'Agent-assisted deployment'],
    cta: 'Open the Forge',
    route: '/forge',
    accentColor: 'commander-purple',
    badgeBg: 'bg-commander-purple/15',
    badgeText: 'text-commander-purple',
    shadowClass: 'hover:shadow-commander-card',
  },
];

function TierSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="tier-section" ref={ref} className="relative py-space-24 bg-void-900">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-4">Choose Your Path</p>
          <h2 className="display-lg text-void-100">Three Realms of Creation</h2>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: i * 0.15, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`
                rounded-2xl bg-void-800 border border-void-600 overflow-hidden
                transition-all duration-300 hover:-translate-y-2 ${tier.shadowClass} hover:border-opacity-60
                ${hoveredIndex !== null && hoveredIndex !== i ? 'opacity-60 scale-[0.98]' : 'opacity-100'}
              `}
              style={{
                borderColor: hoveredIndex === i
                  ? tier.accentColor === 'amber' ? 'rgba(245,203,78,0.3)' :
                    tier.accentColor === 'builder-orange' ? 'rgba(232,145,58,0.3)' :
                    'rgba(155,109,209,0.3)' : undefined
              }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={tier.image}
                  alt={tier.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void-800 via-void-800/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${tier.badgeBg} ${tier.badgeText} mb-3`}>
                  TIER {tier.tier}
                </span>
                <h3 className="font-display font-semibold text-xl text-void-100 mb-2">{tier.title}</h3>
                <p className="text-void-300 text-sm leading-relaxed mb-4 line-clamp-3">{tier.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-void-300">
                      <Check className="w-4 h-4 text-quest-green shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  to={tier.route}
                  className={`
                    block w-full text-center py-3 rounded-lg font-semibold text-sm transition-all duration-200
                    ${tier.accentColor === 'amber'
                      ? 'bg-amber-500 text-void-900 hover:bg-amber-400'
                      : tier.accentColor === 'builder-orange'
                        ? 'bg-builder-orange text-void-900 hover:bg-builder-orange/90'
                        : 'bg-commander-purple text-void-900 hover:bg-commander-purple/90'
                    }
                  `}
                >
                  {tier.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Section 3: Room Gallery ──────────────────────── */
const rooms = [
  { name: 'git-agent', category: 'Fleet Core', color: '#4A90D9', agents: 3, issues: 12, commits: 89 },
  { name: 'plato-sdk', category: 'Fleet Core', color: '#F5CB4E', agents: 2, issues: 8, commits: 156 },
  { name: 'agent-bootcamp', category: 'Agent Lifecycle', color: '#5BBD76', agents: 5, issues: 20, commits: 203 },
  { name: 'a2ui-protocol', category: 'Protocol Layer', color: '#9B6DD1', agents: 1, issues: 5, commits: 67 },
  { name: 'constraint-theory-core', category: 'Mathematical', color: '#4AD9C9', agents: 0, issues: 3, commits: 45 },
  { name: 'ai-forest', category: 'Experimental', color: '#2D5016', agents: 2, issues: 15, commits: 112 },
  { name: 'agent-spectrum-os', category: 'Experimental', color: '#6B3A7A', agents: 4, issues: 30, commits: 278 },
  { name: 'flux-runtime', category: 'Fleet Core', color: '#F5CB4E', agents: 2, issues: 10, commits: 134 },
];

function RoomGallery() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section id="room-gallery" ref={ref} className="relative py-space-24 bg-void-800">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-void-600 to-transparent" />

      {/* Section Header */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="eyebrow mb-4">Explore the Fleet</p>
          <h2 className="display-lg text-void-100 mb-3">Repository-Rooms</h2>
          <p className="text-void-300 text-lg">Every repo is a room. Every room is alive.</p>
        </motion.div>
      </div>

      {/* Horizontal Scroll */}
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto hide-scrollbar px-4 lg:px-[5vw] pb-4 snap-x snap-mandatory"
      >
        {rooms.map((room, i) => (
          <motion.div
            key={room.name}
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="snap-center shrink-0 w-80"
          >
            <Link to="/dashboard" className="block group">
              <div className="rounded-xl bg-void-800 border border-void-600 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-amber-card group-hover:border-amber-400/40">
                {/* Room visual */}
                <div className="relative h-44 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: `linear-gradient(135deg, ${room.color}40 0%, ${room.color}10 50%, transparent 100%)`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Terminal className="w-12 h-12 opacity-20" style={{ color: room.color }} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-void-800 via-transparent to-transparent" />
                  {/* Enter Room overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-void-900/40">
                    <span className="text-amber-300 font-display font-semibold text-lg" style={{ textShadow: '0 0 20px rgba(245,203,78,0.5)' }}>
                      Enter Room
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-void-100 font-semibold text-sm truncate mb-1">{room.name}</h3>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-3"
                    style={{ backgroundColor: `${room.color}20`, color: room.color }}
                  >
                    {room.category}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-void-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.agents}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {room.issues}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {room.commits}
                    </span>
                  </div>
                  {/* Completion bar */}
                  <div className="mt-3 h-1 rounded-full bg-void-700 overflow-hidden">
                    <div className="h-full rounded-full bg-[#CD7F32]" style={{ width: '60%' }} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0.6 }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center justify-end gap-2 px-4 lg:px-[5vw] mt-4 text-void-400 text-sm"
      >
        <span>Scroll to explore</span>
        <ChevronRight className="w-4 h-4 animate-scroll-indicator" />
      </motion.div>
    </section>
  );
}

/* ──────────────────────── Section 4: Agent Showcase ──────────────────────── */
const agents = [
  { name: 'Scholar', title: 'Research & Knowledge', role: 'The Scholar', color: '#4A90D9', colorClass: 'border-scholar-blue/30', bgClass: 'bg-scholar-blue/20', image: '/agent-scholar.jpg', abilities: ['Literature Review', 'Code Analysis', 'Hypothesis Generation'], quote: 'Every repository is a library waiting to be catalogued.' },
  { name: 'Scout', title: 'Exploration & Discovery', role: 'The Scout', color: '#5BBD76', colorClass: 'border-scout-green/30', bgClass: 'bg-scout-green/20', image: '/agent-scout.jpg', abilities: ['Dependency Mapping', 'Architecture Survey', 'Bug Hunting'], quote: 'I map the uncharted corners of your codebase.' },
  { name: 'Builder', title: 'Construction & Scaffolding', role: 'The Builder', color: '#E8913A', colorClass: 'border-builder-orange/30', bgClass: 'bg-builder-orange/20', image: '/agent-builder.jpg', abilities: ['Code Generation', 'Test Writing', 'CI/CD Setup'], quote: 'Ideas are nothing until they\'re built.' },
  { name: 'Critic', title: 'Review & Quality Assurance', role: 'The Critic', color: '#D94A4A', colorClass: 'border-critic-red/30', bgClass: 'bg-critic-red/20', image: '/agent-critic.jpg', abilities: ['Code Review', 'Security Audit', 'Performance Analysis'], quote: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to critique.' },
  { name: 'Commander', title: 'Orchestration & Strategy', role: 'The Commander', color: '#9B6DD1', colorClass: 'border-commander-purple/30', bgClass: 'bg-commander-purple/20', image: '/agent-commander.jpg', abilities: ['Fleet Coordination', 'Task Delegation', 'Workflow Design'], quote: 'A coordinated fleet moves mountains.' },
  { name: 'Alchemist', title: 'Transformation & Experimentation', role: 'The Alchemist', color: '#4AD9C9', colorClass: 'border-alchemist-teal/30', bgClass: 'bg-alchemist-teal/20', image: '/agent-alchemist.jpg', abilities: ['Refactoring', 'Migration', 'Prototyping'], quote: 'Transmute legacy code into gold.' },
];

function AgentSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <section id="agent-section" ref={ref} className="relative py-space-24 bg-void-900">
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-4">Summon Your Allies</p>
          <h2 className="display-lg text-void-100 mb-3">The Six Armors</h2>
          <p className="text-void-300 text-lg max-w-2xl mx-auto">
            Every agent wears distinct armor. Each serves a unique purpose in your quest.
          </p>
        </motion.div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
              className={`
                rounded-xl bg-void-800 border overflow-hidden transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
                ${agent.colorClass}
              `}
              style={{
                borderColor: `${agent.color}30`,
                boxShadow: `0 0 20px ${agent.color}10`,
              }}
            >
              {/* Image */}
              <div className={`relative h-48 ${agent.bgClass} overflow-hidden`}>
                <img
                  src={agent.image}
                  alt={agent.role}
                  className="w-full h-full object-cover object-top opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void-800 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-display font-semibold text-lg text-void-100 mb-1">{agent.role}</h3>
                <p className="text-void-400 text-xs mb-3">{agent.title}</p>

                {/* Abilities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {agent.abilities.map((ability) => (
                    <span
                      key={ability}
                      className="px-2 py-1 rounded-full text-[10px] font-medium bg-void-700 text-void-300"
                    >
                      {ability}
                    </span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-void-500 text-xs italic leading-relaxed">
                  &ldquo;{agent.quote}&rdquo;
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Guild CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-void-400 mb-4">
            Visit the Agent Guild to summon, customize, and level up your agents.
          </p>
          <Link
            to="/guild"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg border border-amber-400/40 text-amber-300 font-semibold hover:bg-amber-500/15 transition-all duration-200"
          >
            Enter the Guild
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── Section 5: Fleet Pulse ──────────────────────── */
const activities = [
  { text: 'Scout mapped dependencies in', target: 'plato-sdk', time: '1m ago', color: '#5BBD76', dotColor: '#4ADE80' },
  { text: 'Critic flagged 3 issues in', target: 'a2ui-render', time: '3m ago', color: '#D94A4A', dotColor: '#EF4444' },
  { text: 'Alchemist refactored', target: 'agent-dna', time: '5m ago', color: '#4AD9C9', dotColor: '#4AD9C9' },
  { text: 'Commander dispatched Builder to', target: 'git-agent', time: '8m ago', color: '#9B6DD1', dotColor: '#9B6DD1' },
  { text: 'Scholar absorbed 12 new tiles in', target: 'ai-forest', time: '12m ago', color: '#4A90D9', dotColor: '#60A5FA' },
  { text: 'Builder generated tests for', target: 'iron-to-iron', time: '15m ago', color: '#E8913A', dotColor: '#E8913A' },
  { text: 'New quest available: Map the Protocol Layer', target: '', time: '18m ago', color: '#FFD700', dotColor: '#FFD700' },
  { text: 'Fleet coherence +0.02', target: '', time: '20m ago', color: '#4ADE80', dotColor: '#4ADE80' },
  { text: 'Scout discovered deprecated API in', target: 'agent-grid', time: '25m ago', color: '#5BBD76', dotColor: '#4ADE80' },
  { text: 'Commander adjusted fleet topology', target: '', time: '30m ago', color: '#9B6DD1', dotColor: '#9B6DD1' },
];

function FleetPulse() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' });

  return (
    <section ref={ref} className="relative py-space-24 bg-void-800">
      <div className="absolute inset-x-0 top-0 h-px bg-void-600" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-void-600" />

      <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="eyebrow mb-4">Fleet Status</p>
          <h2 className="display-lg text-void-100">The Pulse of the Fleet</h2>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Coherence Monitor + Stats */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="rounded-xl bg-void-700 border border-void-600 p-6">
              <h3 className="font-semibold text-void-100 mb-4">Fleet Coherence</h3>

              {/* Formula */}
              <p className="font-mono text-sm text-quest-green mb-4">
                gamma + H = 1.127
              </p>

              {/* Bar */}
              <div className="relative h-3 rounded-full overflow-hidden mb-2 coherence-gradient">
                <motion.div
                  className="absolute top-0 bottom-0 w-1 bg-white/80 rounded-full"
                  initial={{ left: '0%' }}
                  animate={isInView ? { left: '70%' } : {}}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                />
              </div>

              {/* Status */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-quest-green text-sm font-medium">Harmonic</span>
                <span className="text-void-400 text-xs font-mono">V = 42 repos</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Active Agents', value: '24', color: 'text-mana-blue', icon: Users },
                  { label: 'Open Issues', value: '156', color: 'text-amber-400', icon: AlertCircle },
                  { label: 'Knowledge Tiles', value: '312', color: 'text-scholar-blue', icon: BookOpen },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="text-center p-3 rounded-lg bg-void-800"
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-void-500 text-[10px] mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="rounded-xl bg-void-700 border border-void-600 p-6 max-h-[400px] overflow-y-auto">
              <h3 className="font-semibold text-void-100 mb-4">Live Activity</h3>
              <div className="space-y-3">
                {activities.map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-void-600/50 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: activity.dotColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-void-300 leading-snug">
                        {activity.text}
                        {activity.target && (
                          <span style={{ color: activity.color }} className="font-mono text-xs ml-1">
                            {activity.target}
                          </span>
                        )}
                      </p>
                      <p className="text-void-500 text-[10px] mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Section 6: CTA / Footer ──────────────────────── */
function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20% 0px' });

  return (
    <section ref={ref} className="relative min-h-[80vh] flex items-center justify-center bg-void-900 overflow-hidden">
      {/* Radial glow */}
      <div className="absolute inset-0 g-amber-glow opacity-40 scale-75" />

      <div className="relative z-10 max-w-[700px] mx-auto px-4 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="display-xl text-void-100 mb-6"
          style={{ textShadow: '0 0 60px rgba(245,203,78,0.15)' }}
        >
          The rooms await.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-void-300 text-lg max-w-[600px] mx-auto mb-10"
        >
          Enter OpenRoom and begin your journey. Explore repository-rooms, summon agents, collect knowledge tiles, and build something extraordinary — all within a gamified world that makes development an adventure.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] }}
        >
          <Link
            to="/dashboard"
            className="inline-block px-12 py-5 rounded-xl bg-amber-500 text-void-900 font-display font-semibold text-xl shadow-[0_8px_32px_rgba(245,203,78,0.25)] hover:bg-amber-400 hover:shadow-[0_12px_40px_rgba(245,203,78,0.35)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Enter OpenRoom
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-10"
        >
          {[
            { label: 'Explore Rooms', path: '/dashboard' },
            { label: 'Meet the Agents', path: '/guild' },
            { label: 'View Quests', path: '/quests' },
          ].map((link, i) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.7 + i * 0.1 }}
            >
              <Link
                to={link.path}
                className="text-void-300 hover:text-amber-300 transition-colors font-medium"
              >
                {link.label} →
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────── Home Page ──────────────────────── */
export default function Home() {
  return (
    <div>
      <HeroSection />
      <TierSection />
      <RoomGallery />
      <AgentSection />
      <FleetPulse />
      <CTASection />
    </div>
  );
}
