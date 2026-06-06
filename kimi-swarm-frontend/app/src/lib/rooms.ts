export type RoomCategory = 'Fleet Core' | 'Protocol Layer' | 'Agent Lifecycle' | 'Mathematical' | 'Experimental';
export type CertStatus = 'uncertified' | 'bronze' | 'silver' | 'gold';
export type ForestLayer = 'Canopy' | 'Understory' | 'Floor' | 'Mycelium' | 'Seed Bank';

export interface Room {
  id: string;
  name: string;
  category: RoomCategory;
  description: string;
  agents: number;
  issues: number;
  commits: number;
  tiles: number;
  certStatus: CertStatus;
  certProgress: number;
  status: 'active' | 'idle' | 'error' | 'building';
  lastActive: string;
  layer: ForestLayer;
  repoUrl: string;
}

export const CATEGORY_COLORS: Record<RoomCategory, string> = {
  'Fleet Core': '#4A90D9',
  'Protocol Layer': '#9B6DD1',
  'Agent Lifecycle': '#5BBD76',
  'Mathematical': '#4AD9C9',
  'Experimental': '#E8913A',
};

export const CATEGORY_DOT_COLORS: Record<RoomCategory, string> = {
  'Fleet Core': 'bg-scholar-blue',
  'Protocol Layer': 'bg-commander-purple',
  'Agent Lifecycle': 'bg-scout-green',
  'Mathematical': 'bg-alchemist-teal',
  'Experimental': 'bg-builder-orange',
};

export const CERT_COLORS: Record<CertStatus, string> = {
  uncertified: '#3A3A50',
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
};

export const FOREST_LAYERS: ForestLayer[] = ['Canopy', 'Understory', 'Floor', 'Mycelium', 'Seed Bank'];

export const FOREST_LAYER_COLORS: Record<ForestLayer, string> = {
  Canopy: '#2D5016',
  Understory: '#4A7C23',
  Floor: '#8B6914',
  Mycelium: '#6B3A7A',
  'Seed Bank': '#8B4513',
};

export const FOREST_LAYER_DESCRIPTIONS: Record<ForestLayer, string> = {
  Canopy: 'Live Deployment',
  Understory: 'Active Development',
  Floor: 'Review & Testing',
  Mycelium: 'Experimental',
  'Seed Bank': 'Archive',
};

