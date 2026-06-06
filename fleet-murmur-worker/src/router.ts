/**
 * router.ts — HTTP request router
 *
 * Handles all incoming HTTP traffic and routes to the appropriate
 * handler based on method + path.
 *
 * Routes:
 *   POST /api/agent/message   — Process agent message
 *   POST /api/agent/teach     — Teach a new reflex
 *   GET  /api/agent/reflexes   — List known reflexes
 *   GET  /api/health          — Health check
 *   POST /api/blackboard/webhook — Blackboard push notification
 *   GET  /api/status          — Runtime metrics
 */

import type { ReflexEngine } from './reflex-engine';
import type { VectorDB } from './vector-db';
import type { BlackboardClient } from './blackboard-client';
import type { Embedder } from './embed';
import type { Env, AgentMessage, TeachRequest } from './types';
import { HTTP } from './constants';

export class Router {
  constructor(
    private engine: ReflexEngine,
    private vectorDb: VectorDB,
    private blackboard: BlackboardClient,
    private embedder: Embedder,
    private env: Env,
  ) {}

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { ...corsHeaders, 'Allow': 'GET, POST, OPTIONS' },
      });
    }

    try {
      switch (true) {
        // ── Agent message processing ─────────────────────────
        case method === 'POST' && path === '/api/agent/message':
          return await this.handleMessage(request, corsHeaders);

        // ── Teach new reflex ────────────────────────────────
        case method === 'POST' && path === '/api/agent/teach':
          return await this.handleTeach(request, corsHeaders);

        // ── List reflexes ───────────────────────────────────
        case method === 'GET' && path === '/api/agent/reflexes':
          return await this.handleListReflexes(corsHeaders);

        // ── Health check ─────────────────────────────────────
        case method === 'GET' && path === '/api/health':
          return await this.handleHealth(corsHeaders);

        // ── Blackboard webhook ──────────────────────────────
        case method === 'POST' && path === '/api/blackboard/webhook':
          return await this.handleBlackboardWebhook(request, corsHeaders);

        // ── Metrics status ──────────────────────────────────
        case method === 'GET' && path === '/api/status':
          return await this.handleStatus(corsHeaders);

        // ── 404 fallback ────────────────────────────────────
        default:
          return new Response(
            JSON.stringify({ error: 'Not found', path, method }),
            { status: HTTP.NOT_FOUND, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: message }),
        { status: HTTP.INTERNAL_ERROR, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  /** POST /api/agent/message — Process an agent message through the reflex engine */
  private async handleMessage(request: Request, cors: Record<string, string>): Promise<Response> {
    const body = await request.json() as AgentMessage;

    if (!body?.intent) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: intent' }),
        { status: HTTP.BAD_REQUEST, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const response = await this.engine.process(body.intent, {
      agentId: body.context?.agentId ?? 'unknown',
      source: body.context?.source ?? 'webhook',
      room: body.context?.room,
      timestamp: body.context?.timestamp ?? new Date().toISOString(),
    });

    // Broadcast to blackboard (fire-and-forget)
    this.blackboard.broadcastResponse({
      ...response,
      intent: body.intent,
      sourceAgent: body.context?.agentId ?? 'unknown',
    }).catch((e) => console.error('Blackboard broadcast failed:', e));

    return new Response(JSON.stringify(response), {
      status: HTTP.OK,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  /** POST /api/agent/teach — Teach a new reflex */
  private async handleTeach(request: Request, cors: Record<string, string>): Promise<Response> {
    const body = await request.json() as TeachRequest;

    if (!body?.intent || !body?.action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: intent, action' }),
        { status: HTTP.BAD_REQUEST, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const reflex = await this.engine.teach(body.intent, body.action, body.tags);
    return new Response(JSON.stringify(reflex), {
      status: HTTP.CREATED,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  /** GET /api/agent/reflexes — List known reflexes */
  private async handleListReflexes(cors: Record<string, string>): Promise<Response> {
    const reflexes = await this.engine.listReflexes();
    return new Response(JSON.stringify({ count: reflexes.length, reflexes }), {
      status: HTTP.OK,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  /** GET /api/health — Health check endpoint */
  private async handleHealth(cors: Record<string, string>): Promise<Response> {
    const dbHealth = await this.vectorDb.health();
    const status = dbHealth.ok ? 'healthy' : 'degraded';

    return new Response(JSON.stringify({
      status,
      version: this.env.VERSION ?? '1.0.0',
      agent: this.env.AGENT_NAME ?? 'fleet-murmur-worker',
      vectorDb: {
        backend: this.env.VECTOR_DB_BACKEND ?? 'kv-fallback',
        status: dbHealth.ok ? 'connected' : 'error',
        reflexCount: dbHealth.count,
      },
      llm: {
        configured: !!this.env.DEEPINFRA_API_KEY,
        provider: this.env.DEEPINFRA_API_KEY ? 'deepinfra' : 'none',
      },
      blackboard: {
        configured: !!this.env.GITHUB_TOKEN,
        repo: this.env.BLACKBOARD_REPO ?? 'not-configured',
      },
    }), {
      status: HTTP.OK,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  /** POST /api/blackboard/webhook — Receive blackboard push notification */
  private async handleBlackboardWebhook(_request: Request, cors: Record<string, string>): Promise<Response> {
    // Placeholder for future blackboard push integration
    return new Response(JSON.stringify({ received: true }), {
      status: HTTP.OK,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  /** GET /api/status — Runtime metrics */
  private async handleStatus(cors: Record<string, string>): Promise<Response> {
    const metrics = await this.engine.getMetrics();
    return new Response(JSON.stringify(metrics), {
      status: HTTP.OK,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}
