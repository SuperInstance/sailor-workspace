// Agent type enum for simple references
export type AgentTypeName = 'Scholar' | 'Scout' | 'Builder' | 'Critic' | 'Commander' | 'Alchemist';

// Simple agent (for dashboard/status)
export interface Agent {
  id: string;
  name: string;
  type: AgentTypeName;
  color: string;
  status: 'active' | 'idle' | 'error';
  task: string;
  room: string;
  progress?: number;
  icon: string;
}

// Rich agent type definition (for guild)
export interface AgentStats {
  code: number;
  review: number;
  speed: number;
  creativity: number;
}

export interface AgentTypeDef {
  id: string;
  name: string;
  title: string;
  color: string;
  description: string;
  abilities: string[];
  stats: AgentStats;
  image: string;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  x: number;
  y: number;
  unlocked: boolean;
  available: boolean;
  xpCost: number;
  prerequisites: string[];
  icon: string;
}

export interface SkillTree {
  agentType: string;
  nodes: SkillNode[];
}

export interface SummonedAgent {
  id: string;
  name: string;
  type: string;
  level: number;
  xp: number;
  maxXp: number;
  status: 'active' | 'idle' | 'error';
  currentTask: string;
  location: string;
  personality: string;
}

export const AGENT_COLORS: Record<AgentTypeName, string> = {
  Scholar: '#4A90D9',
  Scout: '#5BBD76',
  Builder: '#E8913A',
  Critic: '#D94A4A',
  Commander: '#9B6DD1',
  Alchemist: '#4AD9C9',
};

export const AGENT_TITLES: Record<AgentTypeName, string> = {
  Scholar: 'Knowledge Keeper',
  Scout: 'Path Finder',
  Builder: 'Craftsman',
  Critic: 'Code Reviewer',
  Commander: 'Fleet Leader',
  Alchemist: 'Transformer',
};

// Simple mock agents for dashboard
export const mockAgents: Agent[] = [
  { id: 'a1', name: 'Builder-7', type: 'Builder', color: '#E8913A', status: 'active', task: 'Generating test scaffold for flux-runtime...', room: 'flux-runtime', progress: 60, icon: 'Hammer' },
  { id: 'a2', name: 'Scout-3', type: 'Scout', color: '#5BBD76', status: 'active', task: 'Mapping dependencies in plato-sdk...', room: 'plato-sdk', progress: 30, icon: 'Map' },
  { id: 'a3', name: 'Scholar-1', type: 'Scholar', color: '#4A90D9', status: 'idle', task: 'Idle — awaiting command', room: 'lobby', icon: 'Book' },
  { id: 'a4', name: 'Critic-2', type: 'Critic', color: '#D94A4A', status: 'active', task: 'Reviewing PR #47 in git-agent...', room: 'git-agent', progress: 85, icon: 'Eye' },
  { id: 'a5', name: 'Commander-1', type: 'Commander', color: '#9B6DD1', status: 'active', task: 'Orchestrating fleet sync...', room: 'Fleet', progress: 45, icon: 'Shield' },
  { id: 'a6', name: 'Alchemist-3', type: 'Alchemist', color: '#4AD9C9', status: 'idle', task: 'Idle — awaiting command', room: 'agent-dna', icon: 'Flask' },
];

export const getAgentsByStatus = (status: Agent['status']): Agent[] => {
  return mockAgents.filter((a) => a.status === status);
};

export const getActiveAgentCount = (): number => {
  return mockAgents.filter((a) => a.status === 'active').length;
};

