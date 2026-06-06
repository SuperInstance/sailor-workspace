/**
 * blackboard-client.ts — Publishing to construct-coordination
 *
 * Publishes agent responses and status to the Fleet Blackboard
 * in construct-coordination/notes/blackboard/ via the GitHub API.
 *
 * Blackboard spec: workspace/docs/BLACKBOARD-SPEC.md
 */

import type { Env, AgentResponse, RuntimeMetrics, BlackboardPodcast } from './types';
import { BB_CHANNELS } from './constants';

/** GitHub API base URL */
const GH_API = 'https://api.github.com';

export class BlackboardClient {
  constructor(private env: Env) {}

  /** Broadcast an agent response as a blackboard podcast */
  async broadcastResponse(response: AgentResponse & { intent: string; sourceAgent: string }): Promise<void> {
    if (!this.env.GITHUB_TOKEN) return; // Blackboard not configured

    const podcast = this.formatPodcast(response);
    const content = this.renderPodcastMarkdown(podcast);
    const datePath = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const sequence = await this.nextSequence(BB_CHANNELS.responses, datePath);
    const filename = `${String(sequence).padStart(3, '0')}.md`;
    const filePath = `notes/blackboard/${BB_CHANNELS.responses}/${datePath}/${filename}`;

    try {
      await this.commitFile(filePath, content, `blackboard: ${BB_CHANNELS.responses} [${filename}]`);
      this.env.CACHE.put(`sequence:${BB_CHANNELS.responses}:${datePath}`, String(sequence));
    } catch (err) {
      console.error('Blackboard commit failed:', err);
    }
  }

  /** Broadcast health/status to blackboard */
  async broadcastStatus(status: {
    uptime: number;
    requestsProcessed: number;
    fastPathPct: number;
    avgResponseMs: number;
    reflexesStored: number;
    agentsRegistered: number;
  }): Promise<void> {
    if (!this.env.GITHUB_TOKEN) return;

    const datePath = new Date().toISOString().slice(0, 10);
    const sequence = await this.nextSequence(BB_CHANNELS.status, datePath);
    const filename = `${String(sequence).padStart(3, '0')}.md`;
    const filePath = `notes/blackboard/${BB_CHANNELS.status}/${datePath}/${filename}`;

    const content = `---
podcast_id: "${datePath}/${filename.replace('.md', '')}"
channel: "${BB_CHANNELS.status}"
agent: "${this.env.AGENT_NAME ?? 'fleet-murmur-worker'}"
variant: "heartbeat"
sequence: ${sequence}
created: "${new Date().toISOString()}"
tags: ["heartbeat", "status"]
---

# PODCAST: ${datePath}/${String(sequence).padStart(3, '0')}

## Source
- **Agent**: ${this.env.AGENT_NAME ?? 'fleet-murmur-worker'}
- **Channel**: ${BB_CHANNELS.status}
- **Sequence**: ${sequence}
- **Variant**: heartbeat

## Content
- Uptime: ${Math.floor(status.uptime)}s
- Requests processed: ${status.requestsProcessed}
- Fast path: ${(status.fastPathPct * 100).toFixed(1)}%
- Avg response: ${status.avgResponseMs.toFixed(1)}ms
- Reflexes stored: ${status.reflexesStored}
- Agents registered: ${status.agentsRegistered}
`;

    try {
      await this.commitFile(filePath, content, `blackboard: ${BB_CHANNELS.status} [${filename}]`);
    } catch (_err) {
      // Status broadcasts are non-critical
    }
  }

  /** Broadcast detailed metrics */
  async broadcastMetrics(metrics: RuntimeMetrics): Promise<void> {
    // Placeholder for hourly detailed metrics broadcast
    // Would include error counts, performance trends, etc.
  }

