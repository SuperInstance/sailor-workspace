export type TileType = 'Book' | 'Map' | 'Blueprint' | 'Warning' | 'Scroll' | 'Console' | 'Vial';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface PLATOTile {
  id: string;
  name: string;
  type: TileType;
  rarity: Rarity;
  content: string;
  question: string;
  answer: string;
  source: string;
  sourceRoom: string;
  agentType: string;
  confidence: number;
  tags: string[];
  createdAt: string;
  timesAbsorbed: number;
  relatedTileIds: string[];
}

export const TILE_TYPE_CONFIG: Record<TileType, { color: string; bgClass: string; borderClass: string; icon: string }> = {
  Book: { color: '#4A90D9', bgClass: 'bg-scholar-blue/20', borderClass: 'border-scholar-blue/40', icon: 'book-open' },
  Map: { color: '#5BBD76', bgClass: 'bg-scout-green/20', borderClass: 'border-scout-green/40', icon: 'map' },
  Blueprint: { color: '#E8913A', bgClass: 'bg-builder-orange/20', borderClass: 'border-builder-orange/40', icon: 'drafting-compass' },
  Warning: { color: '#D94A4A', bgClass: 'bg-critic-red/20', borderClass: 'border-critic-red/40', icon: 'alert-triangle' },
  Scroll: { color: '#F5CB4E', bgClass: 'bg-amber-400/20', borderClass: 'border-amber-400/40', icon: 'scroll' },
  Console: { color: '#9B6DD1', bgClass: 'bg-commander-purple/20', borderClass: 'border-commander-purple/40', icon: 'terminal' },
  Vial: { color: '#4AD9C9', bgClass: 'bg-alchemist-teal/20', borderClass: 'border-alchemist-teal/40', icon: 'flask-conical' },
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  uncommon: '#4ADE80',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#FFD700',
};

export const TILE_TYPE_COUNTS = [
  { type: 'Book' as TileType, count: 67 },
  { type: 'Map' as TileType, count: 45 },
  { type: 'Blueprint' as TileType, count: 53 },
  { type: 'Warning' as TileType, count: 28 },
  { type: 'Scroll' as TileType, count: 41 },
  { type: 'Console' as TileType, count: 38 },
  { type: 'Vial' as TileType, count: 40 },
];

export const TOTAL_TILES = 312;

export const COHERENCE_DATA = {
  current: {
    gamma: 0.280,
    H: 0.847,
    V: 42,
    logV: 3.738,
    sum: 1.127,
  },
  history: [
    { timestamp: '2024-01-01T00:00:00Z', value: 1.089 },
    { timestamp: '2024-01-02T00:00:00Z', value: 1.095 },
    { timestamp: '2024-01-03T00:00:00Z', value: 1.102 },
    { timestamp: '2024-01-04T00:00:00Z', value: 1.098 },
    { timestamp: '2024-01-05T00:00:00Z', value: 1.105 },
    { timestamp: '2024-01-06T00:00:00Z', value: 1.112 },
    { timestamp: '2024-01-07T00:00:00Z', value: 1.108 },
    { timestamp: '2024-01-08T00:00:00Z', value: 1.115 },
    { timestamp: '2024-01-09T00:00:00Z', value: 1.120 },
    { timestamp: '2024-01-10T00:00:00Z', value: 1.118 },
    { timestamp: '2024-01-11T00:00:00Z', value: 1.124 },
    { timestamp: '2024-01-12T00:00:00Z', value: 1.127 },
    { timestamp: '2024-01-13T00:00:00Z', value: 1.130 },
    { timestamp: '2024-01-14T00:00:00Z', value: 1.125 },
    { timestamp: '2024-01-15T00:00:00Z', value: 1.132 },
    { timestamp: '2024-01-16T00:00:00Z', value: 1.135 },
    { timestamp: '2024-01-17T00:00:00Z', value: 1.131 },
    { timestamp: '2024-01-18T00:00:00Z', value: 1.128 },
    { timestamp: '2024-01-19T00:00:00Z', value: 1.134 },
    { timestamp: '2024-01-20T00:00:00Z', value: 1.127 },
  ],
  hourly: [
    { timestamp: '10:00', value: 1.118 },
    { timestamp: '11:00', value: 1.121 },
    { timestamp: '12:00', value: 1.124 },
    { timestamp: '13:00', value: 1.122 },
    { timestamp: '14:00', value: 1.125 },
    { timestamp: '15:00', value: 1.128 },
    { timestamp: '16:00', value: 1.126 },
    { timestamp: '17:00', value: 1.130 },
    { timestamp: '18:00', value: 1.132 },
    { timestamp: '19:00', value: 1.129 },
    { timestamp: '20:00', value: 1.131 },
    { timestamp: '21:00', value: 1.127 },
  ],
  status: 'Harmonic' as 'Harmonic' | 'Stable' | 'Stressed' | 'Critical',
  trend: '+0.03',
};