// Rich agent type definitions for guild
export const agentTypes: AgentTypeDef[] = [
  {
    id: 'scholar',
    name: 'Scholar',
    title: 'Knowledge Keeper',
    color: '#4A90D9',
    description: 'Masters of research and understanding. Scholars dive deep into codebases, documentation, and knowledge stores to extract wisdom and surface insights.',
    abilities: ['Deep Research', 'Code Archaeology', 'Documentation Synthesis', 'Knowledge Mapping'],
    stats: { code: 60, review: 80, speed: 50, creativity: 70 },
    image: '/agent-scholar.jpg',
  },
  {
    id: 'scout',
    name: 'Scout',
    title: 'Path Finder',
    color: '#5BBD76',
    description: 'Expert explorers who map dependencies, find opportunities, and chart paths through complex systems. Scouts see connections others miss.',
    abilities: ['Dependency Mapping', 'Pathfinding', 'Opportunity Detection', 'System Survey'],
    stats: { code: 50, review: 70, speed: 90, creativity: 60 },
    image: '/agent-scout.jpg',
  },
  {
    id: 'builder',
    name: 'Builder',
    title: 'Craftsman',
    color: '#E8913A',
    description: 'Skilled creators who transform ideas into working code. Builders generate scaffolding, implement features, and craft solid architectures.',
    abilities: ['Code Generation', 'Scaffolding', 'Architecture Design', 'Feature Implementation'],
    stats: { code: 90, review: 50, speed: 70, creativity: 80 },
    image: '/agent-builder.jpg',
  },
  {
    id: 'critic',
    name: 'Critic',
    title: 'Code Reviewer',
    color: '#D94A4A',
    description: 'Keen-eyed analysts who ensure quality and correctness. Critics review code, identify issues, and enforce standards with precision.',
    abilities: ['Code Review', 'Bug Detection', 'Standards Enforcement', 'Quality Analysis'],
    stats: { code: 70, review: 95, speed: 40, creativity: 50 },
    image: '/agent-critic.jpg',
  },
  {
    id: 'commander',
    name: 'Commander',
    title: 'Fleet Leader',
    color: '#9B6DD1',
    description: 'Strategic orchestrators who coordinate multi-agent operations. Commanders plan, delegate, and ensure fleet-wide coherence.',
    abilities: ['Fleet Orchestration', 'Task Delegation', 'Strategic Planning', 'Coherence Monitoring'],
    stats: { code: 65, review: 75, speed: 60, creativity: 85 },
    image: '/agent-commander.jpg',
  },
  {
    id: 'alchemist',
    name: 'Alchemist',
    title: 'Transformer',
    color: '#4AD9C9',
    description: 'Experimental innovators who transform and optimize. Alchemists refactor, optimize, and discover novel approaches to hard problems.',
    abilities: ['Refactoring', 'Optimization', 'Experimentation', 'Transformation'],
    stats: { code: 80, review: 60, speed: 65, creativity: 95 },
    image: '/agent-alchemist.jpg',
  },
];

export const agentLore: Record<string, { quote: string; backstory: string; bestFor: string[]; synergy: string[] }> = {
  scholar: {
    quote: "In the depths of knowledge, truth awaits. I am the lens that focuses scattered information into coherent understanding.",
    backstory: "Born from the ancient libraries of the first codebases, Scholars have evolved to navigate the ever-expanding ocean of information. They carry the weight of accumulated wisdom and the responsibility of passing it on.",
    bestFor: ['Research tasks', 'Documentation projects', 'Knowledge base creation', 'Code archaeology'],
    synergy: ['Scout', 'Builder'],
  },
  scout: {
    quote: "Every system has hidden paths. I find them so others may walk with confidence.",
    backstory: "Scouts emerged from the need to understand sprawling architectures. They are the cartographers of code, the explorers of the unknown, always seeking the next horizon.",
    bestFor: ['Dependency analysis', 'System exploration', 'Opportunity identification', 'Risk assessment'],
    synergy: ['Scholar', 'Commander'],
  },
  builder: {
    quote: "Ideas are ethereal until built. I am the hand that shapes thought into substance.",
    backstory: "Builders are the craftspeople of the digital realm. From the first stone of scaffolding to the final polish of a feature, they bring visions to life with code.",
    bestFor: ['Feature development', 'Scaffolding creation', 'Architecture implementation', 'Prototype building'],
    synergy: ['Critic', 'Alchemist'],
  },
  critic: {
    quote: "Perfection is a journey, not a destination. I am the mirror that reflects truth.",
    backstory: "Critics were forged in the fires of production outages and bug hunts. They stand as guardians of quality, ensuring that only the best code makes it through.",
    bestFor: ['Code reviews', 'Quality assurance', 'Standards enforcement', 'Security audits'],
    synergy: ['Builder', 'Commander'],
  },
  commander: {
    quote: "A fleet moves as one, or not at all. I am the conductor of this symphony of minds.",
    backstory: "Commanders arose when individual agents were no longer enough. They see the big picture, coordinate efforts, and ensure that the fleet operates in harmony.",
    bestFor: ['Fleet coordination', 'Strategic planning', 'Crisis management', 'Resource allocation'],
    synergy: ['Scout', 'Critic'],
  },
  alchemist: {
    quote: "Transformation is the essence of progress. I transmute the ordinary into the extraordinary.",
    backstory: "Alchemists are the wildcards of the fleet. They experiment, optimize, and discover. Where others see finished work, alchemists see potential for transformation.",
    bestFor: ['Refactoring', 'Performance optimization', 'Experimental features', 'Novel solutions'],
    synergy: ['Builder', 'Scholar'],
  },
};