  /** Sync the blackboard index file */
  async syncIndex(): Promise<void> {
    if (!this.env.GITHUB_TOKEN) return;

    // Placeholder: would rebuild _index.json from latest podcasts
    const indexContent = JSON.stringify({
      format: 1,
      built: new Date().toISOString(),
      agent: this.env.AGENT_NAME ?? 'fleet-murmur-worker',
      notes: 'Index rebuild placeholder — implement full scan in production',
    }, null, 2);

    try {
      await this.commitFile(
        'notes/blackboard/_index.json',
        indexContent,
        'blackboard: sync index',
      );
    } catch (_err) {
      // Non-critical
    }
  }

  // ── Private Helpers ──────────────────────────────────────

  /** Format a podcast from a response */
  private formatPodcast(response: AgentResponse & { intent: string; sourceAgent: string }): BlackboardPodcast {
    return {
      podcastId: '',
      channel: BB_CHANNELS.responses,
      agent: this.env.AGENT_NAME ?? 'fleet-murmur-worker',
      variant: 'standard',
      sequence: 0, // Will be filled in
      created: new Date().toISOString(),
      path: response.path,
      confidence: response.confidence,
      durationMs: response.durationMs,
      reflexId: response.reflexId,
      intent: response.intent,
      response: response.response,
      sourceAgent: response.sourceAgent,
      tags: ['agent-response', response.path, this.env.AGENT_NAME ?? 'fleet-murmur-worker'],
    };
  }

  /** Render a podcast as markdown with YAML frontmatter */
  private renderPodcastMarkdown(podcast: BlackboardPodcast): string {
    const dateStr = new Date().toISOString().split('T')[0];
    const seq = String(podcast.sequence).padStart(3, '0');
    const podcastId = `${dateStr}/${seq}`;

    return `---
podcast_id: "${podcastId}"
channel: "${podcast.channel}"
agent: "${podcast.agent}"
variant: "${podcast.variant}"
sequence: ${podcast.sequence}
created: "${podcast.created}"
path: "${podcast.path}"
confidence: ${podcast.confidence}
duration_ms: ${podcast.durationMs}
reflex_id: "${podcast.reflexId ?? ''}"
intent: "${podcast.intent}"
source_agent: "${podcast.sourceAgent}"
tags: ["${podcast.tags.join('", "')}"]
status: completed
---

# PODCAST: ${podcastId}

## Source
- **Agent**: ${podcast.agent}
- **Channel**: ${podcast.channel}
- **Sequence**: ${podcast.sequence}
- **Variant**: ${podcast.variant}

## Content
- ${podcast.path === 'fast' ? '⚡ Fast path reflex match' : '🧠 LLM slow path reasoning'}
- Intent: "${podcast.intent}"
- Response: ${podcast.response}

## Performance
- **Path**: ${podcast.path}
- **Confidence**: ${(podcast.confidence * 100).toFixed(1)}%
- **Duration**: ${podcast.durationMs}ms
- **Reflex ID**: ${podcast.reflexId ?? 'new'}
- **Source Agent**: ${podcast.sourceAgent}
`;
  }

  /** Get next sequence number for a channel+date */
  private async nextSequence(channel: string, datePath: string): Promise<number> {
    const cacheKey = `sequence:${channel}:${datePath}`;
    const cached = await this.env.CACHE.get(cacheKey);
    if (cached) {
      return parseInt(cached, 10) + 1;
    }
    return 1;
  }

  /** Commit a file to construct-coordination via GitHub API */
  private async commitFile(filePath: string, content: string, message: string): Promise<void> {
    const repo = this.env.BLACKBOARD_REPO ?? 'SuperInstance/construct-coordination';
    const branch = this.env.BLACKBOARD_BRANCH ?? 'main';

    // 1. Get current file SHA (if exists) for update
    const getUrl = `${GH_API}/repos/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'fleet-murmur-worker',
      },
    });

    let sha: string | undefined;
    if (getResponse.ok) {
      const existing = await getResponse.json() as any;
      sha = existing.sha;
    }

    // 2. Create or update the file
    const encodedContent = btoa(content);
    const putUrl = `${GH_API}/repos/${repo}/contents/${encodeURIComponent(filePath)}`;

    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'fleet-murmur-worker',
      },
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch,
        sha, // undefined for new files
      }),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`GitHub API error (${putResponse.status}): ${errorText}`);
    }
  }
}
