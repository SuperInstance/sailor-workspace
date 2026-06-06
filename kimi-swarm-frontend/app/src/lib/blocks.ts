// ============================================================
// OpenRoom Creative Tools — Shared Types & Mock Data
// Used by Agentic Scratch and Frontend Forge pages
// ============================================================

// ───── Scratch: Block System ─────

export type BlockCategory =
  | 'agent'
  | 'room'
  | 'tile'
  | 'logic'
  | 'fleet'
  | 'variable'
  | 'sensing';

export type BlockShape = 'hat' | 'stack' | 'reporter' | 'boolean' | 'c-block' | 'cap';

export interface ScratchBlock {
  id: string;
  label: string;
  category: BlockCategory;
  shape: BlockShape;
  color: string;
  icon?: string;
  snippet?: string; // generated JS code
}

export interface CanvasBlock extends ScratchBlock {
  x: number;
  y: number;
  connected?: string[]; // IDs of connected blocks below
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  steps: string[];
  requiredBlocks: string[];
  completed: boolean;
  progress: number;
}

export interface ConsoleMessage {
  id: string;
  text: string;
  type: 'agent' | 'system' | 'error' | 'success';
  timestamp: number;
}

// ───── Category Colors (from design.md) ─────

export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  agent: '#E8913A',   // builder-orange
  room: '#E8B820',    // amber-400
  tile: '#4A90D9',    // scholar-blue
  logic: '#9B6DD1',   // commander-purple
  fleet: '#4AD9C9',   // alchemist-teal
  variable: '#5BBD76',// scout-green
  sensing: '#D94A4A', // critic-red
};

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  agent: 'Agent Actions',
  room: 'Room Navigation',
  tile: 'Tile Operations',
  logic: 'Logic & Control',
  fleet: 'Fleet Commands',
  variable: 'Variables',
  sensing: 'Sensing',
};

// ───── Mock Scratch Blocks ─────

export const SCRATCH_BLOCKS: ScratchBlock[] = [
  // Agent Actions
  { id: 'ag1', label: 'summon {agent}', category: 'agent', shape: 'hat', color: '#E8913A', snippet: 'await summonAgent(agentName);' },
  { id: 'ag2', label: 'dismiss agent', category: 'agent', shape: 'cap', color: '#E8913A', snippet: 'await dismissAgent();' },
  { id: 'ag3', label: 'ask {agent} to {action}', category: 'agent', shape: 'stack', color: '#E8913A', snippet: 'await agent.perform(action);' },
  { id: 'ag4', label: 'agent says {text}', category: 'agent', shape: 'stack', color: '#E8913A', snippet: 'agent.say(text);' },
  { id: 'ag5', label: 'wait for agent', category: 'agent', shape: 'stack', color: '#E8913A', snippet: 'await agent.wait();' },
  // Room Navigation
  { id: 'rm1', label: 'walk to {room}', category: 'room', shape: 'stack', color: '#E8B820', icon: '→', snippet: 'await walkTo(room);' },
  { id: 'rm2', label: 'jump to {room}', category: 'room', shape: 'stack', color: '#E8B820', icon: '⚡', snippet: 'await jumpTo(room);' },
  { id: 'rm3', label: 'climb to {layer}', category: 'room', shape: 'stack', color: '#E8B820', icon: '↑', snippet: 'await climbTo(layer);' },
  { id: 'rm4', label: 'look around', category: 'room', shape: 'stack', color: '#E8B820', snippet: 'await scanRoom();' },
  { id: 'rm5', label: 'scan room', category: 'room', shape: 'stack', color: '#E8B820', snippet: 'const info = await scanRoom();' },
  // Tile Operations
  { id: 'tl1', label: 'collect tile', category: 'tile', shape: 'stack', color: '#4A90D9', snippet: 'await collectTile();' },
  { id: 'tl2', label: 'absorb tile to {room}', category: 'tile', shape: 'stack', color: '#4A90D9', snippet: 'await absorbTile(room);' },
  { id: 'tl3', label: 'read tile {name}', category: 'tile', shape: 'stack', color: '#4A90D9', snippet: 'await readTile(name);' },
  { id: 'tl4', label: 'if tile present', category: 'tile', shape: 'c-block', color: '#4A90D9', snippet: 'if (tile.isPresent) {' },
  { id: 'tl5', label: 'foreach tile in room', category: 'tile', shape: 'c-block', color: '#4A90D9', snippet: 'for (const tile of room.tiles) {' },
  // Logic & Control
  { id: 'lg1', label: 'if {condition}', category: 'logic', shape: 'c-block', color: '#9B6DD1', snippet: 'if (condition) {' },
  { id: 'lg2', label: 'if {condition} else', category: 'logic', shape: 'c-block', color: '#9B6DD1', snippet: 'if (condition) { } else {' },
  { id: 'lg3', label: 'repeat {n} times', category: 'logic', shape: 'c-block', color: '#9B6DD1', snippet: 'for (let i = 0; i < n; i++) {' },
  { id: 'lg4', label: 'while {condition}', category: 'logic', shape: 'c-block', color: '#9B6DD1', snippet: 'while (condition) {' },
  { id: 'lg5', label: 'wait {n} seconds', category: 'logic', shape: 'stack', color: '#9B6DD1', snippet: 'await wait(n * 1000);' },
  { id: 'lg6', label: 'stop all', category: 'logic', shape: 'cap', color: '#9B6DD1', snippet: 'return;' },
  // Fleet Commands
  { id: 'fl1', label: 'broadcast {message}', category: 'fleet', shape: 'stack', color: '#4AD9C9', snippet: 'broadcast(message);' },
  { id: 'fl2', label: 'when I receive {message}', category: 'fleet', shape: 'hat', color: '#4AD9C9', snippet: 'onMessage(message, async () => {' },
  { id: 'fl3', label: 'check coherence', category: 'fleet', shape: 'stack', color: '#4AD9C9', snippet: 'await checkCoherence();' },
  { id: 'fl4', label: 'dispatch {agent} to {room}', category: 'fleet', shape: 'stack', color: '#4AD9C9', snippet: 'await dispatch(agent, room);' },
  { id: 'fl5', label: 'fleet status', category: 'fleet', shape: 'reporter', color: '#4AD9C9', snippet: 'getFleetStatus()' },
  // Variables
  { id: 'vr1', label: 'set {var} to {value}', category: 'variable', shape: 'stack', color: '#5BBD76', snippet: 'var = value;' },
  { id: 'vr2', label: 'change {var} by {n}', category: 'variable', shape: 'stack', color: '#5BBD76', snippet: 'var += n;' },
  { id: 'vr3', label: 'show variable {var}', category: 'variable', shape: 'stack', color: '#5BBD76', snippet: 'console.log(var);' },
  // Sensing
  { id: 'sn1', label: 'room name', category: 'sensing', shape: 'reporter', color: '#D94A4A', snippet: 'room.name' },
  { id: 'sn2', label: 'agent count', category: 'sensing', shape: 'reporter', color: '#D94A4A', snippet: 'fleet.agentCount' },
  { id: 'sn3', label: 'tile count', category: 'sensing', shape: 'reporter', color: '#D94A4A', snippet: 'room.tileCount' },
  { id: 'sn4', label: 'coherence value', category: 'sensing', shape: 'reporter', color: '#D94A4A', snippet: 'fleet.coherence' },
  { id: 'sn5', label: 'mouse clicked?', category: 'sensing', shape: 'boolean', color: '#D94A4A', snippet: 'input.mouseClicked' },
];