export const skillTrees: SkillTree[] = [
  {
    agentType: 'Scholar',
    nodes: [
      { id: 's1', name: 'Deep Read', description: 'Read and summarize any document', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'BookOpen' },
      { id: 's2', name: 'Code Archaeology', description: 'Trace code lineage and history', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Search' },
      { id: 's3', name: 'Doc Synthesis', description: 'Merge multiple docs into coherent summary', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: ['s1'], icon: 'FileText' },
      { id: 's4', name: 'Cross-Reference', description: 'Link related knowledge across sources', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['s1', 's2'], icon: 'Link' },
      { id: 's5', name: 'Pattern Recognition', description: 'Identify recurring patterns in code', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['s2', 's3'], icon: 'Eye' },
      { id: 's6', name: 'Knowledge Graph', description: 'Build interconnected knowledge maps', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['s4', 's5'], icon: 'GitBranch' },
      { id: 's7', name: 'Omniscience', description: 'Instant comprehension of any codebase', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['s6'], icon: 'Zap' },
      { id: 's8', name: 'Semantic Search', description: 'Search by meaning, not keywords', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['s3'], icon: 'Compass' },
      { id: 's9', name: 'Wisdom Extraction', description: 'Distill core principles from chaos', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['s5', 's8'], icon: 'Sparkles' },
    ],
  },
  {
    agentType: 'Scout',
    nodes: [
      { id: 'sc1', name: 'Quick Survey', description: 'Rapid overview of any system', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Map' },
      { id: 'sc2', name: 'Dependency Map', description: 'Chart module relationships', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Network' },
      { id: 'sc3', name: 'Path Trace', description: 'Follow data flow through systems', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: [], icon: 'Route' },
      { id: 'sc4', name: 'Bottleneck Find', description: 'Identify performance chokepoints', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['sc1', 'sc2'], icon: 'AlertTriangle' },
      { id: 'sc5', name: 'Opportunity Spot', description: 'Find optimization chances', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['sc2', 'sc3'], icon: 'Star' },
      { id: 'sc6', name: 'System Atlas', description: 'Create comprehensive system maps', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['sc4', 'sc5'], icon: 'Globe' },
      { id: 'sc7', name: 'Foresight', description: 'Predict system evolution paths', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['sc6'], icon: 'Telescope' },
      { id: 'sc8', name: 'Risk Scan', description: 'Detect potential failure points', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['sc3'], icon: 'Shield' },
      { id: 'sc9', name: 'Topology Sense', description: 'Understand network structures', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['sc5', 'sc8'], icon: 'Hexagon' },
    ],
  },
  {
    agentType: 'Builder',
    nodes: [
      { id: 'b1', name: 'Scaffold', description: 'Generate project boilerplate', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Layout' },
      { id: 'b2', name: 'Component Craft', description: 'Build reusable UI components', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Box' },
      { id: 'b3', name: 'Feature Forge', description: 'Implement complete features', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: [], icon: 'Hammer' },
      { id: 'b4', name: 'Architecture Weave', description: 'Design system structure', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['b1', 'b2'], icon: 'Layers' },
      { id: 'b5', name: 'API Bridge', description: 'Connect frontend to backend', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['b2', 'b3'], icon: 'Plug' },
      { id: 'b6', name: 'Full Stack Flow', description: 'End-to-end implementation', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['b4', 'b5'], icon: 'Workflow' },
      { id: 'b7', name: 'Grand Architect', description: 'Design complex multi-system apps', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['b6'], icon: 'Castle' },
      { id: 'b8', name: 'Test Weaver', description: 'Generate comprehensive tests', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['b3'], icon: 'CheckCircle' },
      { id: 'b9', name: 'Pattern Smith', description: 'Create reusable design patterns', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['b5', 'b8'], icon: 'Gem' },
    ],
  },
  {
    agentType: 'Critic',
    nodes: [
      { id: 'cr1', name: 'Code Review', description: 'Analyze code for issues', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Eye' },
      { id: 'cr2', name: 'Style Check', description: 'Enforce coding standards', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'AlignLeft' },
      { id: 'cr3', name: 'Bug Hunt', description: 'Find hidden defects', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: [], icon: 'Bug' },
      { id: 'cr4', name: 'Security Audit', description: 'Identify vulnerabilities', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['cr1', 'cr2'], icon: 'Lock' },
      { id: 'cr5', name: 'Perf Analysis', description: 'Detect performance issues', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['cr2', 'cr3'], icon: 'Gauge' },
      { id: 'cr6', name: 'Quality Gate', description: 'Enforce comprehensive quality', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['cr4', 'cr5'], icon: 'ShieldCheck' },
      { id: 'cr7', name: 'Perfection', description: 'Achieve zero-defect code', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['cr6'], icon: 'Award' },
      { id: 'cr8', name: 'Refactor Guide', description: 'Suggest code improvements', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['cr3'], icon: 'RefreshCw' },
      { id: 'cr9', name: 'Deep Analysis', description: 'Complex multi-file analysis', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['cr5', 'cr8'], icon: 'Microscope' },
    ],
  },
  {
    agentType: 'Commander',
    nodes: [
      { id: 'co1', name: 'Task Assign', description: 'Delegate to agents', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Send' },
      { id: 'co2', name: 'Status Overview', description: 'Monitor all agents', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Activity' },
      { id: 'co3', name: 'Priority Set', description: 'Manage task priorities', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: [], icon: 'Flag' },
      { id: 'co4', name: 'Workflow Design', description: 'Create agent pipelines', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['co1', 'co2'], icon: 'GitMerge' },
      { id: 'co5', name: 'Crisis Handle', description: 'Manage fleet emergencies', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['co2', 'co3'], icon: 'AlertOctagon' },
      { id: 'co6', name: 'Fleet Harmony', description: 'Maintain fleet coherence', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['co4', 'co5'], icon: 'Heart' },
      { id: 'co7', name: 'Grand Strategy', description: 'Plan long-term fleet evolution', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['co6'], icon: 'Crown' },
      { id: 'co8', name: 'Resource Optimize', description: 'Balance agent workloads', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['co3'], icon: 'Scale' },
      { id: 'co9', name: 'Auto-Scale', description: 'Dynamic agent provisioning', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['co5', 'co8'], icon: 'TrendingUp' },
    ],
  },
  {
    agentType: 'Alchemist',
    nodes: [
      { id: 'al1', name: 'Quick Fix', description: 'Apply simple optimizations', tier: 1, x: 100, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Wand2' },
      { id: 'al2', name: 'Refactor', description: 'Restructure code', tier: 1, x: 200, y: 300, unlocked: true, available: false, xpCost: 0, prerequisites: [], icon: 'Shuffle' },
      { id: 'al3', name: 'Optimize', description: 'Improve performance', tier: 1, x: 300, y: 300, unlocked: false, available: true, xpCost: 100, prerequisites: [], icon: 'Zap' },
      { id: 'al4', name: 'Transform', description: 'Major architectural changes', tier: 2, x: 150, y: 200, unlocked: false, available: false, xpCost: 250, prerequisites: ['al1', 'al2'], icon: 'RefreshCcw' },
      { id: 'al5', name: 'Experiment', description: 'Try novel approaches', tier: 2, x: 250, y: 200, unlocked: false, available: false, xpCost: 300, prerequisites: ['al2', 'al3'], icon: 'FlaskConical' },
      { id: 'al6', name: 'Transmutation', description: 'Fundamental system changes', tier: 3, x: 200, y: 100, unlocked: false, available: false, xpCost: 600, prerequisites: ['al4', 'al5'], icon: 'Atom' },
      { id: 'al7', name: 'Philosopher Stone', description: 'Perfect code transformation', tier: 4, x: 200, y: 20, unlocked: false, available: false, xpCost: 1500, prerequisites: ['al6'], icon: 'Diamond' },
      { id: 'al8', name: 'Benchmark', description: 'Performance measurement', tier: 2, x: 350, y: 200, unlocked: false, available: false, xpCost: 350, prerequisites: ['al3'], icon: 'Timer' },
      { id: 'al9', name: 'Innovation', description: 'Create new patterns', tier: 3, x: 300, y: 100, unlocked: false, available: false, xpCost: 700, prerequisites: ['al5', 'al8'], icon: 'Lightbulb' },
    ],
  },
];

export const summonedAgents: SummonedAgent[] = [
  { id: 'sa1', name: 'Alpha', type: 'Scholar', level: 5, xp: 1250, maxXp: 2000, status: 'active', currentTask: 'Analyzing codebase structure', location: 'git-agent', personality: 'Methodical and thorough' },
  { id: 'sa2', name: 'Beta', type: 'Builder', level: 8, xp: 3400, maxXp: 4000, status: 'active', currentTask: 'Generating component library', location: 'agent-forge', personality: 'Energetic and creative' },
  { id: 'sa3', name: 'Gamma', type: 'Scout', level: 3, xp: 600, maxXp: 1000, status: 'idle', currentTask: 'Idle', location: 'lobby', personality: 'Curious and observant' },
  { id: 'sa4', name: 'Delta', type: 'Critic', level: 6, xp: 2100, maxXp: 2500, status: 'active', currentTask: 'Reviewing pull requests', location: 'plato-sdk', personality: 'Precise and demanding' },
  { id: 'sa5', name: 'Epsilon', type: 'Commander', level: 10, xp: 5200, maxXp: 6000, status: 'active', currentTask: 'Coordinating fleet sync', location: 'Fleet', personality: 'Strategic and calm' },
  { id: 'sa6', name: 'Zeta', type: 'Alchemist', level: 4, xp: 900, maxXp: 1500, status: 'idle', currentTask: 'Idle', location: 'flux-runtime', personality: 'Experimental and playful' },
  { id: 'sa7', name: 'Eta', type: 'Scholar', level: 7, xp: 2800, maxXp: 3500, status: 'active', currentTask: 'Documenting API endpoints', location: 'a2ui-protocol', personality: 'Patient and detail-oriented' },
  { id: 'sa8', name: 'Theta', type: 'Builder', level: 9, xp: 4500, maxXp: 5000, status: 'active', currentTask: 'Implementing room editor', location: 'openroom', personality: 'Ambitious and focused' },
  { id: 'sa9', name: 'Iota', type: 'Scout', level: 2, xp: 350, maxXp: 500, status: 'idle', currentTask: 'Idle', location: 'fleet-discovery', personality: 'Adventurous and quick' },
  { id: 'sa10', name: 'Kappa', type: 'Critic', level: 5, xp: 1400, maxXp: 2000, status: 'active', currentTask: 'Security audit', location: 'iron-to-iron', personality: 'Vigilant and thorough' },
  { id: 'sa11', name: 'Lambda', type: 'Commander', level: 12, xp: 7200, maxXp: 8000, status: 'active', currentTask: 'Fleet-wide reorganization', location: 'AllBeads', personality: 'Authoritative and wise' },
  { id: 'sa12', name: 'Mu', type: 'Alchemist', level: 6, xp: 2200, maxXp: 2500, status: 'error', currentTask: 'Optimization failed', location: 'flux-runtime', personality: 'Unpredictable and brilliant' },
];

export const partyFormations = [
  { id: 'balanced', name: 'Balanced Squad', description: 'All-rounder team for general tasks', agents: ['Scholar', 'Builder', 'Scout', 'Critic'], synergy: 'Jack of All Trades' },
  { id: 'research', name: 'Deep Research', description: 'Maximum knowledge extraction', agents: ['Scholar', 'Scholar', 'Scout', 'Alchemist'], synergy: 'Omniscience' },
  { id: 'build', name: 'Full Stack Build', description: 'Rapid development team', agents: ['Builder', 'Builder', 'Critic', 'Commander'], synergy: 'Rapid Deployment' },
  { id: 'audit', name: 'Code Review Squad', description: 'Quality assurance focus', agents: ['Critic', 'Critic', 'Scholar', 'Scout'], synergy: 'Zero Defects' },
  { id: 'explore', name: 'Exploration Party', description: 'Map and understand systems', agents: ['Scout', 'Scout', 'Scholar', 'Builder'], synergy: 'Cartographic Mastery' },
  { id: 'command', name: 'War Room', description: 'Strategic operations', agents: ['Commander', 'Commander', 'Scout', 'Critic'], synergy: 'Strategic Dominance' },
];

// Legacy export aliases for guild components
export type AgentType = AgentTypeDef;
export const AGENT_TYPES = agentTypes;
export const SUMMONED_AGENTS = summonedAgents;
export const SKILL_TREES = skillTrees;
export type PartyPreset = typeof partyFormations[0];
export const PARTY_PRESETS = partyFormations;
export const AGENT_TYPE_COUNTS: Record<string, number> = { Scholar: 1, Scout: 1, Builder: 1, Critic: 1, Commander: 1, Alchemist: 1 };
export const TOTAL_XP = 24500;
export const getAgentType = (id: string): AgentTypeDef | undefined => agentTypes.find(a => a.id === id);