export const mockRooms: Room[] = [
  { id: 'git-agent', name: 'git-agent', category: 'Fleet Core', description: 'Git integration agent for repository management', agents: 3, issues: 12, commits: 47, tiles: 8, certStatus: 'gold', certProgress: 92, status: 'active', lastActive: '2 min ago', layer: 'Canopy', repoUrl: 'https://github.com/superinstance/git-agent' },
  { id: 'git-agent-codespace', name: 'git-agent-codespace', category: 'Fleet Core', description: 'Codespace environment for git agents', agents: 2, issues: 5, commits: 23, tiles: 4, certStatus: 'silver', certProgress: 68, status: 'active', lastActive: '15 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/git-agent-codespace' },
  { id: 'plato-sdk', name: 'plato-sdk', category: 'Fleet Core', description: 'PLATO tile SDK for knowledge artifacts', agents: 4, issues: 18, commits: 89, tiles: 24, certStatus: 'gold', certProgress: 95, status: 'active', lastActive: 'Just now', layer: 'Canopy', repoUrl: 'https://github.com/superinstance/plato-sdk' },
  { id: 'flux-runtime', name: 'flux-runtime', category: 'Fleet Core', description: 'Flux runtime environment for agent execution', agents: 2, issues: 8, commits: 34, tiles: 6, certStatus: 'silver', certProgress: 72, status: 'building', lastActive: '5 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/flux-runtime' },
  { id: 'iron-to-iron', name: 'iron-to-iron', category: 'Fleet Core', description: 'Inter-agent communication protocol', agents: 1, issues: 3, commits: 15, tiles: 2, certStatus: 'bronze', certProgress: 35, status: 'idle', lastActive: '1 hour ago', layer: 'Floor', repoUrl: 'https://github.com/superinstance/iron-to-iron' },
  { id: 'agent-to-agent', name: 'agent-to-agent', category: 'Protocol Layer', description: 'A2A protocol for agent communication', agents: 3, issues: 14, commits: 56, tiles: 12, certStatus: 'gold', certProgress: 88, status: 'active', lastActive: '3 min ago', layer: 'Canopy', repoUrl: 'https://github.com/superinstance/agent-to-agent' },
  { id: 'a2ui-protocol', name: 'a2ui-protocol', category: 'Protocol Layer', description: 'A2UI protocol for agent-UI interaction', agents: 2, issues: 9, commits: 41, tiles: 7, certStatus: 'silver', certProgress: 65, status: 'active', lastActive: '10 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/a2ui-protocol' },
  { id: 'a2ui-render', name: 'a2ui-render', category: 'Protocol Layer', description: 'A2UI rendering engine', agents: 2, issues: 7, commits: 29, tiles: 5, certStatus: 'silver', certProgress: 58, status: 'building', lastActive: '20 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/a2ui-render' },
  { id: 'agent-grid', name: 'agent-grid', category: 'Protocol Layer', description: 'Agent grid coordination system', agents: 1, issues: 11, commits: 33, tiles: 4, certStatus: 'bronze', certProgress: 42, status: 'idle', lastActive: '45 min ago', layer: 'Floor', repoUrl: 'https://github.com/superinstance/agent-grid' },
  { id: 'agent-native-language', name: 'agent-native-language', category: 'Protocol Layer', description: 'Agent natural language interface', agents: 3, issues: 22, commits: 67, tiles: 15, certStatus: 'silver', certProgress: 61, status: 'active', lastActive: '8 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/agent-native-language' },
  { id: 'a2a-adapter', name: 'a2a-adapter', category: 'Protocol Layer', description: 'A2A protocol adapter for external systems', agents: 1, issues: 4, commits: 12, tiles: 3, certStatus: 'uncertified', certProgress: 18, status: 'idle', lastActive: '2 hours ago', layer: 'Mycelium', repoUrl: 'https://github.com/superinstance/a2a-adapter' },
  { id: 'agent-bootcamp', name: 'agent-bootcamp', category: 'Agent Lifecycle', description: 'Agent training and onboarding system', agents: 4, issues: 16, commits: 78, tiles: 18, certStatus: 'gold', certProgress: 85, status: 'active', lastActive: '1 min ago', layer: 'Canopy', repoUrl: 'https://github.com/superinstance/agent-bootcamp' },
  { id: 'agent-skills', name: 'agent-skills', category: 'Agent Lifecycle', description: 'Agent skill tree and progression', agents: 2, issues: 6, commits: 31, tiles: 9, certStatus: 'silver', certProgress: 74, status: 'active', lastActive: '12 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/agent-skills' },
  { id: 'agent-dna', name: 'agent-dna', category: 'Agent Lifecycle', description: 'Agent DNA encoding and evolution', agents: 2, issues: 13, commits: 44, tiles: 11, certStatus: 'silver', certProgress: 56, status: 'building', lastActive: '30 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/agent-dna' },
  { id: 'agent-identity', name: 'agent-identity', category: 'Agent Lifecycle', description: 'Agent identity and authentication', agents: 1, issues: 9, commits: 27, tiles: 5, certStatus: 'bronze', certProgress: 38, status: 'idle', lastActive: '1.5 hours ago', layer: 'Floor', repoUrl: 'https://github.com/superinstance/agent-identity' },
  { id: 'constraint-theory-core', name: 'constraint-theory-core', category: 'Mathematical', description: 'Constraint theory mathematics engine', agents: 2, issues: 7, commits: 38, tiles: 10, certStatus: 'silver', certProgress: 71, status: 'active', lastActive: '6 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/constraint-theory-core' },
  { id: 'algebraic-geometry', name: 'algebraic-geometry', category: 'Mathematical', description: 'Algebraic geometry computation library', agents: 1, issues: 4, commits: 19, tiles: 6, certStatus: 'bronze', certProgress: 45, status: 'idle', lastActive: '3 hours ago', layer: 'Mycelium', repoUrl: 'https://github.com/superinstance/algebraic-geometry' },
  { id: 'algtop-rs', name: 'algtop-rs', category: 'Mathematical', description: 'Algebraic topology in Rust', agents: 1, issues: 2, commits: 11, tiles: 3, certStatus: 'uncertified', certProgress: 22, status: 'idle', lastActive: '5 hours ago', layer: 'Mycelium', repoUrl: 'https://github.com/superinstance/algtop-rs' },
  { id: 'ai-forest', name: 'ai-forest', category: 'Experimental', description: 'AI Forest ecosystem simulation', agents: 3, issues: 25, commits: 92, tiles: 21, certStatus: 'gold', certProgress: 90, status: 'active', lastActive: 'Just now', layer: 'Canopy', repoUrl: 'https://github.com/superinstance/ai-forest' },
  { id: 'agent-spectrum-os', name: 'agent-spectrum-os', category: 'Experimental', description: 'Spectrum OS for agent deployment', agents: 2, issues: 15, commits: 48, tiles: 13, certStatus: 'silver', certProgress: 62, status: 'active', lastActive: '25 min ago', layer: 'Understory', repoUrl: 'https://github.com/superinstance/agent-spectrum-os' },
  { id: 'AIR', name: 'AIR', category: 'Experimental', description: 'Adaptive Intelligence Router', agents: 2, issues: 10, commits: 36, tiles: 8, certStatus: 'bronze', certProgress: 48, status: 'building', lastActive: '18 min ago', layer: 'Floor', repoUrl: 'https://github.com/superinstance/AIR' },
  { id: 'aesop-mcp', name: 'aesop-mcp', category: 'Experimental', description: 'Aesop model context protocol', agents: 1, issues: 6, commits: 22, tiles: 5, certStatus: 'bronze', certProgress: 33, status: 'idle', lastActive: '1 hour ago', layer: 'Mycelium', repoUrl: 'https://github.com/superinstance/aesop-mcp' },
];

