/**
 * vector-db.ts — Vector database interface
 *
 * Abstracts access to the vector database. Supports multiple backends:
 *   - kv-fallback: Workers KV with hash-based similarity search (free tier)
 *   - external-rest: External vector DB API (pincher RPC, Pinecone, etc.)
 *   - cloudflare-vectorize: Cloudflare Vectorize index (paid plan)
 *
 * Mirrors pincher's Database with ReflexRow and vector search.
 */

import type { Env, ReflexRecord, SearchResult } from './types';
import type { Embedder } from './embed';
import {
  KV_PREFIXES,
  DEFAULT_THRESHOLDS,
  DEFAULT_CONFIDENCE,
  CACHE_TTL,
} from './constants';

/** Vector DB interface (abstract) */
export interface VectorDB {
  /** Search for reflexes matching an intent */
  search(intent: string, embedder: Embedder, limit?: number): Promise<SearchResult[]>;

  /** Insert a new reflex */
  insert(reflex: Omit<ReflexRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReflexRecord>;

  /** Update confidence score for a reflex */
  updateConfidence(reflexId: string, delta: number): Promise<void>;

  /** Delete a reflex by ID */
  delete(reflexId: string): Promise<void>;

  /** List all reflexes */
  listAll(): Promise<ReflexRecord[]>;

  /** Health check */
  health(): Promise<{ ok: boolean; count: number; backend: string }>;
}

/** Create the appropriate VectorDB based on env config */
export function createVectorDB(env: Env, _embedder: Embedder): VectorDB {
  switch (env.VECTOR_DB_BACKEND) {
    case 'external-rest':
      return new ExternalRestVectorDB(env);
    case 'cloudflare-vectorize':
      return new CloudflareVectorizeDB(env);
    case 'kv-fallback':
    default:
      return new KVFallbackVectorDB(env);
  }
}

// ══════════════════════════════════════════════════════════════
// KV Fallback Backend (Free Tier)
// ══════════════════════════════════════════════════════════════

class KVFallbackVectorDB implements VectorDB {
  constructor(private env: Env) {}

  async search(intent: string, embedder: Embedder, limit: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await embedder.embed(intent);

    // List all reflexes from KV
    const reflexList = await this.listAll();
    if (reflexList.length === 0) return [];

    // Compute similarity for each
    const scored: SearchResult[] = reflexList
      .map((reflex) => ({
        reflex,
        score: embedder.cosineSimilarity(queryEmbedding, reflex.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async insert(data: Omit<ReflexRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReflexRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const reflex: ReflexRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      confidence: data.confidence ?? DEFAULT_CONFIDENCE,
    };

    await this.env.REFLEX_STORE.put(
      KV_PREFIXES.reflex + id,
      JSON.stringify(reflex),
      { expirationTtl: CACHE_TTL.reflex },
    );

    return reflex;
  }

  async updateConfidence(reflexId: string, delta: number): Promise<void> {
    const raw = await this.env.REFLEX_STORE.get(KV_PREFIXES.reflex + reflexId);
    if (!raw) return;

    const reflex = JSON.parse(raw) as ReflexRecord;
    reflex.confidence = Math.min(1.0, Math.max(0.0, reflex.confidence * delta));
    reflex.updatedAt = new Date().toISOString();
    reflex.invokeCount++;

    await this.env.REFLEX_STORE.put(KV_PREFIXES.reflex + reflexId, JSON.stringify(reflex));
  }

  async delete(reflexId: string): Promise<void> {
    await this.env.REFLEX_STORE.delete(KV_PREFIXES.reflex + reflexId);
  }

  async listAll(): Promise<ReflexRecord[]> {
    const list = await this.env.REFLEX_STORE.list({ prefix: KV_PREFIXES.reflex });
    const reflexes: ReflexRecord[] = [];

    for (const key of list.keys) {
      const raw = await this.env.REFLEX_STORE.get(key.name);
      if (raw) {
        reflexes.push(JSON.parse(raw));
      }
    }

    return reflexes;
  }

  async health(): Promise<{ ok: boolean; count: number; backend: string }> {
    try {
      const list = await this.env.REFLEX_STORE.list({ prefix: KV_PREFIXES.reflex, limit: 1 });
      return { ok: true, count: list.keys.length, backend: 'kv-fallback' };
    } catch {
      return { ok: false, count: 0, backend: 'kv-fallback' };
    }
  }
}

// ══════════════════════════════════════════════════════════════
// External REST API Backend (pincher RPC, Pinecone, Supabase)
// ══════════════════════════════════════════════════════════════

class ExternalRestVectorDB implements VectorDB {
  constructor(private env: Env) {}

  private get apiUrl(): string {
    return this.env.VECTOR_DB_API ?? 'http://localhost:8080';
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.env.VECTOR_DB_KEY) {
      h['Authorization'] = `Bearer ${this.env.VECTOR_DB_KEY}`;
    }
    return h;
  }

  async search(intent: string, embedder: Embedder, limit: number = 5): Promise<SearchResult[]> {
    const embedding = await embedder.embed(intent);
    const response = await fetch(`${this.apiUrl}/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ vector: embedding, topK: limit, namespace: 'fleet-reflexes' }),
    });

    if (!response.ok) {
      throw new Error(`Vector DB search failed: ${response.status}`);
    }

    const data = await response.json() as { results: SearchResult[] };
    return data.results;
  }

  async insert(data: Omit<ReflexRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReflexRecord> {
    const response = await fetch(`${this.apiUrl}/insert`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Vector DB insert failed: ${response.status}`);
    }

    return await response.json() as ReflexRecord;
  }

  async updateConfidence(reflexId: string, delta: number): Promise<void> {
    await fetch(`${this.apiUrl}/confidence`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ reflexId, delta }),
    });
  }

