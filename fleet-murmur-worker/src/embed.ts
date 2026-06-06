/**
 * embed.ts — Text embedding service
 *
 * Converts text intents to vector embeddings for similarity search.
 * Supports multiple backends, mirroring pincher's embed module.
 *
 * Backends:
 *   - hash-fallback: Lightweight djb2-based hash embedding (free, no deps)
 *   - deepinfra: Calls DeepInfra embedding API (good quality, low cost)
 *   - cloudflare-ai: Uses Workers AI (paid plan, best quality)
 */

import type { Env } from './types';

/** Hash-based pseudo-embedding using djb2 + bit mixing */
function hashEmbed(text: string, dimensions: number = 16): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vec: number[] = new Array(dimensions).fill(0);

  for (const word of words) {
    let h = 5381;
    for (let i = 0; i < word.length; i++) {
      h = ((h << 5) + h) ^ word.charCodeAt(i);
    }
    // Mix into all dimensions
    for (let d = 0; d < dimensions; d++) {
      vec[d] += Math.sin(h * (d + 1)) * 10000;
    }
  }

  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= mag;
    }
  }

  return vec;
}

/** DeepInfra embedding API call */
async function deepinfraEmbed(text: string, apiKey: string, apiUrl: string): Promise<number[]> {
  const response = await fetch(`${apiUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'BAAI/bge-base-en-v1.5',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

/** Cloudflare Workers AI embedding (requires paid plan + Workers AI binding) */
async function cfaiEmbed(text: string, env: Env): Promise<number[]> {
  const ai = (env as any).AI;
  if (!ai) {
    throw new Error('Workers AI binding not configured');
  }

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', { text });
  return result.data[0];
}

export class Embedder {
  constructor(private env: Env) {}

  /**
   * Embed text into a vector.
   * Returns a 16-dim vector for hash fallback, 384/768-dim for real embeddings.
   */
  async embed(text: string): Promise<number[]> {
    switch (this.env.EMBEDDING_SERVICE) {
      case 'deepinfra':
        if (!this.env.DEEPINFRA_API_KEY) {
          console.warn('DeepInfra embedding requested but no API key; falling back to hash');
          return hashEmbed(text);
        }
        return deepinfraEmbed(text, this.env.DEEPINFRA_API_KEY, this.env.DEEPINFRA_API_URL);

      case 'cloudflare-ai':
        return cfaiEmbed(text, this.env);

      case 'hash-fallback':
      default:
        return hashEmbed(text);
    }
  }

  /**
   * Compute cosine similarity between two vectors.
   * Mirrors pincher's embed::cosine_similarity.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      // Pad or truncate to shortest
      const len = Math.min(a.length, b.length);
      a = a.slice(0, len);
      b = b.slice(0, len);
    }

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  /** Get embedding dimension for the current service */
  getDimension(): number {
    switch (this.env.EMBEDDING_SERVICE) {
      case 'deepinfra':
      case 'cloudflare-ai':
        return 384;
      case 'hash-fallback':
      default:
        return 16;
    }
  }
}