export const getRoomsByCategory = (category: RoomCategory | 'All'): Room[] => {
  if (category === 'All') return mockRooms;
  return mockRooms.filter((r) => r.category === category);
};

export const getRoomsByLayer = (layer: ForestLayer): Room[] => {
  return mockRooms.filter((r) => r.layer === layer);
};

export const categories: RoomCategory[] = ['Fleet Core', 'Protocol Layer', 'Agent Lifecycle', 'Mathematical', 'Experimental'];

// PLATO Tile types and mock data
export type TileType = 'Book' | 'Map' | 'Blueprint' | 'Warning' | 'Scroll' | 'Console' | 'Vial';

export interface PlatoTile {
  id: string;
  name: string;
  type: TileType;
  sourceRoom: string;
  knowledge: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  color: string;
  icon: string;
}

export const TILE_COLORS: Record<TileType, string> = {
  Book: '#4A90D9',
  Map: '#5BBD76',
  Blueprint: '#E8913A',
  Warning: '#D94A4A',
  Scroll: '#F5CB4E',
  Console: '#9B6DD1',
  Vial: '#4AD9C9',
};

export const mockTiles: PlatoTile[] = [
  { id: 't1', name: 'Git Merging Guide', type: 'Book', sourceRoom: 'git-agent', knowledge: 'Strategies for merging complex git branches with agent coordination...', rarity: 'Common', color: '#4A90D9', icon: 'Book' },
  { id: 't2', name: 'Fleet Topology Map', type: 'Map', sourceRoom: 'agent-grid', knowledge: 'Visual map of all active fleet nodes and their connections...', rarity: 'Rare', color: '#5BBD76', icon: 'Map' },
  { id: 't3', name: 'A2A Protocol Spec', type: 'Blueprint', sourceRoom: 'agent-to-agent', knowledge: 'Technical blueprint for agent-to-agent communication protocol v2.1...', rarity: 'Epic', color: '#E8913A', icon: 'Blueprint' },
  { id: 't4', name: 'Coherence Warning', type: 'Warning', sourceRoom: 'flux-runtime', knowledge: 'Critical thresholds for fleet coherence monitoring...', rarity: 'Uncommon', color: '#D94A4A', icon: 'Warning' },
  { id: 't5', name: 'Agent Origin Story', type: 'Scroll', sourceRoom: 'agent-bootcamp', knowledge: 'The founding narrative of the SuperInstance agent fleet...', rarity: 'Legendary', color: '#F5CB4E', icon: 'Scroll' },
  { id: 't6', name: 'Command Interface', type: 'Console', sourceRoom: 'a2ui-protocol', knowledge: 'Reference for the A2UI command console interface...', rarity: 'Rare', color: '#9B6DD1', icon: 'Console' },
  { id: 't7', name: 'Transformation Elixir', type: 'Vial', sourceRoom: 'agent-dna', knowledge: 'Formula for agent capability transformation and evolution...', rarity: 'Epic', color: '#4AD9C9', icon: 'Vial' },
  { id: 't8', name: 'Constraint Principles', type: 'Book', sourceRoom: 'constraint-theory-core', knowledge: 'Foundational principles of constraint theory mathematics...', rarity: 'Rare', color: '#4A90D9', icon: 'Book' },
  { id: 't9', name: 'Forest Layer Guide', type: 'Map', sourceRoom: 'ai-forest', knowledge: 'Navigation guide through the five AI-Forest layers...', rarity: 'Uncommon', color: '#5BBD76', icon: 'Map' },
  { id: 't10', name: 'Room Builder Blueprint', type: 'Blueprint', sourceRoom: 'agent-spectrum-os', knowledge: 'Blueprint for constructing new rooms in the MUD environment...', rarity: 'Legendary', color: '#E8913A', icon: 'Blueprint' },
  { id: 't11', name: 'Deprecation Notice', type: 'Warning', sourceRoom: 'a2a-adapter', knowledge: 'Legacy adapter deprecation timeline and migration path...', rarity: 'Common', color: '#D94A4A', icon: 'Warning' },
  { id: 't12', name: 'PLATO Creation Myth', type: 'Scroll', sourceRoom: 'plato-sdk', knowledge: 'The story of how PLATO tiles became knowledge artifacts...', rarity: 'Epic', color: '#F5CB4E', icon: 'Scroll' },
];