export const SAMPLE_TILES: PLATOTile[] = [
  {
    id: 'tile-1', name: 'React Component Patterns', type: 'Book', rarity: 'rare',
    content: 'Higher-order components, render props, and custom hooks are the three primary patterns for code reuse in React. Each has trade-offs in terms of readability and flexibility.',
    question: 'What are the main patterns for React component reuse?', answer: 'HOCs, render props, and custom hooks.',
    source: 'Agent Scholar-Alpha', sourceRoom: 'flux-runtime', agentType: 'scholar', confidence: 0.94,
    tags: ['react', 'patterns', 'components'], createdAt: '2024-01-15T10:30:00Z', timesAbsorbed: 12, relatedTileIds: ['tile-2', 'tile-3'],
  },
  {
    id: 'tile-2', name: 'Hook Rules & Conventions', type: 'Book', rarity: 'common',
    content: 'Hooks must only be called at the top level of React functions. They cannot be called inside loops, conditions, or nested functions.',
    question: 'Where can hooks be called in React?', answer: 'Only at the top level of React functions.',
    source: 'Agent Scholar-Eta', sourceRoom: 'flux-runtime', agentType: 'scholar', confidence: 0.98,
    tags: ['react', 'hooks', 'rules'], createdAt: '2024-01-14T08:15:00Z', timesAbsorbed: 8, relatedTileIds: ['tile-1', 'tile-4'],
  },
  {
    id: 'tile-3', name: 'Architecture Overview', type: 'Map', rarity: 'uncommon',
    content: 'The flux-runtime repository follows a layered architecture: presentation, business logic, data access, and infrastructure layers.',
    question: 'What architecture does flux-runtime use?', answer: 'Layered: presentation, business logic, data access, infrastructure.',
    source: 'Agent Scout-Beta', sourceRoom: 'flux-runtime', agentType: 'scout', confidence: 0.87,
    tags: ['architecture', 'layers', 'overview'], createdAt: '2024-01-13T14:20:00Z', timesAbsorbed: 5, relatedTileIds: ['tile-1'],
  },
  {
    id: 'tile-4', name: 'CI/CD Pipeline Spec', type: 'Blueprint', rarity: 'rare',
    content: 'Build → Test → Lint → TypeCheck → Deploy. Uses GitHub Actions with matrix builds across Node 18, 20, and 22.',
    question: 'What is the CI/CD pipeline flow?', answer: 'Build → Test → Lint → TypeCheck → Deploy.',
    source: 'Agent Builder-Gamma', sourceRoom: 'super-instance', agentType: 'builder', confidence: 0.91,
    tags: ['cicd', 'pipeline', 'github-actions'], createdAt: '2024-01-12T09:45:00Z', timesAbsorbed: 15, relatedTileIds: ['tile-5'],
  },
  {
    id: 'tile-5', name: 'Docker Compose Setup', type: 'Blueprint', rarity: 'common',
    content: 'Services: app (Node 20), postgres (15), redis (7). Volumes for data persistence. Health checks on all services.',
    question: 'What services are in the Docker setup?', answer: 'Node app, PostgreSQL, Redis with health checks.',
    source: 'Agent Builder-Theta', sourceRoom: 'super-instance', agentType: 'builder', confidence: 0.89,
    tags: ['docker', 'infrastructure', 'setup'], createdAt: '2024-01-11T16:00:00Z', timesAbsorbed: 6, relatedTileIds: ['tile-4'],
  },
  {
    id: 'tile-6', name: 'Security Vulnerability: SQL Injection', type: 'Warning', rarity: 'epic',
    content: 'CRITICAL: The user input in query builder is not properly parameterized. Attackers could execute arbitrary SQL commands.',
    question: 'What is the security risk in the query builder?', answer: 'SQL injection via unparameterized user input.',
    source: 'Agent Critic-Delta', sourceRoom: 'auth-service', agentType: 'critic', confidence: 0.96,
    tags: ['security', 'sql-injection', 'critical'], createdAt: '2024-01-10T11:30:00Z', timesAbsorbed: 22, relatedTileIds: ['tile-7'],
  },
  {
    id: 'tile-7', name: 'Auth Token Validation', type: 'Warning', rarity: 'rare',
    content: 'JWT tokens must be validated for expiration, signature, and issuer. Tokens without expiry are a security risk.',
    question: 'How should JWT tokens be validated?', answer: 'Check expiration, signature, and issuer.',
    source: 'Agent Critic-Kappa', sourceRoom: 'auth-service', agentType: 'critic', confidence: 0.93,
    tags: ['security', 'jwt', 'auth'], createdAt: '2024-01-09T13:45:00Z', timesAbsorbed: 18, relatedTileIds: ['tile-6'],
  },
  {
    id: 'tile-8', name: 'The Saga of Fleet Coordination', type: 'Scroll', rarity: 'uncommon',
    content: 'When the fleet grew beyond twenty agents, chaos reigned. Messages crossed, tasks conflicted, and coherence began to drift. Commander-Epsilon rose to the challenge...',
    question: 'How was fleet coordination established?', answer: 'Through hierarchical delegation and the sync protocol.',
    source: 'Agent Commander-Epsilon', sourceRoom: 'Fleet Core', agentType: 'commander', confidence: 0.85,
    tags: ['story', 'fleet', 'coordination'], createdAt: '2024-01-08T10:00:00Z', timesAbsorbed: 3, relatedTileIds: ['tile-9'],
  },
  {
    id: 'tile-9', name: 'Topology Management Guide', type: 'Console', rarity: 'rare',
    content: 'Fleet topology uses a directed acyclic graph. Each agent node connects to its task dependencies. Cycles are detected and broken automatically.',
    question: 'What data structure manages fleet topology?', answer: 'A directed acyclic graph (DAG).',
    source: 'Agent Commander-Mu', sourceRoom: 'Fleet Core', agentType: 'commander', confidence: 0.92,
    tags: ['topology', 'dag', 'management'], createdAt: '2024-01-07T15:30:00Z', timesAbsorbed: 9, relatedTileIds: ['tile-8'],
  },
  {
    id: 'tile-10', name: 'Legacy Code Refactoring', type: 'Vial', rarity: 'uncommon',
    content: 'The parser module uses outdated regex patterns. Replace with a proper AST-based approach using acorn or babel-parser.',
    question: 'How should the parser be refactored?', answer: 'Replace regex with AST-based parsing.',
    source: 'Agent Alchemist-Zeta', sourceRoom: 'plato-parser', agentType: 'alchemist', confidence: 0.88,
    tags: ['refactoring', 'parser', 'ast'], createdAt: '2024-01-06T09:20:00Z', timesAbsorbed: 7, relatedTileIds: ['tile-11'],
  },
  {
    id: 'tile-11', name: 'Migration Strategy: JS to TS', type: 'Vial', rarity: 'rare',
    content: 'Phase 1: Add type declarations. Phase 2: Convert core modules. Phase 3: Enable strict mode. Phase 4: Full type coverage.',
    question: 'What is the JS to TS migration strategy?', answer: '4 phases: declarations, core modules, strict mode, full coverage.',
    source: 'Agent Alchemist-Lambda', sourceRoom: 'plato-parser', agentType: 'alchemist', confidence: 0.91,
    tags: ['migration', 'typescript', 'strategy'], createdAt: '2024-01-05T14:10:00Z', timesAbsorbed: 11, relatedTileIds: ['tile-10'],
  },
  {
    id: 'tile-12', name: 'State Management Comparison', type: 'Book', rarity: 'uncommon',
    content: 'Redux provides global state with predictable updates. Zustand offers simplicity. Jotai uses atomic approach. Context API for simple cases.',
    question: 'What are the state management options?', answer: 'Redux, Zustand, Jotai, and Context API.',
    source: 'Agent Scholar-Alpha', sourceRoom: 'flux-runtime', agentType: 'scholar', confidence: 0.90,
    tags: ['state', 'redux', 'zustand', 'comparison'], createdAt: '2024-01-16T11:00:00Z', timesAbsorbed: 14, relatedTileIds: ['tile-1'],
  },
  {
    id: 'tile-13', name: 'Dependency Graph: neural-mesh', type: 'Map', rarity: 'rare',
    content: 'neural-mesh depends on: tensor-core, gradient-flow, and optim-lib. 14 direct dependencies, 87 transitive. Critical path: tensor-core → activations → output.',
    question: 'What are the key dependencies of neural-mesh?', answer: 'tensor-core, gradient-flow, optim-lib with 87 transitive deps.',
    source: 'Agent Scout-Beta', sourceRoom: 'neural-mesh', agentType: 'scout', confidence: 0.89,
    tags: ['dependencies', 'neural-mesh', 'graph'], createdAt: '2024-01-17T08:30:00Z', timesAbsorbed: 4, relatedTileIds: ['tile-3'],
  },
  {
    id: 'tile-14', name: 'API Gateway Design', type: 'Blueprint', rarity: 'epic',
    content: 'Rate limiting: 100 req/min per key. Authentication via JWT. Routes: /api/v1/* proxied to microservices. Health check at /health.',
    question: 'What are the API Gateway specifications?', answer: '100 req/min rate limit, JWT auth, /api/v1/* proxy, /health check.',
    source: 'Agent Builder-Gamma', sourceRoom: 'super-instance', agentType: 'builder', confidence: 0.93,
    tags: ['api', 'gateway', 'design'], createdAt: '2024-01-18T13:20:00Z', timesAbsorbed: 19, relatedTileIds: ['tile-4'],
  },
  {
    id: 'tile-15', name: 'Memory Leak Detection', type: 'Warning', rarity: 'uncommon',
    content: 'Event listeners not being removed on component unmount. Use cleanup functions in useEffect. Check for closure references holding large objects.',
    question: 'What causes memory leaks in React?', answer: 'Uncleaned event listeners and closures holding large objects.',
    source: 'Agent Critic-Kappa', sourceRoom: 'flux-runtime', agentType: 'critic', confidence: 0.87,
    tags: ['memory', 'react', 'performance'], createdAt: '2024-01-19T10:45:00Z', timesAbsorbed: 10, relatedTileIds: ['tile-6'],
  },
  {
    id: 'tile-16', name: 'The Legend of OpenRoom', type: 'Scroll', rarity: 'legendary',
    content: 'In the beginning, there was only chaos. Code sprawled across repositories, untamed and wild. Then came the Architects, who envisioned a world where agents and humans could build together...',
    question: 'What is the origin story of OpenRoom?', answer: 'A world where agents and humans collaborate to build software.',
    source: 'Agent Commander-Mu', sourceRoom: 'Fleet Core', agentType: 'commander', confidence: 0.78,
    tags: ['lore', 'origin', 'openroom'], createdAt: '2024-01-01T00:00:00Z', timesAbsorbed: 31, relatedTileIds: ['tile-8'],
  },
  {
    id: 'tile-17', name: 'Fleet Metrics Dashboard', type: 'Console', rarity: 'rare',
    content: 'Grafana dashboard showing: agent count, task queue depth, coherence value, error rate, and latency percentiles. Alerts when coherence < 0.8.',
    question: 'What metrics does the fleet dashboard show?', answer: 'Agent count, queue depth, coherence, error rate, latency.',
    source: 'Agent Commander-Epsilon', sourceRoom: 'Fleet Core', agentType: 'commander', confidence: 0.94,
    tags: ['metrics', 'dashboard', 'monitoring'], createdAt: '2024-01-20T09:00:00Z', timesAbsorbed: 13, relatedTileIds: ['tile-9'],
  },
  {
    id: 'tile-18', name: 'Prototype: AI Code Review', type: 'Vial', rarity: 'epic',
    content: 'Experimental AI-driven code review using LLM agents. Accuracy: 87% on test set. False positive rate: 12%. Recommended for initial screening only.',
    question: 'What are the metrics for AI code review?', answer: '87% accuracy, 12% false positive rate.',
    source: 'Agent Alchemist-Zeta', sourceRoom: 'plato-parser', agentType: 'alchemist', confidence: 0.82,
    tags: ['ai', 'experiment', 'code-review'], createdAt: '2024-01-20T15:30:00Z', timesAbsorbed: 8, relatedTileIds: ['tile-10'],
  },
  {
    id: 'tile-19', name: 'Testing Best Practices', type: 'Book', rarity: 'common',
    content: 'Unit tests for business logic. Integration tests for API endpoints. E2E tests for critical user flows. Aim for 80%+ coverage.',
    question: 'What are the testing guidelines?', answer: 'Unit, integration, E2E tests with 80%+ coverage.',
    source: 'Agent Scholar-Alpha', sourceRoom: 'code-validator', agentType: 'scholar', confidence: 0.95,
    tags: ['testing', 'best-practices', 'coverage'], createdAt: '2024-01-21T08:15:00Z', timesAbsorbed: 16, relatedTileIds: ['tile-2'],
  },
  {
    id: 'tile-20', name: 'Performance Bottleneck Analysis', type: 'Map', rarity: 'rare',
    content: 'Main bottlenecks: database queries (45%), API serialization (25%), and frontend rendering (20%). Focus on query optimization first.',
    question: 'Where are the main performance bottlenecks?', answer: 'DB queries 45%, serialization 25%, rendering 20%.',
    source: 'Agent Scout-Iota', sourceRoom: 'super-instance', agentType: 'scout', confidence: 0.90,
    tags: ['performance', 'bottleneck', 'optimization'], createdAt: '2024-01-21T12:00:00Z', timesAbsorbed: 7, relatedTileIds: ['tile-13'],
  },
  {
    id: 'tile-21', name: 'Microservices Communication', type: 'Blueprint', rarity: 'uncommon',
    content: 'Services communicate via gRPC for internal calls and REST for external. Event bus using Redis pub/sub for async notifications.',
    question: 'How do microservices communicate?', answer: 'gRPC internal, REST external, Redis pub/sub for events.',
    source: 'Agent Builder-Theta', sourceRoom: 'super-instance', agentType: 'builder', confidence: 0.88,
    tags: ['microservices', 'grpc', 'communication'], createdAt: '2024-01-22T10:30:00Z', timesAbsorbed: 5, relatedTileIds: ['tile-14'],
  },
  {
    id: 'tile-22', name: 'Code Smell Catalog', type: 'Warning', rarity: 'common',
    content: 'Common smells: long methods, duplicate code, feature envy, god classes, magic numbers. Each requires specific refactoring techniques.',
    question: 'What are common code smells?', answer: 'Long methods, duplication, feature envy, god classes, magic numbers.',
    source: 'Agent Critic-Delta', sourceRoom: 'code-validator', agentType: 'critic', confidence: 0.92,
    tags: ['code-smells', 'refactoring', 'quality'], createdAt: '2024-01-22T14:45:00Z', timesAbsorbed: 9, relatedTileIds: ['tile-15'],
  },
  {
    id: 'tile-23', name: 'Conservation Law Derivation', type: 'Scroll', rarity: 'legendary',
    content: 'The conservation law gamma + H = 1.283 - 0.159*log(V) was discovered by observing fleet behavior across 100+ repositories. It represents the fundamental tradeoff between fleet size and coherence.',
    question: 'What does the conservation law represent?', answer: 'The tradeoff between fleet size and coherence.',
    source: 'Agent Commander-Mu', sourceRoom: 'Fleet Core', agentType: 'commander', confidence: 0.97,
    tags: ['law', 'coherence', 'mathematics'], createdAt: '2024-01-05T00:00:00Z', timesAbsorbed: 42, relatedTileIds: ['tile-16'],
  },
  {
    id: 'tile-24', name: 'Error Handling Patterns', type: 'Console', rarity: 'uncommon',
    content: 'Use Result<T,E> types for expected errors. Throw exceptions for unexpected failures. Always log with context. Retry transient errors with exponential backoff.',
    question: 'What are the error handling patterns?', answer: 'Result types for expected, exceptions for unexpected, retry with backoff.',
    source: 'Agent Commander-Epsilon', sourceRoom: 'super-instance', agentType: 'commander', confidence: 0.91,
    tags: ['errors', 'patterns', 'resilience'], createdAt: '2024-01-23T09:20:00Z', timesAbsorbed: 11, relatedTileIds: ['tile-17'],
  },
  {
    id: 'tile-25', name: 'Database Schema Evolution', type: 'Vial', rarity: 'rare',
    content: 'Use migration scripts with versioning. Never delete columns in the same release that stops writing to them. Backward compatibility is essential.',
    question: 'How should database schemas evolve?', answer: 'Versioned migrations, backward compatible changes.',
    source: 'Agent Alchemist-Lambda', sourceRoom: 'auth-service', agentType: 'alchemist', confidence: 0.89,
    tags: ['database', 'migrations', 'schema'], createdAt: '2024-01-23T13:00:00Z', timesAbsorbed: 6, relatedTileIds: ['tile-11'],
  },
];

export function getTileTypeColor(type: TileType): string {
  return TILE_TYPE_CONFIG[type]?.color ?? '#9CA3AF';
}

export function getRarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity];
}

export function getRelatedTiles(tile: PLATOTile): PLATOTile[] {
  return SAMPLE_TILES.filter(t => tile.relatedTileIds.includes(t.id));
}
