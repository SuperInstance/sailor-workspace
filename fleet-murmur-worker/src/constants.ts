/**
 * constants.ts — Shared configuration constants
 */

/** Default match thresholds (mirrors pincher defaults) */
export const DEFAULT_THRESHOLDS = {
  exact: 0.80,
  similar: 0.55,
};

/** Embedding dimension (pincher uses all-MiniLM-L6-v2 = 384) */
export const EMBEDDING_DIM = 384;

/** Confidence multiplier for successful fast-path execution (mirrors pincher) */
export const CONFIDENCE_BOOST_FAST = 1.005;

/** Confidence multiplier for successful slow-path execution */
export const CONFIDENCE_BOOST_SLOW = 1.01;

/** Confidence multiplier for failure / user correction */
export const CONFIDENCE_PENALTY = 0.90;

/** Confidence multiplier for veto-blocked actions */
export const CONFIDENCE_VETO_PENALTY = 0.80;

/** Default confidence for new reflexes */
export const DEFAULT_CONFIDENCE = 0.60;

/** KV key prefixes */
export const KV_PREFIXES = {
  reflex: 'reflex:',
  reflexIndexByHash: 'reflex-index:hash:', // reflex-index:hash:{hash} → reflex ID
  reflexIndexByTag: 'reflex-index:tag:',   // reflex-index:tag:{tag} → reflex ID[]
  cache: 'cache:',
  sequence: 'sequence:',
  errors: 'errors:',
  agent: 'agent:',
  subscription: 'subscription:',
} as const;

/** Blackboard channel names */
export const BB_CHANNELS = {
  responses: 'agent/fleet-murmur-worker/responses',
  status: 'agent/fleet-murmur-worker/status',
  reflexes: 'agent/fleet-murmur-worker/reflexes',
  errors: 'agent/fleet-murmur-worker/errors',
} as const;

/** Cache TTLs in seconds */
export const CACHE_TTL = {
  fastPath: 300,    // 5 min for fast path responses
  slowPath: 3600,   // 1 hour for slow path responses
  reflex: 86400,    // 24 hours for reflex definitions
  subscription: 600, // 10 min for subscription configs
} as const;

/** HTTP status codes */
export const HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Version */
export const VERSION = '1.0.0';
