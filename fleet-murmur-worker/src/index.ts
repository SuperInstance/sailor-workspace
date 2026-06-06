/**
 * index.ts — Fleet Murmur Worker entry point
 *
 * Cloudflare Workers fetch handler that routes incoming requests
 * through the Fleet Murmur agent runtime.
 *
 * Architecture:
 *   fetch() → router.ts → handler → reflex-engine.ts → vector-db.ts
 *                                                         ↓
 *                                          blackboard-client.ts → GitHub
 */

import { Router } from './router';
import { ReflexEngine } from './reflex-engine';
import { createVectorDB } from './vector-db';
import { BlackboardClient } from './blackboard-client';
import { VetoEngine } from './veto-engine';
import { AgentCoordination } from './agent-coordination';
import { Embedder } from './embed';
import type { Env } from './types';
import { VERSION } from './constants';

export { AgentCoordination };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize core components
      const embedder = new Embedder(env);
      const vectorDb = createVectorDB(env, embedder);
      const veto = new VetoEngine();
      const blackboard = new BlackboardClient(env);
      const engine = new ReflexEngine(vectorDb, embedder, veto, env);
      const router = new Router(engine, vectorDb, blackboard, embedder, env);

      // Route and handle
      return await router.handle(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: message, version: VERSION }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  },

  /** Cron trigger handler for scheduled tasks */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const embedder = new Embedder(env);
    const vectorDb = createVectorDB(env, embedder);
    const veto = new VetoEngine();
    const blackboard = new BlackboardClient(env);
    const engine = new ReflexEngine(vectorDb, embedder, veto, env);

    switch (event.cron) {
      case '*/5 * * * *':
        // Broadcast health status to blackboard every 5 minutes
        const health = await engine.getMetrics();
        await blackboard.broadcastStatus({
          uptime: process.uptime(),
          requestsProcessed: health.totalRequests,
          fastPathPct: health.fastPathPct,
          avgResponseMs: health.avgResponseMs,
          reflexesStored: health.reflexesStored,
          agentsRegistered: health.agentsRegistered,
        });
        break;

      case '0 * * * *':
        // Broadcast detailed metrics every hour
        await blackboard.broadcastMetrics(await engine.getMetrics());
        break;

      case '0 3 * * *':
        // Nightly sync and maintenance
        await blackboard.syncIndex();
        break;
    }
  },
};