// ───── Mock Tutorials ─────

export const TUTORIALS: TutorialStep[] = [
  {
    id: 't1', title: 'Hello, Agent!', description: 'Teach an agent to say hello.',
    difficulty: 'Beginner', estimatedTime: '3 min',
    steps: ['Drag the "summon" hat block', 'Add "agent says" block', 'Type "Hello, World!"', 'Click Run'],
    requiredBlocks: ['ag1', 'ag4'], completed: true, progress: 100,
  },
  {
    id: 't2', title: 'Room Explorer', description: 'Navigate between rooms.',
    difficulty: 'Beginner', estimatedTime: '5 min',
    steps: ['Start with "summon" block', 'Add "walk to" block', 'Add "scan room" block', 'Add "look around" block'],
    requiredBlocks: ['ag1', 'rm1', 'rm4'], completed: false, progress: 30,
  },
  {
    id: 't3', title: 'Tile Collector', description: 'Collect and absorb tiles.',
    difficulty: 'Intermediate', estimatedTime: '8 min',
    steps: ['Walk to a room with tiles', 'Use "collect tile" block', 'Use "absorb tile" block', 'Verify with console'],
    requiredBlocks: ['rm1', 'tl1', 'tl2'], completed: false, progress: 0,
  },
  {
    id: 't4', title: 'Fleet Commander', description: 'Dispatch multiple agents.',
    difficulty: 'Intermediate', estimatedTime: '10 min',
    steps: ['Summon a Builder agent', 'Summon a Scout agent', 'Dispatch each to different rooms', 'Check fleet status'],
    requiredBlocks: ['ag1', 'fl3', 'fl4', 'fl5'], completed: false, progress: 0,
  },
  {
    id: 't5', title: 'Coherence Guardian', description: 'Monitor fleet health.',
    difficulty: 'Advanced', estimatedTime: '15 min',
    steps: ['Use "check coherence" block', 'Add an if-block for low coherence', 'Broadcast alert when needed', 'Loop the check'],
    requiredBlocks: ['fl3', 'lg1', 'fl1', 'lg4'], completed: false, progress: 0,
  },
  {
    id: 't6', title: 'Quest Automator', description: 'Automate quest completion.',
    difficulty: 'Advanced', estimatedTime: '20 min',
    steps: ['Set up a variable for quest count', 'Use repeat block', 'Walk, collect, absorb in loop', 'Check quest status'],
    requiredBlocks: ['vr1', 'lg3', 'rm1', 'tl1'], completed: false, progress: 0,
  },
];