// Activity feed types and data
export type ActivityType = 'agent' | 'commit' | 'issue' | 'tile' | 'system';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  room: string;
  timestamp: string;
  actor?: string;
}

export const mockActivity: ActivityItem[] = [
  { id: 'a1', type: 'agent', message: 'Builder-7 completed scaffolding in flux-runtime', room: 'flux-runtime', timestamp: 'Just now', actor: 'Builder-7' },
  { id: 'a2', type: 'commit', message: 'Merged PR #247: Enhanced coherence monitoring', room: 'plato-sdk', timestamp: '2 min ago', actor: 'Scout-3' },
  { id: 'a3', type: 'tile', message: 'New Blueprint tile absorbed from agent-to-agent', room: 'agent-to-agent', timestamp: '5 min ago', actor: 'Scholar-1' },
  { id: 'a4', type: 'issue', message: 'Critical issue #182 opened in ai-forest', room: 'ai-forest', timestamp: '8 min ago', actor: 'Critic-2' },
  { id: 'a5', type: 'system', message: 'Fleet coherence threshold crossed: 1.127', room: 'Fleet', timestamp: '12 min ago' },
  { id: 'a6', type: 'agent', message: 'Scout-3 began dependency mapping in plato-sdk', room: 'plato-sdk', timestamp: '15 min ago', actor: 'Scout-3' },
  { id: 'a7', type: 'commit', message: 'Pushed 12 commits to agent-bootcamp', room: 'agent-bootcamp', timestamp: '20 min ago', actor: 'Builder-4' },
  { id: 'a8', type: 'tile', message: 'Legendary Scroll tile discovered in agent-bootcamp', room: 'agent-bootcamp', timestamp: '25 min ago', actor: 'Scout-1' },
  { id: 'a9', type: 'issue', message: 'Resolved issue #91 in git-agent', room: 'git-agent', timestamp: '30 min ago', actor: 'Builder-7' },
  { id: 'a10', type: 'system', message: 'New agent Builder-8 summoned to fleet', room: 'Fleet', timestamp: '35 min ago' },
  { id: 'a11', type: 'agent', message: 'Critic-2 completed PR review #47 in git-agent', room: 'git-agent', timestamp: '40 min ago', actor: 'Critic-2' },
  { id: 'a12', type: 'commit', message: 'Merged branch feature/npc-scripting into crafter', room: 'agent-native-language', timestamp: '45 min ago', actor: 'Alchemist-1' },
];

