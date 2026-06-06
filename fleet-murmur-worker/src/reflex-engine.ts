/**
 * reflex-engine.ts — Fast Path / Slow Path routing logic
 *
 * The heart of the Fleet Murmur agent runtime. Reimplements pincher's
 * Teach → Match → Execute for the Cloudflare Workers runtime.
 *
 * Decision flow:
 *   Receive intent → Embed → Vector search → Classify match →
 *     [≥0.80] → Fast path: return known response
 *     [0.55-0.80] → Similar path: confirm with LLM, execute
 *     [<0.55] → Slow path: full LLM reasoning, store as new reflex
 */

import type { VectorDB } from './vector-db';
import type { Embedder } from './embed';
import type { VetoEngine } from './veto-engine';
import type {
  AgentContext,
  AgentResponse,
  ReflexRecord,
  MatchThresholds,
  RuntimeMetrics,
} from './types';
import {
  DEFAULT_THRESHOLDS,
  CONFIDENCE_BOOST_FAST,
  CONFIDENCE_BOOST_SLOW,
  CONFIDENCE_PENALTY,
  CONFIDENCE_VETO_PENALTY,
  DEFAULT_CONFIDENCE,
  CACHE_TTL,
  KV_PREFIXES,
} from './constants';
import type { Env } from './types';

/** Match result after vector search */
interface MatchResult {
  matchType: 'exact' | 'similar' | 'novel';
  reflex?: ReflexRecord;
  score: number;
}

export class ReflexEngine {
  private thresholds: MatchThresholds;
  private metricsInternal: RuntimeMetrics;

  constructor(
    private vectorDb: VectorDB,
    private embedder: Embedder,
    private veto: VetoEngine,
    private env: Env,
  ) {
    this.thresholds = { exact: DEFAULT_THRESHOLDS.exact, similar: DEFAULT_THRESHOLDS.similar };
    this.metricsInternal = this.createEmptyMetrics();
  }

  /**
   * Process an intent through the reflex engine.
   * This is the main entry point — mirrors pincher's ReflexEngine::do_intent().
   */
  async process(intent: string, context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.metricsInternal.totalRequests++;

    // 1. Check cache for recent identical intent
    const cached = await this.checkCache(intent);
    if (cached) {
      return cached;
    }

    // 2. Find best match in vector DB
    const match = await this.findMatch(intent);

    // 3. Route based on match type
    if (match.matchType === 'exact' && match.reflex) {
      // FAST PATH — known reflex, high confidence
      const response = await this.handleExactMatch(intent, match.reflex, context, startTime);
      await this.cacheResponse(intent, response);
      return response;
    }

    if (match.matchType === 'similar' && match.reflex) {
      // SIMILAR PATH — close match, needs confirmation
      const response = await this.handleSimilarMatch(intent, match.reflex, context, startTime);
      await this.cacheResponse(intent, response);
      return response;
    }

    // SLOW PATH — novel intent, needs full LLM reasoning
    const response = await this.handleNovelMatch(intent, context, startTime);
    await this.cacheResponse(intent, response);

    return response;
  }

  /** Teach a new reflex — stores intent + action pair in vector DB */
  async teach(intent: string, action: string, tags?: string[], initialConfidence?: number): Promise<ReflexRecord> {
    const embedding = await this.embedder.embed(intent);
    return this.vectorDb.insert({
      intent,
      action,
      embedding,
      confidence: initialConfidence ?? DEFAULT_CONFIDENCE,
      invokeCount: 0,
      tags: tags ?? [],
      source: this.env.AGENT_NAME ?? 'fleet-murmur-worker',
    });
  }

  /** List all known reflexes */
  async listReflexes(): Promise<ReflexRecord[]> {
    return this.vectorDb.listAll();
  }

  /** Get runtime metrics */
  async getMetrics(): Promise<RuntimeMetrics> {
    const reflexes = await this.vectorDb.listAll();
    this.metricsInternal.reflexesStored = reflexes.length;
    return { ...this.metricsInternal };
  }

  // ── Private Helpers ──────────────────────────────────────

