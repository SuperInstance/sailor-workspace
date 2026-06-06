/**
 * agent-coordination.ts — Durable Object for Agent Coordination
 *
 * Provides stateful coordination that survives individual Worker requests.
 * Used for:
 *   - Agent registry (who's alive, what they subscribe to)
 *   - Reflex confidence tracking (atomic updates)
 *   - Subscription routing (which agents get which broadcasts)
 *   - Metrics aggregation across requests
 *
 * Uses Durable Objects' single-writer guarantee for consistency.
 * Free tier: 1M requests/month, 1GB storage.
 */

import type { RuntimeMetrics } from './types';

/** Agent metadata */
interface AgentInfo {
  agentId: string;
  role: string;
  status: 'active' | 'idle' | 'offline';
  lastSeen: string;
  subscriptions: string[];
  rooms?: string[];
}

/** Execution record */
interface ExecutionRecord {
  reflexId: string;
  path: 'fast' | 'similar' | 'slow';
  durationMs: number;
  timestamp: string;
}

/** Reflex statistics */
interface ReflexStats {
  totalInvokes: number;
  fastPathCount: number;
  slowPathCount: number;
  avgDurationMs: number;
  lastInvoked: string;
}

export class AgentCoordination {
  private state: DurableObjectState;
  private storage: DurableObjectStorage;

  // In-memory caches for hot data
  private agents: Map<string, AgentInfo> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // channel → agent IDs
  private reflexStats: Map<string, ReflexStats> = new Map();
  private messageQueue: any[] = [];
  private executionHistory: ExecutionRecord[] = [];
  private alarmScheduled: boolean = false;

  // Metrics accumulators
  private totalRequests = 0;
  private fastPathCount = 0;
  private slowPathCount = 0;
  private totalDurationMs = 0;
  private vetoBlockedCount = 0;
  private llmFailedCount = 0;
  private blackboardFailedCount = 0;

  constructor(state: DurableObjectState, _env: any) {
    this.state = state;
    this.storage = state.storage;

    // Restore state from storage on wake
    state.blockConcurrencyWhile(async () => {
      const savedAgentCount = await this.storage.get<number>('agentCount');
      if (savedAgentCount !== undefined) {
        // Could restore more state here from storage
      }
    });
  }

  // ── Agent Registry ───────────────────────────────────────

  /** Register an agent in the fleet */
  async registerAgent(info: Omit<AgentInfo, 'status'>): Promise<void> {
    this.agents.set(info.agentId, {
      ...info,
      status: 'active',
    });

    await this.storage.put(`agent:${info.agentId}`, info);
    await this.storage.put('agentCount', this.agents.size);

    this.scheduleHealthCheck();
  }

  /** Get info for a specific agent */
  async getAgent(agentId: string): Promise<AgentInfo | null> {
    return this.agents.get(agentId) ?? null;
  }

  /** List all registered agents */
  async listAgents(): Promise<AgentInfo[]> {
    return Array.from(this.agents.values());
  }