// Terrain types for crafter
export type TerrainType = 'stone' | 'amber' | 'crystal' | 'moss' | 'magma' | 'void' | 'marble' | 'workshop';

export interface TerrainDef {
  id: TerrainType;
  name: string;
  color: string;
  description: string;
}

export const TERRAIN_TYPES: TerrainDef[] = [
  { id: 'stone', name: 'Dark Stone', color: '#1A1A26', description: 'Default dark stone floor' },
  { id: 'amber', name: 'Amber Tile', color: '#A17A0A', description: 'Geometric amber pattern' },
  { id: 'crystal', name: 'Crystal Floor', color: '#4AD9C9', description: 'Translucent crystal' },
  { id: 'moss', name: 'Forest Moss', color: '#5BBD76', description: 'Organic moss growth' },
  { id: 'magma', name: 'Magma Cracks', color: '#D94A4A', description: 'Glowing magma cracks' },
  { id: 'void', name: 'Void Grid', color: '#9B6DD1', description: 'Tech-patterned purple' },
  { id: 'marble', name: 'Scholar Marble', color: '#4A90D9', description: 'Refined blue marble' },
  { id: 'workshop', name: 'Workshop', color: '#E8913A', description: 'Wood and metal' },
];

// Object types for crafter
export type ObjectCategory = 'structures' | 'furniture' | 'decor' | 'interactive' | 'plato';

export interface PlacedObject {
  id: string;
  name: string;
  category: ObjectCategory;
  x: number;
  y: number;
  z: number;
  color: string;
  icon: string;
  interactive?: boolean;
}

export const OBJECT_LIBRARY: PlacedObject[] = [
  { id: 'obj1', name: 'Stone Wall', category: 'structures', x: 0, y: 0, z: 1, color: '#3A3A50', icon: 'Wall' },
  { id: 'obj2', name: 'Archway', category: 'structures', x: 0, y: 0, z: 1, color: '#5A5A78', icon: 'Arch' },
  { id: 'obj3', name: 'Pillar', category: 'structures', x: 0, y: 0, z: 1, color: '#4A90D9', icon: 'Pillar' },
  { id: 'obj4', name: 'Wooden Table', category: 'furniture', x: 0, y: 0, z: 1, color: '#8B6914', icon: 'Table' },
  { id: 'obj5', name: 'Bookshelf', category: 'furniture', x: 0, y: 0, z: 1, color: '#A17A0A', icon: 'Book' },
  { id: 'obj6', name: 'Terminal', category: 'furniture', x: 0, y: 0, z: 1, color: '#9B6DD1', icon: 'Monitor' },
  { id: 'obj7', name: 'Torch', category: 'decor', x: 0, y: 0, z: 1, color: '#E8B820', icon: 'Flame' },
  { id: 'obj8', name: 'Crystal', category: 'decor', x: 0, y: 0, z: 1, color: '#4AD9C9', icon: 'Diamond' },
  { id: 'obj9', name: 'Rune Stone', category: 'decor', x: 0, y: 0, z: 1, color: '#F5CB4E', icon: 'Star' },
  { id: 'obj10', name: 'Lever', category: 'interactive', x: 0, y: 0, z: 1, color: '#D94A4A', icon: 'Toggle' },
  { id: 'obj11', name: 'Portal', category: 'interactive', x: 0, y: 0, z: 1, color: '#9B6DD1', icon: 'Orbit' },
  { id: 'obj12', name: 'Chest', category: 'interactive', x: 0, y: 0, z: 1, color: '#8B4513', icon: 'Box' },
];