  async delete(reflexId: string): Promise<void> {
    await fetch(`${this.apiUrl}/reflex/${reflexId}`, { method: 'DELETE', headers: this.headers });
  }

  async listAll(): Promise<ReflexRecord[]> {
    const response = await fetch(`${this.apiUrl}/reflexes`, { headers: this.headers });
    return await response.json() as ReflexRecord[];
  }

  async health(): Promise<{ ok: boolean; count: number; backend: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, { headers: this.headers });
      const data = await response.json() as { status: string; count: number };
      return { ok: data.status === 'ok', count: data.count ?? 0, backend: 'external-rest' };
    } catch {
      return { ok: false, count: 0, backend: 'external-rest' };
    }
  }
}

// ══════════════════════════════════════════════════════════════
// Cloudflare Vectorize (Paid Plan)
// ══════════════════════════════════════════════════════════════

class CloudflareVectorizeDB implements VectorDB {
  constructor(private env: Env) {}

  async search(intent: string, embedder: Embedder, limit: number = 5): Promise<SearchResult[]> {
    const embedding = await embedder.embed(intent);
    const index = (this.env as any).VECTORIZE_INDEX;

    if (!index) {
      throw new Error('Vectorize index binding not configured');
    }

    const results = await index.query(embedding, { topK: limit, returnMetadata: true });

    return results.matches.map((m: any) => ({
      reflex: m.metadata as ReflexRecord,
      score: m.score,
    }));
  }

  async insert(data: Omit<ReflexRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReflexRecord> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const reflex: ReflexRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      confidence: data.confidence ?? DEFAULT_CONFIDENCE,
    };

    const index = (this.env as any).VECTORIZE_INDEX;
    await index.insert([{ id, values: reflex.embedding, metadata: reflex }]);

    return reflex;
  }

  async updateConfidence(_reflexId: string, _delta: number): Promise<void> {
    // Vectorize doesn't support partial updates; need to re-insert
    console.warn('updateConfidence not implemented for Cloudflare Vectorize');
  }

  async delete(reflexId: string): Promise<void> {
    const index = (this.env as any).VECTORIZE_INDEX;
    await index.deleteByIds([reflexId]);
  }

  async listAll(): Promise<ReflexRecord[]> {
    // Vectorize doesn't have a direct list; this is a limitation
    console.warn('listAll not fully implemented for Cloudflare Vectorize — use KV for reflex list');
    return [];
  }

  async health(): Promise<{ ok: boolean; count: number; backend: string }> {
    const index = (this.env as any).VECTORIZE_INDEX;
    try {
      const info = await index.describe();
      return { ok: true, count: info.totalVectorCount, backend: 'cloudflare-vectorize' };
    } catch {
      return { ok: false, count: 0, backend: 'cloudflare-vectorize' };
    }
  }
}
