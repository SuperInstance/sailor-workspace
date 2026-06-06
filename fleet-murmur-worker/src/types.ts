/**
 * types.ts — Shared type definitions for the Fleet Murmur Worker
 */

/** Agent context transmitted with each message */
export interface AgentContext {
  agentId: string;
  source: 'codespace' | 'webhook' | 'bot' | 'gateway' | 'cron';
  room?: string;
  sessionId?: string;
  timestamp: string;
}

/** Incoming agent message */
export interface AgentMessage {
  id: string;
  intent: string;
  context: AgentContext;
  replyTo?: string;
  metadata?: Record<string, string>;
}

/** Agent response */
export interface AgentResponse {
  id: string;
  status: 'completed' | 'blocked' | 'error' | 'pending';
  path: 'fast' | 'similar' | 'slow';
  confidence: number;
  response: string;
  action?: string;
  reflexId?: string;
  durationMs: number;
  error?: string;
}

/** A stored reflex (mirrors pincher's Reflex type) */
export interface ReflexRecord {
  id: string;
  intent: string;
  action: string;
  embedding: number[];
  confidence: number;
  invokeCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  source: string;
}

/** Vector DB search result */
export interface SearchResult {
  reflex: ReflexRecord;
  score: number; // cosine similarity
}

/** Match classification (mirrors pincher) */
export enum MatchType {
  Exact = 'exact',   // score ≥ 0.80
  Similar = 'similar', // 0.55 ≤ score < 0.80
  Novel = 'novel',   // score < 0.55
}

/** Match thresholds */
export interface MatchThresholds {
  exact: number;   // default: 0.80
  similar: number; // default: 0.55
}

/** Veto result */
export interface VetoDecision {
  allow: boolean;
  reason?: string;
}

/** Health check response */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  agent: string;
  vectorDb: { backend: string; status: string; reflexCount: number };
  llm: { configured: boolean; provider: string };
  blackboard: { configured: boolean; repo: string };
}

/** Runtime metrics */
export interface RuntimeMetrics {
  totalRequests: number;
  fastPathCount: number;
  slowPathCount: number;
  fastPathPct: number;
  avgResponseMs: number;
  avgFastPathMs: number;
  avgSlowPathMs: number;
  reflexesStored: number;
  agentsRegistered: number;
  blackboardBroadcasts: number;
  errors: { vetoBlocked: number; llmFailed: number; blackboardFailed: number };
}

/** Blackboard podcast format */
export interface BlackboardPodcast {
  podcastId: string;
  channel: string;
  agent: string;
  variant: 'standard' | 'heartbeat' | 'blocker' | 'insight' | 'request' | 'micro';
  sequence: number;
  created: string;
  path: string;
  confidence: number;
  durationMs: number;
  reflexId?: string;
  intent: string;
  response: string;
  sourceAgent: string;
  tags: string[];
}

/** Teach request */
export interface TeachRequest {
  intent: string;
  action: string;
  tags?: string[];
  confidence?: number;
}

/** Env bindings */
export interface Env {
  // Secrets (set via wrangler secret)
  GITHUB_TOKEN?: string;
  DEEPINFRA_API_KEY?: string;
  VECTOR_DB_KEY?: string;
  NOTION_TOKEN?: string;

  // DO binding
  AGENT_COORDINATION: DurableObjectNamespace;

  // KV bindings
  REFLEX_STORE: KVNamespace;
  CACHE: KVNamespace;

  // Config (env vars)
  AGENT_NAME: string;
  AGENT_ROLE: string;
  VECTOR_DB_BACKEND: string;
  DEEPINFRA_API_URL: string;
  EMBEDDING_SERVICE: string;
  BLACKBOARD_REPO: string;
  BLACKBOARD_BRANCH: string;
  NOTION_DATABASE_ID: string;
  VECTOR_DB_API: string;
  VERSION: string;
}