// NPC types for crafter
export interface NpcDef {
  id: string;
  name: string;
  agentType: string;
  color: string;
  dialog: string;
}

export const NPC_TEMPLATES: NpcDef[] = [
  { id: 'npc1', name: 'Scholar NPC', agentType: 'Scholar', color: '#4A90D9', dialog: 'Greetings! I have knowledge to share.' },
  { id: 'npc2', name: 'Scout NPC', agentType: 'Scout', color: '#5BBD76', dialog: 'I can guide you through this area.' },
  { id: 'npc3', name: 'Builder NPC', agentType: 'Builder', color: '#E8913A', dialog: 'Need something built? I am ready.' },
  { id: 'npc4', name: 'Critic NPC', agentType: 'Critic', color: '#D94A4A', dialog: 'I will review your work thoroughly.' },
  { id: 'npc5', name: 'Commander NPC', agentType: 'Commander', color: '#9B6DD1', dialog: 'The fleet awaits your command.' },
  { id: 'npc6', name: 'Alchemist NPC', agentType: 'Alchemist', color: '#4AD9C9', dialog: 'I can transform raw materials.' },
];

// Script node types for crafter
export interface ScriptNodeType {
  id: string;
  label: string;
  category: 'event' | 'action' | 'condition' | 'variable' | 'agent';
  color: string;
  inputs: number;
  outputs: number;
}

export const SCRIPT_NODE_TYPES: ScriptNodeType[] = [
  { id: 'onEnter', label: 'On Player Enter', category: 'event', color: '#E8B820', inputs: 0, outputs: 1 },
  { id: 'onClick', label: 'On Click', category: 'event', color: '#E8B820', inputs: 0, outputs: 1 },
  { id: 'onTimer', label: 'On Timer', category: 'event', color: '#E8B820', inputs: 0, outputs: 1 },
  { id: 'moveNpc', label: 'Move NPC', category: 'action', color: '#4A90D9', inputs: 1, outputs: 1 },
  { id: 'showDialog', label: 'Show Dialog', category: 'action', color: '#5BBD76', inputs: 1, outputs: 1 },
  { id: 'playSound', label: 'Play Sound', category: 'action', color: '#E8913A', inputs: 1, outputs: 1 },
  { id: 'spawnEffect', label: 'Spawn Effect', category: 'action', color: '#4AD9C9', inputs: 1, outputs: 1 },
  { id: 'giveItem', label: 'Give Item', category: 'action', color: '#FFD700', inputs: 1, outputs: 1 },
  { id: 'ifPlayerHas', label: 'If Player Has', category: 'condition', color: '#9B6DD1', inputs: 1, outputs: 2 },
  { id: 'ifQuest', label: 'If Quest Active', category: 'condition', color: '#9B6DD1', inputs: 1, outputs: 2 },
  { id: 'random', label: 'Random Chance', category: 'condition', color: '#9B6DD1', inputs: 1, outputs: 2 },
  { id: 'setVar', label: 'Set Variable', category: 'variable', color: '#4ADE80', inputs: 1, outputs: 1 },
  { id: 'getVar', label: 'Get Variable', category: 'variable', color: '#4ADE80', inputs: 0, outputs: 1 },
  { id: 'summon', label: 'Summon Agent', category: 'agent', color: '#D94A4A', inputs: 1, outputs: 1 },
  { id: 'command', label: 'Command Agent', category: 'agent', color: '#D94A4A', inputs: 1, outputs: 1 },
];

export { mockAgents } from './agents';