// ───── Mock Console Output ─────

export const INITIAL_CONSOLE: ConsoleMessage[] = [
  { id: 'c1', text: '> Builder-7 summoned to lobby', type: 'system', timestamp: 0 },
  { id: 'c2', text: '> Builder-7: Walking to flux-runtime...', type: 'agent', timestamp: 1 },
  { id: 'c3', text: '> Entered room: flux-runtime', type: 'success', timestamp: 2 },
  { id: 'c4', text: '> Scanning room... 4 agents, 12 issues found', type: 'system', timestamp: 3 },
  { id: 'c5', text: '> Collecting tile: Blueprint-Runtime', type: 'agent', timestamp: 4 },
  { id: 'c6', text: '> Task complete!', type: 'success', timestamp: 5 },
];

// ───── Forge: Component System ─────

export interface ForgeComponent {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultProps?: Record<string, unknown>;
}

export interface CanvasComponent {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props: Record<string, unknown>;
  children?: string[];
}

export const COMPONENT_LIBRARY: ForgeComponent[] = [
  // Layout
  { id: 'fc1', name: 'Container', description: 'Flexible box with padding/gap', category: 'Layout', icon: 'box' },
  { id: 'fc2', name: 'Grid', description: 'CSS Grid with columns', category: 'Layout', icon: 'layout-grid' },
  { id: 'fc3', name: 'Split Pane', description: 'Resizable two-pane layout', category: 'Layout', icon: 'columns' },
  { id: 'fc4', name: 'Stack', description: 'Vertical/horizontal stack', category: 'Layout', icon: 'layers' },
  { id: 'fc5', name: 'Card', description: 'Container with header/body/footer', category: 'Layout', icon: 'square' },
  // Typography
  { id: 'fc6', name: 'Heading', description: 'H1–H6 heading', category: 'Typography', icon: 'heading' },
  { id: 'fc7', name: 'Text', description: 'Paragraph text block', category: 'Typography', icon: 'type' },
  { id: 'fc8', name: 'Code Block', description: 'Syntax-highlighted code', category: 'Typography', icon: 'code' },
  { id: 'fc9', name: 'Terminal', description: 'MUD-style text block', category: 'Typography', icon: 'terminal' },
  { id: 'fc10', name: 'Quote', description: 'Styled blockquote', category: 'Typography', icon: 'quote' },
  { id: 'fc11', name: 'Label', description: 'Small descriptive text', category: 'Typography', icon: 'tag' },
  // Form
  { id: 'fc12', name: 'Input', description: 'Text input with label', category: 'Form', icon: 'text-cursor-input' },
  { id: 'fc13', name: 'Textarea', description: 'Multi-line text input', category: 'Form', icon: 'align-left' },
  { id: 'fc14', name: 'Select', description: 'Dropdown selector', category: 'Form', icon: 'list-filter' },
  { id: 'fc15', name: 'Checkbox', description: 'Check toggle', category: 'Form', icon: 'check-square' },
  { id: 'fc16', name: 'Switch', description: 'Toggle switch', category: 'Form', icon: 'toggle-left' },
  { id: 'fc17', name: 'Slider', description: 'Range slider', category: 'Form', icon: 'sliders' },
  // Navigation
  { id: 'fc18', name: 'Navbar', description: 'Top navigation bar', category: 'Navigation', icon: 'panel-top' },
  { id: 'fc19', name: 'Sidebar', description: 'Vertical navigation menu', category: 'Navigation', icon: 'panel-left' },
  { id: 'fc20', name: 'Tabs', description: 'Tab group with panels', category: 'Navigation', icon: 'tab' },
  { id: 'fc21', name: 'Breadcrumbs', description: 'Path navigation', category: 'Navigation', icon: 'arrow-right-circle' },
  // Data Display
  { id: 'fc22', name: 'Room Card', description: 'Repository-room card', category: 'Data Display', icon: 'door-open' },
  { id: 'fc23', name: 'Agent Card', description: 'Agent summon preview', category: 'Data Display', icon: 'user' },
  { id: 'fc24', name: 'Badge', description: 'Status/label badge', category: 'Data Display', icon: 'bookmark' },
  { id: 'fc25', name: 'Progress Bar', description: 'Progress indicator', category: 'Data Display', icon: 'bar-chart-2' },
  // Feedback
  { id: 'fc26', name: 'Toast', description: 'Notification popup', category: 'Feedback', icon: 'bell' },
  { id: 'fc27', name: 'Modal', description: 'Dialog overlay', category: 'Feedback', icon: 'square-stack' },
  { id: 'fc28', name: 'Alert', description: 'Banner alert', category: 'Feedback', icon: 'alert-triangle' },
  { id: 'fc29', name: 'Loading', description: 'Spinner/skeleton', category: 'Feedback', icon: 'loader' },
];