  /** Find the best match for an intent in the vector DB */
  private async findMatch(intent: string): Promise<MatchResult> {
    const results = await this.vectorDb.search(intent, this.embedder, 3);

    if (results.length === 0) {
      return { matchType: 'novel', score: 0 };
    }

    const best = results[0];

    if (best.score >= this.thresholds.exact) {
      return { matchType: 'exact', reflex: best.reflex, score: best.score };
    }

    if (best.score >= this.thresholds.similar) {
      return { matchType: 'similar', reflex: best.reflex, score: best.score };
    }

    return { matchType: 'novel', reflex: best.reflex, score: best.score };
  }

  /** Handle an exact match (confidence ≥ 0.80) */
  private async handleExactMatch(
    intent: string,
    reflex: ReflexRecord,
    context: AgentContext,
    startTime: number,
  ): Promise<AgentResponse> {
    const duration = Date.now() - startTime;
    this.metricsInternal.fastPathCount++;
    this.metricsInternal.avgFastPathMs = (this.metricsInternal.avgFastPathMs * (this.metricsInternal.fastPathCount - 1) + duration) / this.metricsInternal.fastPathCount;

    // Veto check
    const vetoResult = this.veto.check(reflex.action);
    if (!vetoResult.allow) {
      this.metricsInternal.errors.vetoBlocked++;
      return {
        id: crypto.randomUUID(),
        status: 'blocked',
        path: 'fast',
        confidence: reflex.confidence,
        response: `Action blocked by veto: ${vetoResult.reason}`,
        reflexId: reflex.id,
        durationMs: duration,
      };
    }

    // Boost confidence for successful fast-path match
    await this.vectorDb.updateConfidence(reflex.id, CONFIDENCE_BOOST_FAST);

    return {
      id: crypto.randomUUID(),
      status: 'completed',
      path: 'fast',
      confidence: reflex.confidence,
      response: reflex.action,
      action: reflex.action,
      reflexId: reflex.id,
      durationMs: duration,
    };
  }

  /** Handle a similar match (0.55 ≤ confidence < 0.80) */
  private async handleSimilarMatch(
    intent: string,
    reflex: ReflexRecord,
    context: AgentContext,
    startTime: number,
  ): Promise<AgentResponse> {
    // Call LLM for confirmation and possible adaptation
    const llmResponse = await this.callLLM(
      `The user asked: "${intent}".
       The closest known reflex matches: "${reflex.intent}" (confidence: ${reflex.confidence}).
       The known action is: "${reflex.action}".
       Please confirm if this action is appropriate, or provide an adapted response.`,
      context,
    );

    const duration = Date.now() - startTime;

    if (llmResponse.isConfirmation) {
      // LLM confirmed — boost confidence, proceed with known action
      await this.vectorDb.updateConfidence(reflex.id, CONFIDENCE_BOOST_SLOW);

      this.metricsInternal.fastPathCount++;
      return {
        id: crypto.randomUUID(),
        status: 'completed',
        path: 'similar',
        confidence: reflex.confidence,
        response: reflex.action,
        action: reflex.action,
        reflexId: reflex.id,
        durationMs: duration,
      };
    }

    // LLM adapted the response — store as new reflex for this phrasing
    const newReflex = await this.teach(intent, llmResponse.text, ['similar-adapted']);

    this.metricsInternal.slowPathCount++;
    this.metricsInternal.avgSlowPathMs = (this.metricsInternal.avgSlowPathMs * (this.metricsInternal.slowPathCount - 1) + duration) / this.metricsInternal.slowPathCount;

    return {
      id: crypto.randomUUID(),
      status: 'completed',
      path: 'similar',
      confidence: reflex.confidence,
      response: llmResponse.text,
      action: llmResponse.text,
      reflexId: newReflex.id,
      durationMs: duration,
    };
  }