  /** Mark an agent as offline */
  async markOffline(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      agent.lastSeen = new Date().toISOString();
    }
  }

  // ── Subscription Management ──────────────────────────────

  /** Subscribe an agent to a channel */
  async subscribe(agentId: string, channel: string): Promise<void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(agentId);

    // Persist subscription
    const key = `sub:${channel}`;
    const existing = await this.storage.get<string[]>(key) ?? [];
    if (!existing.includes(agentId)) {
      existing.push(agentId);
      await this.storage.put(key, existing);
    }
  }

  /** Unsubscribe an agent from a channel */
  async unsubscribe(agentId: string, channel: string): Promise<void> {
    this.subscriptions.get(channel)?.delete(agentId);
    const key = `sub:${channel}`;
    const existing = await this.storage.get<string[]>(key) ?? [];
    await this.storage.put(key, existing.filter((id) => id !== agentId));
  }

  /** Get all subscribers for a channel */
  async getSubscribers(channel: string): Promise<string[]> {
    return Array.from(this.subscriptions.get(channel) ?? []);
  }

  /** Get all channels an agent subscribes to */
  async getAgentChannels(agentId: string): Promise<string[]> {
    const channels: string[] = [];
    for (const [channel, agents] of this.subscriptions) {
      if (agents.has(agentId)) {
        channels.push(channel);
      }
    }
    return channels;
  }

  // ── Execution Tracking ───────────────────────────────────

  /** Record a reflex execution */
  async recordExecution(reflexId: string, path: 'fast' | 'similar' | 'slow', durationMs: number): Promise<void> {
    this.totalRequests++;
    this.totalDurationMs += durationMs;

    if (path === 'fast' || path === 'similar') {
      this.fastPathCount++;
    } else {
      this.slowPathCount++;
    }

    // Update reflex stats
    const stats = this.reflexStats.get(reflexId) ?? {
      totalInvokes: 0,
      fastPathCount: 0,
      slowPathCount: 0,
      avgDurationMs: 0,
      lastInvoked: '',
    };

    stats.totalInvokes++;
    if (path === 'fast' || path === 'similar') stats.fastPathCount++;
    else stats.slowPathCount++;
    stats.avgDurationMs = (stats.avgDurationMs * (stats.totalInvokes - 1) + durationMs) / stats.totalInvokes;
    stats.lastInvoked = new Date().toISOString();

    this.reflexStats.set(reflexId, stats);

    // Keep execution history bounded
    this.executionHistory.push({ reflexId, path, durationMs, timestamp: new Date().toISOString() });
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }

    // Persist periodically
    await this.storage.put(`reflex-stats:${reflexId}`, stats);
  }

  /** Record a veto block */
  async recordVetoBlock(): Promise<void> {
    this.vetoBlockedCount++;
  }

  /** Record an LLM failure */
  async recordLlmFailure(): Promise<void> {
    this.llmFailedCount++;
  }

  /** Record a blackboard failure */
  async recordBlackboardFailure(): Promise<void> {
    this.blackboardFailedCount++;
  }

  // ── Metrics ──────────────────────────────────────────────

  /** Get aggregated runtime metrics */
  async getMetrics(): Promise<RuntimeMetrics> {
    const total = this.totalRequests || 1;
    return {
      totalRequests: this.totalRequests,
      fastPathCount: this.fastPathCount,
      slowPathCount: this.slowPathCount,
      fastPathPct: this.fastPathCount / total,
      avgResponseMs: this.totalRequests > 0 ? this.totalDurationMs / this.totalRequests : 0,
      avgFastPathMs: this.fastPathCount > 0 ? this.totalDurationMs / this.fastPathCount : 0,
      avgSlowPathMs: this.slowPathCount > 0 ? this.totalDurationMs / this.slowPathCount : 0,
      reflexesStored: this.reflexStats.size,
      agentsRegistered: this.agents.size,
      blackboardBroadcasts: this.totalRequests,
      errors: {
        vetoBlocked: this.vetoBlockedCount,
        llmFailed: this.llmFailedCount,
        blackboardFailed: this.blackboardFailedCount,
      },
    };
  }

  /** Alert: schedule a periodic health check */
  private scheduleHealthCheck(): void {
    if (!this.alarmScheduled) {
      this.alarmScheduled = true;
      this.state.storage.setAlarm(Date.now() + 300_000); // 5 minutes
    }
  }

  /** DO Alarm handler — periodic maintenance */
  async alarm(): Promise<void> {
    this.alarmScheduled = false;

    // Prune stale agents (offline > 24h)
    const now = Date.now();
    for (const [agentId, agent] of this.agents) {
      if (agent.status === 'offline') {
        const lastSeen = new Date(agent.lastSeen).getTime();
        if (now - lastSeen > 24 * 60 * 60 * 1000) {
          this.agents.delete(agentId);
          await this.storage.delete(`agent:${agentId}`);
        }
      }
    }

    // Schedule next check
    this.scheduleHealthCheck();
  }
}