// ───── Mock State Vials ─────

export interface StateVial {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  value: unknown;
}

export const STATE_VIALS: StateVial[] = [
  { id: 'sv1', name: 'userName', type: 'string', value: 'Adventurer' },
  { id: 'sv2', name: 'roomCount', type: 'number', value: 42 },
  { id: 'sv3', name: 'isLoading', type: 'boolean', value: false },
  { id: 'sv4', name: 'agents', type: 'array', value: ['Builder-7', 'Scout-3'] },
  { id: 'sv5', name: 'currentRoom', type: 'object', value: { name: 'lobby', id: 1 } },
];

// ───── Backend Room Mock Data ─────

export interface BackendRoom {
  id: string;
  name: string;
  type: string;
  color: string;
  status: 'healthy' | 'warning' | 'critical';
  requestRate: string;
  connections: string[];
  position: { x: number; y: number };
}

export const BACKEND_ROOMS: BackendRoom[] = [
  { id: 'br1', name: 'API Gateway', type: 'gateway', color: '#9B6DD1', status: 'healthy', requestRate: '142 req/s', connections: ['br2', 'br3', 'br5'], position: { x: 100, y: 80 } },
  { id: 'br2', name: 'Auth Service', type: 'auth', color: '#4A90D9', status: 'healthy', requestRate: '68 req/s', connections: ['br4'], position: { x: 350, y: 60 } },
  { id: 'br3', name: 'Agent Worker', type: 'worker', color: '#E8913A', status: 'healthy', requestRate: '95 req/s', connections: ['br4', 'br6'], position: { x: 350, y: 180 } },
  { id: 'br4', name: 'Database', type: 'db', color: '#5BBD76', status: 'warning', requestRate: '210 req/s', connections: [], position: { x: 600, y: 120 } },
  { id: 'br5', name: 'Cache', type: 'cache', color: '#E8B820', status: 'healthy', requestRate: '340 req/s', connections: ['br4'], position: { x: 600, y: 40 } },
  { id: 'br6', name: 'Event Bus', type: 'events', color: '#4AD9C9', status: 'healthy', requestRate: '56 req/s', connections: ['br7'], position: { x: 600, y: 220 } },
  { id: 'br7', name: 'File Store', type: 'storage', color: '#E8913A', status: 'healthy', requestRate: '23 req/s', connections: [], position: { x: 850, y: 220 } },
];

// ───── Design Suggestions ─────

export interface DesignSuggestion {
  id: string;
  title: string;
  description: string;
  agentColor: string;
  category: string;
}

export const DESIGN_SUGGESTIONS: DesignSuggestion[] = [
  { id: 'ds1', title: 'Add spacing tokens', description: 'Use the 8px grid for consistent component alignment.', agentColor: '#E8913A', category: 'Layout' },
  { id: 'ds2', title: 'Contrast check', description: 'Text contrast on void-700 backgrounds passes WCAG AA.', agentColor: '#4A90D9', category: 'Accessibility' },
  { id: 'ds3', title: 'Responsive wrap', description: 'Container should wrap children on mobile breakpoints.', agentColor: '#5BBD76', category: 'Responsive' },
  { id: 'ds4', title: 'Animate on mount', description: 'Add fade-in entrance for card components.', agentColor: '#9B6DD1', category: 'Animation' },
];

// ───── Generated Code Preview ─────

export const GENERATED_CODE_PREVIEW = `import { useState, useEffect } from 'react';
import { Card, Badge, Progress } from '@/components/ui';
import { useAgent } from '@/hooks/useAgent';

export default function AgentDashboard() {
  const [agents, setAgents] = useState([]);
  const [coherence, setCoherence] = useState(1.127);
  const { activeAgent, summonAgent } = useAgent();

  useEffect(() => {
    fetchFleetStatus().then(setAgents);
  }, []);

  return (
    <div className="min-h-screen bg-void-900 p-6">
      <header className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-display text-void-100">
          Fleet Dashboard
        </h1>
        <Badge variant="amber">
          {agents.length} Active
        </Badge>
      </header>
      <div className="grid grid-cols-3 gap-4">
        {agents.map(agent => (
          <Card key={agent.id}>
            <AgentCard agent={agent} />
          </Card>
        ))}
      </div>
      <CoherenceMonitor value={coherence} />
    </div>
  );
}`;

// ───── Utility helpers ─────

export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function generateId(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}