  /** Handle a novel match (confidence < 0.55) — full LLM reasoning */
  private async handleNovelMatch(
    intent: string,
    context: AgentContext,
    startTime: number,
  ): Promise<AgentResponse> {
    this.metricsInternal.slowPathCount++;

    // Call DeepInfra for full reasoning
    const llmResponse = await this.callLLM(
      `You are the fleet-murmur-worker, a serverless agent in the Ternary Fleet.
       An agent in room "${context.room ?? 'unknown'}" asked: "${intent}"
       Please respond with a helpful action or information.
       Format your response as a concise, actionable answer.`,
      context,
    );

    const duration = Date.now() - startTime;
    this.metricsInternal.avgSlowPathMs = (this.metricsInternal.avgSlowPathMs * (this.metricsInternal.slowPathCount - 1) + duration) / this.metricsInternal.slowPathCount;

    // Store the new intent-action pair as a reflex
    try {
      const newReflex = await this.teach(intent, llmResponse.text, ['auto-learned']);
      this.metricsInternal.reflexesStored++;

      return {
        id: crypto.randomUUID(),
        status: 'completed',
        path: 'slow',
        confidence: 0, // No confidence for novel matches
        response: llmResponse.text,
        action: llmResponse.text,
        reflexId: newReflex.id,
        durationMs: duration,
      };
    } catch (err) {
      // LLM succeeded but storing the reflex failed; still return the response
      this.metricsInternal.errors.llmFailed++;
      return {
        id: crypto.randomUUID(),
        status: 'error',
        path: 'slow',
        confidence: 0,
        response: llmResponse.text,
        durationMs: duration,
        error: 'Failed to store reflex',
      };
    }
  }

  /** Call DeepInfra LLM API */
  private async callLLM(
    prompt: string,
    _context: AgentContext,
  ): Promise<{ text: string; isConfirmation: boolean }> {
    if (!this.env.DEEPINFRA_API_KEY) {
      return {
        text: `No LLM configured. Intent received but cannot process. Please set DEEPINFRA_API_KEY.`,
        isConfirmation: false,
      };
    }

    try {
      const response = await fetch(
        this.env.DEEPINFRA_API_URL ? `${this.env.DEEPINFRA_API_URL}/chat/completions` : 'https://api.deepinfra.com/v1/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.DEEPINFRA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V4-Flash',
            messages: [
              {
                role: 'system',
                content: 'You are fleet-murmur-worker, a serverless reflex agent. Respond concisely and actionably.',
              },
              { role: 'user', content: prompt },
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        },
      );

      if (!response.ok) {
        this.metricsInternal.errors.llmFailed++;
        return {
          text: `LLM API error: ${response.status}. Intent queued for later processing.`,
          isConfirmation: false,
        };
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content ?? 'No response';
      const isConfirmation = text.toLowerCase().includes('yes') || text.toLowerCase().includes('confirm');

      return { text, isConfirmation };
    } catch (err) {
      this.metricsInternal.errors.llmFailed++;
      return {
        text: `LLM call failed: ${err instanceof Error ? err.message : 'Unknown error'}. Using fallback response.`,
        isConfirmation: false,
      };
    }
  }

  /** Check KV cache for a cached response */
  private async checkCache(intent: string): Promise<AgentResponse | null> {
    const hash = await this.simpleHash(intent);
    const cached = await this.env.CACHE.get(`${KV_PREFIXES.cache}${hash}`);
    if (cached) {
      return JSON.parse(cached) as AgentResponse;
    }
    return null;
  }

  /** Cache a response in KV */
  private async cacheResponse(intent: string, response: AgentResponse): Promise<void> {
    const hash = await this.simpleHash(intent);
    const ttl = response.path === 'fast' ? CACHE_TTL.fastPath : CACHE_TTL.slowPath;
    await this.env.CACHE.put(
      `${KV_PREFIXES.cache}${hash}`,
      JSON.stringify(response),
      { expirationTtl: ttl },
    );
  }

  /** Simple string hash for cache keys */
  private async simpleHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  /** Create initial (empty) metrics state */
  private createEmptyMetrics(): RuntimeMetrics {
    return {
      totalRequests: 0,
      fastPathCount: 0,
      slowPathCount: 0,
      fastPathPct: 0,
      avgResponseMs: 0,
      avgFastPathMs: 0,
      avgSlowPathMs: 0,
      reflexesStored: 0,
      agentsRegistered: 0,
      blackboardBroadcasts: 0,
      errors: { vetoBlocked: 0, llmFailed: 0, blackboardFailed: 0 },
    };
  }
}
