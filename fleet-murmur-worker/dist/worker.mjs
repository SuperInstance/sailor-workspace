// src/constants.ts
var DEFAULT_THRESHOLDS = {
  exact: 0.8,
  similar: 0.55
};
var CONFIDENCE_BOOST_FAST = 1.005;
var CONFIDENCE_BOOST_SLOW = 1.01;
var DEFAULT_CONFIDENCE = 0.6;
var KV_PREFIXES = {
  reflex: "reflex:",
  reflexIndexByHash: "reflex-index:hash:",
  // reflex-index:hash:{hash} → reflex ID
  reflexIndexByTag: "reflex-index:tag:",
  // reflex-index:tag:{tag} → reflex ID[]
  cache: "cache:",
  sequence: "sequence:",
  errors: "errors:",
  agent: "agent:",
  subscription: "subscription:"
};
var BB_CHANNELS = {
  responses: "agent/fleet-murmur-worker/responses",
  status: "agent/fleet-murmur-worker/status",
  reflexes: "agent/fleet-murmur-worker/reflexes",
  errors: "agent/fleet-murmur-worker/errors"
};
var CACHE_TTL = {
  fastPath: 300,
  // 5 min for fast path responses
  slowPath: 3600,
  // 1 hour for slow path responses
  reflex: 86400,
  // 24 hours for reflex definitions
  subscription: 600
  // 10 min for subscription configs
};
var HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};
var VERSION = "1.0.0";

// src/router.ts
var Router = class {
  constructor(engine, vectorDb, blackboard, embedder, env) {
    this.engine = engine;
    this.vectorDb = vectorDb;
    this.blackboard = blackboard;
    this.embedder = embedder;
    this.env = env;
  }
  engine;
  vectorDb;
  blackboard;
  embedder;
  env;
  async handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: { ...corsHeaders, "Allow": "GET, POST, OPTIONS" }
      });
    }
    try {
      switch (true) {
        // ── Agent message processing ─────────────────────────
        case (method === "POST" && path === "/api/agent/message"):
          return await this.handleMessage(request, corsHeaders);
        // ── Teach new reflex ────────────────────────────────
        case (method === "POST" && path === "/api/agent/teach"):
          return await this.handleTeach(request, corsHeaders);
        // ── List reflexes ───────────────────────────────────
        case (method === "GET" && path === "/api/agent/reflexes"):
          return await this.handleListReflexes(corsHeaders);
        // ── Health check ─────────────────────────────────────
        case (method === "GET" && path === "/api/health"):
          return await this.handleHealth(corsHeaders);
        // ── Blackboard webhook ──────────────────────────────
        case (method === "POST" && path === "/api/blackboard/webhook"):
          return await this.handleBlackboardWebhook(request, corsHeaders);
        // ── Metrics status ──────────────────────────────────
        case (method === "GET" && path === "/api/status"):
          return await this.handleStatus(corsHeaders);
        // ── 404 fallback ────────────────────────────────────
        default:
          return new Response(
            JSON.stringify({ error: "Not found", path, method }),
            { status: HTTP.NOT_FOUND, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: HTTP.INTERNAL_ERROR, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  /** POST /api/agent/message — Process an agent message through the reflex engine */
  async handleMessage(request, cors) {
    const body = await request.json();
    if (!body?.intent) {
      return new Response(
        JSON.stringify({ error: "Missing required field: intent" }),
        { status: HTTP.BAD_REQUEST, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    const response = await this.engine.process(body.intent, {
      agentId: body.context?.agentId ?? "unknown",
      source: body.context?.source ?? "webhook",
      room: body.context?.room,
      timestamp: body.context?.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
    });
    this.blackboard.broadcastResponse({
      ...response,
      intent: body.intent,
      sourceAgent: body.context?.agentId ?? "unknown"
    }).catch((e) => console.error("Blackboard broadcast failed:", e));
    return new Response(JSON.stringify(response), {
      status: HTTP.OK,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  /** POST /api/agent/teach — Teach a new reflex */
  async handleTeach(request, cors) {
    const body = await request.json();
    if (!body?.intent || !body?.action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: intent, action" }),
        { status: HTTP.BAD_REQUEST, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    const reflex = await this.engine.teach(body.intent, body.action, body.tags);
    return new Response(JSON.stringify(reflex), {
      status: HTTP.CREATED,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  /** GET /api/agent/reflexes — List known reflexes */
  async handleListReflexes(cors) {
    const reflexes = await this.engine.listReflexes();
    return new Response(JSON.stringify({ count: reflexes.length, reflexes }), {
      status: HTTP.OK,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  /** GET /api/health — Health check endpoint */
  async handleHealth(cors) {
    const dbHealth = await this.vectorDb.health();
    const status = dbHealth.ok ? "healthy" : "degraded";
    return new Response(JSON.stringify({
      status,
      version: this.env.VERSION ?? "1.0.0",
      agent: this.env.AGENT_NAME ?? "fleet-murmur-worker",
      vectorDb: {
        backend: this.env.VECTOR_DB_BACKEND ?? "kv-fallback",
        status: dbHealth.ok ? "connected" : "error",
        reflexCount: dbHealth.count
      },
      llm: {
        configured: !!this.env.DEEPINFRA_API_KEY,
        provider: this.env.DEEPINFRA_API_KEY ? "deepinfra" : "none"
      },
      blackboard: {
        configured: !!this.env.GITHUB_TOKEN,
        repo: this.env.BLACKBOARD_REPO ?? "not-configured"
      }
    }), {
      status: HTTP.OK,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  /** POST /api/blackboard/webhook — Receive blackboard push notification */
  async handleBlackboardWebhook(_request, cors) {
    return new Response(JSON.stringify({ received: true }), {
      status: HTTP.OK,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
  /** GET /api/status — Runtime metrics */
  async handleStatus(cors) {
    const metrics = await this.engine.getMetrics();
    return new Response(JSON.stringify(metrics), {
      status: HTTP.OK,
      headers: { ...cors, "Content-Type": "application/json" }
    });
  }
};

// src/reflex-engine.ts
var ReflexEngine = class {
  constructor(vectorDb, embedder, veto, env) {
    this.vectorDb = vectorDb;
    this.embedder = embedder;
    this.veto = veto;
    this.env = env;
    this.thresholds = { exact: DEFAULT_THRESHOLDS.exact, similar: DEFAULT_THRESHOLDS.similar };
    this.metricsInternal = this.createEmptyMetrics();
  }
  vectorDb;
  embedder;
  veto;
  env;
  thresholds;
  metricsInternal;
  /**
   * Process an intent through the reflex engine.
   * This is the main entry point — mirrors pincher's ReflexEngine::do_intent().
   */
  async process(intent, context) {
    const startTime = Date.now();
    this.metricsInternal.totalRequests++;
    const cached = await this.checkCache(intent);
    if (cached) {
      return cached;
    }
    const match = await this.findMatch(intent);
    if (match.matchType === "exact" && match.reflex) {
      const response2 = await this.handleExactMatch(intent, match.reflex, context, startTime);
      await this.cacheResponse(intent, response2);
      return response2;
    }
    if (match.matchType === "similar" && match.reflex) {
      const response2 = await this.handleSimilarMatch(intent, match.reflex, context, startTime);
      await this.cacheResponse(intent, response2);
      return response2;
    }
    const response = await this.handleNovelMatch(intent, context, startTime);
    await this.cacheResponse(intent, response);
    return response;
  }
  /** Teach a new reflex — stores intent + action pair in vector DB */
  async teach(intent, action, tags, initialConfidence) {
    const embedding = await this.embedder.embed(intent);
    return this.vectorDb.insert({
      intent,
      action,
      embedding,
      confidence: initialConfidence ?? DEFAULT_CONFIDENCE,
      invokeCount: 0,
      tags: tags ?? [],
      source: this.env.AGENT_NAME ?? "fleet-murmur-worker"
    });
  }
  /** List all known reflexes */
  async listReflexes() {
    return this.vectorDb.listAll();
  }
  /** Get runtime metrics */
  async getMetrics() {
    const reflexes = await this.vectorDb.listAll();
    this.metricsInternal.reflexesStored = reflexes.length;
    return { ...this.metricsInternal };
  }
  // ── Private Helpers ──────────────────────────────────────
  /** Find the best match for an intent in the vector DB */
  async findMatch(intent) {
    const results = await this.vectorDb.search(intent, this.embedder, 3);
    if (results.length === 0) {
      return { matchType: "novel", score: 0 };
    }
    const best = results[0];
    if (best.score >= this.thresholds.exact) {
      return { matchType: "exact", reflex: best.reflex, score: best.score };
    }
    if (best.score >= this.thresholds.similar) {
      return { matchType: "similar", reflex: best.reflex, score: best.score };
    }
    return { matchType: "novel", reflex: best.reflex, score: best.score };
  }
  /** Handle an exact match (confidence ≥ 0.80) */
  async handleExactMatch(intent, reflex, context, startTime) {
    const duration = Date.now() - startTime;
    this.metricsInternal.fastPathCount++;
    this.metricsInternal.avgFastPathMs = (this.metricsInternal.avgFastPathMs * (this.metricsInternal.fastPathCount - 1) + duration) / this.metricsInternal.fastPathCount;
    const vetoResult = this.veto.check(reflex.action);
    if (!vetoResult.allow) {
      this.metricsInternal.errors.vetoBlocked++;
      return {
        id: crypto.randomUUID(),
        status: "blocked",
        path: "fast",
        confidence: reflex.confidence,
        response: `Action blocked by veto: ${vetoResult.reason}`,
        reflexId: reflex.id,
        durationMs: duration
      };
    }
    await this.vectorDb.updateConfidence(reflex.id, CONFIDENCE_BOOST_FAST);
    return {
      id: crypto.randomUUID(),
      status: "completed",
      path: "fast",
      confidence: reflex.confidence,
      response: reflex.action,
      action: reflex.action,
      reflexId: reflex.id,
      durationMs: duration
    };
  }
  /** Handle a similar match (0.55 ≤ confidence < 0.80) */
  async handleSimilarMatch(intent, reflex, context, startTime) {
    const llmResponse = await this.callLLM(
      `The user asked: "${intent}".
       The closest known reflex matches: "${reflex.intent}" (confidence: ${reflex.confidence}).
       The known action is: "${reflex.action}".
       Please confirm if this action is appropriate, or provide an adapted response.`,
      context
    );
    const duration = Date.now() - startTime;
    if (llmResponse.isConfirmation) {
      await this.vectorDb.updateConfidence(reflex.id, CONFIDENCE_BOOST_SLOW);
      this.metricsInternal.fastPathCount++;
      return {
        id: crypto.randomUUID(),
        status: "completed",
        path: "similar",
        confidence: reflex.confidence,
        response: reflex.action,
        action: reflex.action,
        reflexId: reflex.id,
        durationMs: duration
      };
    }
    const newReflex = await this.teach(intent, llmResponse.text, ["similar-adapted"]);
    this.metricsInternal.slowPathCount++;
    this.metricsInternal.avgSlowPathMs = (this.metricsInternal.avgSlowPathMs * (this.metricsInternal.slowPathCount - 1) + duration) / this.metricsInternal.slowPathCount;
    return {
      id: crypto.randomUUID(),
      status: "completed",
      path: "similar",
      confidence: reflex.confidence,
      response: llmResponse.text,
      action: llmResponse.text,
      reflexId: newReflex.id,
      durationMs: duration
    };
  }
  /** Handle a novel match (confidence < 0.55) — full LLM reasoning */
  async handleNovelMatch(intent, context, startTime) {
    this.metricsInternal.slowPathCount++;
    const llmResponse = await this.callLLM(
      `You are the fleet-murmur-worker, a serverless agent in the Ternary Fleet.
       An agent in room "${context.room ?? "unknown"}" asked: "${intent}"
       Please respond with a helpful action or information.
       Format your response as a concise, actionable answer.`,
      context
    );
    const duration = Date.now() - startTime;
    this.metricsInternal.avgSlowPathMs = (this.metricsInternal.avgSlowPathMs * (this.metricsInternal.slowPathCount - 1) + duration) / this.metricsInternal.slowPathCount;
    try {
      const newReflex = await this.teach(intent, llmResponse.text, ["auto-learned"]);
      this.metricsInternal.reflexesStored++;
      return {
        id: crypto.randomUUID(),
        status: "completed",
        path: "slow",
        confidence: 0,
        // No confidence for novel matches
        response: llmResponse.text,
        action: llmResponse.text,
        reflexId: newReflex.id,
        durationMs: duration
      };
    } catch (err) {
      this.metricsInternal.errors.llmFailed++;
      return {
        id: crypto.randomUUID(),
        status: "error",
        path: "slow",
        confidence: 0,
        response: llmResponse.text,
        durationMs: duration,
        error: "Failed to store reflex"
      };
    }
  }
  /** Call DeepInfra LLM API */
  async callLLM(prompt, _context) {
    if (!this.env.DEEPINFRA_API_KEY) {
      return {
        text: `No LLM configured. Intent received but cannot process. Please set DEEPINFRA_API_KEY.`,
        isConfirmation: false
      };
    }
    try {
      const response = await fetch(
        this.env.DEEPINFRA_API_URL ? `${this.env.DEEPINFRA_API_URL}/chat/completions` : "https://api.deepinfra.com/v1/openai/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.env.DEEPINFRA_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V4-Flash",
            messages: [
              {
                role: "system",
                content: "You are fleet-murmur-worker, a serverless reflex agent. Respond concisely and actionably."
              },
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.3
          })
        }
      );
      if (!response.ok) {
        this.metricsInternal.errors.llmFailed++;
        return {
          text: `LLM API error: ${response.status}. Intent queued for later processing.`,
          isConfirmation: false
        };
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "No response";
      const isConfirmation = text.toLowerCase().includes("yes") || text.toLowerCase().includes("confirm");
      return { text, isConfirmation };
    } catch (err) {
      this.metricsInternal.errors.llmFailed++;
      return {
        text: `LLM call failed: ${err instanceof Error ? err.message : "Unknown error"}. Using fallback response.`,
        isConfirmation: false
      };
    }
  }
  /** Check KV cache for a cached response */
  async checkCache(intent) {
    const hash = await this.simpleHash(intent);
    const cached = await this.env.CACHE.get(`${KV_PREFIXES.cache}${hash}`);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }
  /** Cache a response in KV */
  async cacheResponse(intent, response) {
    const hash = await this.simpleHash(intent);
    const ttl = response.path === "fast" ? CACHE_TTL.fastPath : CACHE_TTL.slowPath;
    await this.env.CACHE.put(
      `${KV_PREFIXES.cache}${hash}`,
      JSON.stringify(response),
      { expirationTtl: ttl }
    );
  }
  /** Simple string hash for cache keys */
  async simpleHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  /** Create initial (empty) metrics state */
  createEmptyMetrics() {
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
      errors: { vetoBlocked: 0, llmFailed: 0, blackboardFailed: 0 }
    };
  }
};

// src/vector-db.ts
function createVectorDB(env, _embedder) {
  switch (env.VECTOR_DB_BACKEND) {
    case "external-rest":
      return new ExternalRestVectorDB(env);
    case "cloudflare-vectorize":
      return new CloudflareVectorizeDB(env);
    case "kv-fallback":
    default:
      return new KVFallbackVectorDB(env);
  }
}
var KVFallbackVectorDB = class {
  constructor(env) {
    this.env = env;
  }
  env;
  async search(intent, embedder, limit = 5) {
    const queryEmbedding = await embedder.embed(intent);
    const reflexList = await this.listAll();
    if (reflexList.length === 0) return [];
    const scored = reflexList.map((reflex) => ({
      reflex,
      score: embedder.cosineSimilarity(queryEmbedding, reflex.embedding)
    })).sort((a, b) => b.score - a.score).slice(0, limit);
    return scored;
  }
  async insert(data) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const reflex = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      confidence: data.confidence ?? DEFAULT_CONFIDENCE
    };
    await this.env.REFLEX_STORE.put(
      KV_PREFIXES.reflex + id,
      JSON.stringify(reflex),
      { expirationTtl: CACHE_TTL.reflex }
    );
    return reflex;
  }
  async updateConfidence(reflexId, delta) {
    const raw = await this.env.REFLEX_STORE.get(KV_PREFIXES.reflex + reflexId);
    if (!raw) return;
    const reflex = JSON.parse(raw);
    reflex.confidence = Math.min(1, Math.max(0, reflex.confidence * delta));
    reflex.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    reflex.invokeCount++;
    await this.env.REFLEX_STORE.put(KV_PREFIXES.reflex + reflexId, JSON.stringify(reflex));
  }
  async delete(reflexId) {
    await this.env.REFLEX_STORE.delete(KV_PREFIXES.reflex + reflexId);
  }
  async listAll() {
    const list = await this.env.REFLEX_STORE.list({ prefix: KV_PREFIXES.reflex });
    const reflexes = [];
    for (const key of list.keys) {
      const raw = await this.env.REFLEX_STORE.get(key.name);
      if (raw) {
        reflexes.push(JSON.parse(raw));
      }
    }
    return reflexes;
  }
  async health() {
    try {
      const list = await this.env.REFLEX_STORE.list({ prefix: KV_PREFIXES.reflex, limit: 1 });
      return { ok: true, count: list.keys.length, backend: "kv-fallback" };
    } catch {
      return { ok: false, count: 0, backend: "kv-fallback" };
    }
  }
};
var ExternalRestVectorDB = class {
  constructor(env) {
    this.env = env;
  }
  env;
  get apiUrl() {
    return this.env.VECTOR_DB_API ?? "http://localhost:8080";
  }
  get headers() {
    const h = { "Content-Type": "application/json" };
    if (this.env.VECTOR_DB_KEY) {
      h["Authorization"] = `Bearer ${this.env.VECTOR_DB_KEY}`;
    }
    return h;
  }
  async search(intent, embedder, limit = 5) {
    const embedding = await embedder.embed(intent);
    const response = await fetch(`${this.apiUrl}/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ vector: embedding, topK: limit, namespace: "fleet-reflexes" })
    });
    if (!response.ok) {
      throw new Error(`Vector DB search failed: ${response.status}`);
    }
    const data = await response.json();
    return data.results;
  }
  async insert(data) {
    const response = await fetch(`${this.apiUrl}/insert`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error(`Vector DB insert failed: ${response.status}`);
    }
    return await response.json();
  }
  async updateConfidence(reflexId, delta) {
    await fetch(`${this.apiUrl}/confidence`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ reflexId, delta })
    });
  }
  async delete(reflexId) {
    await fetch(`${this.apiUrl}/reflex/${reflexId}`, { method: "DELETE", headers: this.headers });
  }
  async listAll() {
    const response = await fetch(`${this.apiUrl}/reflexes`, { headers: this.headers });
    return await response.json();
  }
  async health() {
    try {
      const response = await fetch(`${this.apiUrl}/health`, { headers: this.headers });
      const data = await response.json();
      return { ok: data.status === "ok", count: data.count ?? 0, backend: "external-rest" };
    } catch {
      return { ok: false, count: 0, backend: "external-rest" };
    }
  }
};
var CloudflareVectorizeDB = class {
  constructor(env) {
    this.env = env;
  }
  env;
  async search(intent, embedder, limit = 5) {
    const embedding = await embedder.embed(intent);
    const index = this.env.VECTORIZE_INDEX;
    if (!index) {
      throw new Error("Vectorize index binding not configured");
    }
    const results = await index.query(embedding, { topK: limit, returnMetadata: true });
    return results.matches.map((m) => ({
      reflex: m.metadata,
      score: m.score
    }));
  }
  async insert(data) {
    const id = crypto.randomUUID();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const reflex = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      confidence: data.confidence ?? DEFAULT_CONFIDENCE
    };
    const index = this.env.VECTORIZE_INDEX;
    await index.insert([{ id, values: reflex.embedding, metadata: reflex }]);
    return reflex;
  }
  async updateConfidence(_reflexId, _delta) {
    console.warn("updateConfidence not implemented for Cloudflare Vectorize");
  }
  async delete(reflexId) {
    const index = this.env.VECTORIZE_INDEX;
    await index.deleteByIds([reflexId]);
  }
  async listAll() {
    console.warn("listAll not fully implemented for Cloudflare Vectorize \u2014 use KV for reflex list");
    return [];
  }
  async health() {
    const index = this.env.VECTORIZE_INDEX;
    try {
      const info = await index.describe();
      return { ok: true, count: info.totalVectorCount, backend: "cloudflare-vectorize" };
    } catch {
      return { ok: false, count: 0, backend: "cloudflare-vectorize" };
    }
  }
};

// src/blackboard-client.ts
var GH_API = "https://api.github.com";
var BlackboardClient = class {
  constructor(env) {
    this.env = env;
  }
  env;
  /** Broadcast an agent response as a blackboard podcast */
  async broadcastResponse(response) {
    if (!this.env.GITHUB_TOKEN) return;
    const podcast = this.formatPodcast(response);
    const content = this.renderPodcastMarkdown(podcast);
    const datePath = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const sequence = await this.nextSequence(BB_CHANNELS.responses, datePath);
    const filename = `${String(sequence).padStart(3, "0")}.md`;
    const filePath = `notes/blackboard/${BB_CHANNELS.responses}/${datePath}/${filename}`;
    try {
      await this.commitFile(filePath, content, `blackboard: ${BB_CHANNELS.responses} [${filename}]`);
      this.env.CACHE.put(`sequence:${BB_CHANNELS.responses}:${datePath}`, String(sequence));
    } catch (err) {
      console.error("Blackboard commit failed:", err);
    }
  }
  /** Broadcast health/status to blackboard */
  async broadcastStatus(status) {
    if (!this.env.GITHUB_TOKEN) return;
    const datePath = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const sequence = await this.nextSequence(BB_CHANNELS.status, datePath);
    const filename = `${String(sequence).padStart(3, "0")}.md`;
    const filePath = `notes/blackboard/${BB_CHANNELS.status}/${datePath}/${filename}`;
    const content = `---
podcast_id: "${datePath}/${filename.replace(".md", "")}"
channel: "${BB_CHANNELS.status}"
agent: "${this.env.AGENT_NAME ?? "fleet-murmur-worker"}"
variant: "heartbeat"
sequence: ${sequence}
created: "${(/* @__PURE__ */ new Date()).toISOString()}"
tags: ["heartbeat", "status"]
---

# PODCAST: ${datePath}/${String(sequence).padStart(3, "0")}

## Source
- **Agent**: ${this.env.AGENT_NAME ?? "fleet-murmur-worker"}
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
    }
  }
  /** Broadcast detailed metrics */
  async broadcastMetrics(metrics) {
  }
  /** Sync the blackboard index file */
  async syncIndex() {
    if (!this.env.GITHUB_TOKEN) return;
    const indexContent = JSON.stringify({
      format: 1,
      built: (/* @__PURE__ */ new Date()).toISOString(),
      agent: this.env.AGENT_NAME ?? "fleet-murmur-worker",
      notes: "Index rebuild placeholder \u2014 implement full scan in production"
    }, null, 2);
    try {
      await this.commitFile(
        "notes/blackboard/_index.json",
        indexContent,
        "blackboard: sync index"
      );
    } catch (_err) {
    }
  }
  // ── Private Helpers ──────────────────────────────────────
  /** Format a podcast from a response */
  formatPodcast(response) {
    return {
      podcastId: "",
      channel: BB_CHANNELS.responses,
      agent: this.env.AGENT_NAME ?? "fleet-murmur-worker",
      variant: "standard",
      sequence: 0,
      // Will be filled in
      created: (/* @__PURE__ */ new Date()).toISOString(),
      path: response.path,
      confidence: response.confidence,
      durationMs: response.durationMs,
      reflexId: response.reflexId,
      intent: response.intent,
      response: response.response,
      sourceAgent: response.sourceAgent,
      tags: ["agent-response", response.path, this.env.AGENT_NAME ?? "fleet-murmur-worker"]
    };
  }
  /** Render a podcast as markdown with YAML frontmatter */
  renderPodcastMarkdown(podcast) {
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const seq = String(podcast.sequence).padStart(3, "0");
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
reflex_id: "${podcast.reflexId ?? ""}"
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
- ${podcast.path === "fast" ? "\u26A1 Fast path reflex match" : "\u{1F9E0} LLM slow path reasoning"}
- Intent: "${podcast.intent}"
- Response: ${podcast.response}

## Performance
- **Path**: ${podcast.path}
- **Confidence**: ${(podcast.confidence * 100).toFixed(1)}%
- **Duration**: ${podcast.durationMs}ms
- **Reflex ID**: ${podcast.reflexId ?? "new"}
- **Source Agent**: ${podcast.sourceAgent}
`;
  }
  /** Get next sequence number for a channel+date */
  async nextSequence(channel, datePath) {
    const cacheKey = `sequence:${channel}:${datePath}`;
    const cached = await this.env.CACHE.get(cacheKey);
    if (cached) {
      return parseInt(cached, 10) + 1;
    }
    return 1;
  }
  /** Commit a file to construct-coordination via GitHub API */
  async commitFile(filePath, content, message) {
    const repo = this.env.BLACKBOARD_REPO ?? "SuperInstance/construct-coordination";
    const branch = this.env.BLACKBOARD_BRANCH ?? "main";
    const getUrl = `${GH_API}/repos/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
    const getResponse = await fetch(getUrl, {
      headers: {
        "Authorization": `Bearer ${this.env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "fleet-murmur-worker"
      }
    });
    let sha;
    if (getResponse.ok) {
      const existing = await getResponse.json();
      sha = existing.sha;
    }
    const encodedContent = btoa(content);
    const putUrl = `${GH_API}/repos/${repo}/contents/${encodeURIComponent(filePath)}`;
    const putResponse = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${this.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "fleet-murmur-worker"
      },
      body: JSON.stringify({
        message,
        content: encodedContent,
        branch,
        sha
        // undefined for new files
      })
    });
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`GitHub API error (${putResponse.status}): ${errorText}`);
    }
  }
};

// src/veto-engine.ts
var DANGEROUS_PATTERNS = [
  // Recursive destructive deletes
  /rm\s+(-rf|--recursive)\s+\//,
  /rm\s+(-rf|--recursive)\s+~\/?\s*\*?$/,
  // Filesystem destruction
  /mkfs\s+/,
  /mkfs\.\w+\s+/,
  /dd\s+if=\/dev\/zero/,
  /dd\s+if=\/dev\/urandom/,
  /dd\s+of=\/dev/,
  /shred\s+/,
  /wipefs\s+/,
  // Fork bombs
  /:\(\)\s*\{[^}]*:\(\)\s*\}/,
  /:\+\(\)\s*\{[^}]*\}.*&/,
  // Mass permission changes
  /chmod\s+777\s+-R/,
  /chmod\s+777\s+--recursive/,
  // Remote code execution
  /curl\s+.*\|?\s*bash/,
  /wget\s+.*\|?\s*bash/,
  /curl\s+.*\|?\s*sh\b/,
  // Shell shock / environment injection
  /env\s+[^=]+=[^=].*;.*/,
  // Overwriting critical system files
  />\s*\/etc\/(passwd|shadow|sudoers)/,
  />\s*\/boot\//,
  // Cryptominers
  /minerd/,
  /xmrig/,
  /cryptonight/
];
var VetoEngine = class {
  /** Check an action against the veto rules */
  check(action) {
    if (!action || action.trim().length === 0) {
      return { allow: true };
    }
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(action.toLowerCase())) {
        return {
          allow: false,
          reason: `VETO: Action matches dangerous pattern: ${pattern.toString().slice(0, 60)}`
        };
      }
    }
    return { allow: true };
  }
  /** Add a custom veto rule at runtime */
  addRule(pattern) {
    return DANGEROUS_PATTERNS.push(pattern);
  }
  /** Get all registered veto patterns (for debugging) */
  getPatterns() {
    return DANGEROUS_PATTERNS.map((p) => p.toString());
  }
};

// src/agent-coordination.ts
var AgentCoordination = class {
  state;
  storage;
  // In-memory caches for hot data
  agents = /* @__PURE__ */ new Map();
  subscriptions = /* @__PURE__ */ new Map();
  // channel → agent IDs
  reflexStats = /* @__PURE__ */ new Map();
  messageQueue = [];
  executionHistory = [];
  alarmScheduled = false;
  // Metrics accumulators
  totalRequests = 0;
  fastPathCount = 0;
  slowPathCount = 0;
  totalDurationMs = 0;
  vetoBlockedCount = 0;
  llmFailedCount = 0;
  blackboardFailedCount = 0;
  constructor(state, _env) {
    this.state = state;
    this.storage = state.storage;
    state.blockConcurrencyWhile(async () => {
      const savedAgentCount = await this.storage.get("agentCount");
      if (savedAgentCount !== void 0) {
      }
    });
  }
  // ── Agent Registry ───────────────────────────────────────
  /** Register an agent in the fleet */
  async registerAgent(info) {
    this.agents.set(info.agentId, {
      ...info,
      status: "active"
    });
    await this.storage.put(`agent:${info.agentId}`, info);
    await this.storage.put("agentCount", this.agents.size);
    this.scheduleHealthCheck();
  }
  /** Get info for a specific agent */
  async getAgent(agentId) {
    return this.agents.get(agentId) ?? null;
  }
  /** List all registered agents */
  async listAgents() {
    return Array.from(this.agents.values());
  }
  /** Mark an agent as offline */
  async markOffline(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = "offline";
      agent.lastSeen = (/* @__PURE__ */ new Date()).toISOString();
    }
  }
  // ── Subscription Management ──────────────────────────────
  /** Subscribe an agent to a channel */
  async subscribe(agentId, channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, /* @__PURE__ */ new Set());
    }
    this.subscriptions.get(channel).add(agentId);
    const key = `sub:${channel}`;
    const existing = await this.storage.get(key) ?? [];
    if (!existing.includes(agentId)) {
      existing.push(agentId);
      await this.storage.put(key, existing);
    }
  }
  /** Unsubscribe an agent from a channel */
  async unsubscribe(agentId, channel) {
    this.subscriptions.get(channel)?.delete(agentId);
    const key = `sub:${channel}`;
    const existing = await this.storage.get(key) ?? [];
    await this.storage.put(key, existing.filter((id) => id !== agentId));
  }
  /** Get all subscribers for a channel */
  async getSubscribers(channel) {
    return Array.from(this.subscriptions.get(channel) ?? []);
  }
  /** Get all channels an agent subscribes to */
  async getAgentChannels(agentId) {
    const channels = [];
    for (const [channel, agents] of this.subscriptions) {
      if (agents.has(agentId)) {
        channels.push(channel);
      }
    }
    return channels;
  }
  // ── Execution Tracking ───────────────────────────────────
  /** Record a reflex execution */
  async recordExecution(reflexId, path, durationMs) {
    this.totalRequests++;
    this.totalDurationMs += durationMs;
    if (path === "fast" || path === "similar") {
      this.fastPathCount++;
    } else {
      this.slowPathCount++;
    }
    const stats = this.reflexStats.get(reflexId) ?? {
      totalInvokes: 0,
      fastPathCount: 0,
      slowPathCount: 0,
      avgDurationMs: 0,
      lastInvoked: ""
    };
    stats.totalInvokes++;
    if (path === "fast" || path === "similar") stats.fastPathCount++;
    else stats.slowPathCount++;
    stats.avgDurationMs = (stats.avgDurationMs * (stats.totalInvokes - 1) + durationMs) / stats.totalInvokes;
    stats.lastInvoked = (/* @__PURE__ */ new Date()).toISOString();
    this.reflexStats.set(reflexId, stats);
    this.executionHistory.push({ reflexId, path, durationMs, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    if (this.executionHistory.length > 1e3) {
      this.executionHistory = this.executionHistory.slice(-500);
    }
    await this.storage.put(`reflex-stats:${reflexId}`, stats);
  }
  /** Record a veto block */
  async recordVetoBlock() {
    this.vetoBlockedCount++;
  }
  /** Record an LLM failure */
  async recordLlmFailure() {
    this.llmFailedCount++;
  }
  /** Record a blackboard failure */
  async recordBlackboardFailure() {
    this.blackboardFailedCount++;
  }
  // ── Metrics ──────────────────────────────────────────────
  /** Get aggregated runtime metrics */
  async getMetrics() {
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
        blackboardFailed: this.blackboardFailedCount
      }
    };
  }
  /** Alert: schedule a periodic health check */
  scheduleHealthCheck() {
    if (!this.alarmScheduled) {
      this.alarmScheduled = true;
      this.state.storage.setAlarm(Date.now() + 3e5);
    }
  }
  /** DO Alarm handler — periodic maintenance */
  async alarm() {
    this.alarmScheduled = false;
    const now = Date.now();
    for (const [agentId, agent] of this.agents) {
      if (agent.status === "offline") {
        const lastSeen = new Date(agent.lastSeen).getTime();
        if (now - lastSeen > 24 * 60 * 60 * 1e3) {
          this.agents.delete(agentId);
          await this.storage.delete(`agent:${agentId}`);
        }
      }
    }
    this.scheduleHealthCheck();
  }
};

// src/embed.ts
function hashEmbed(text, dimensions = 16) {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(dimensions).fill(0);
  for (const word of words) {
    let h = 5381;
    for (let i = 0; i < word.length; i++) {
      h = (h << 5) + h ^ word.charCodeAt(i);
    }
    for (let d = 0; d < dimensions; d++) {
      vec[d] += Math.sin(h * (d + 1)) * 1e4;
    }
  }
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= mag;
    }
  }
  return vec;
}
async function deepinfraEmbed(text, apiKey, apiUrl) {
  const response = await fetch(`${apiUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "BAAI/bge-base-en-v1.5",
      input: text
    })
  });
  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.data[0].embedding;
}
async function cfaiEmbed(text, env) {
  const ai = env.AI;
  if (!ai) {
    throw new Error("Workers AI binding not configured");
  }
  const result = await ai.run("@cf/baai/bge-base-en-v1.5", { text });
  return result.data[0];
}
var Embedder = class {
  constructor(env) {
    this.env = env;
  }
  env;
  /**
   * Embed text into a vector.
   * Returns a 16-dim vector for hash fallback, 384/768-dim for real embeddings.
   */
  async embed(text) {
    switch (this.env.EMBEDDING_SERVICE) {
      case "deepinfra":
        if (!this.env.DEEPINFRA_API_KEY) {
          console.warn("DeepInfra embedding requested but no API key; falling back to hash");
          return hashEmbed(text);
        }
        return deepinfraEmbed(text, this.env.DEEPINFRA_API_KEY, this.env.DEEPINFRA_API_URL);
      case "cloudflare-ai":
        return cfaiEmbed(text, this.env);
      case "hash-fallback":
      default:
        return hashEmbed(text);
    }
  }
  /**
   * Compute cosine similarity between two vectors.
   * Mirrors pincher's embed::cosine_similarity.
   */
  cosineSimilarity(a, b) {
    if (a.length !== b.length) {
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
  getDimension() {
    switch (this.env.EMBEDDING_SERVICE) {
      case "deepinfra":
      case "cloudflare-ai":
        return 384;
      case "hash-fallback":
      default:
        return 16;
    }
  }
};

// src/index.ts
var index_default = {
  async fetch(request, env, ctx) {
    try {
      const embedder = new Embedder(env);
      const vectorDb = createVectorDB(env, embedder);
      const veto = new VetoEngine();
      const blackboard = new BlackboardClient(env);
      const engine = new ReflexEngine(vectorDb, embedder, veto, env);
      const router = new Router(engine, vectorDb, blackboard, embedder, env);
      return await router.handle(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: message, version: VERSION }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  },
  /** Cron trigger handler for scheduled tasks */
  async scheduled(event, env, ctx) {
    const embedder = new Embedder(env);
    const vectorDb = createVectorDB(env, embedder);
    const veto = new VetoEngine();
    const blackboard = new BlackboardClient(env);
    const engine = new ReflexEngine(vectorDb, embedder, veto, env);
    switch (event.cron) {
      case "*/5 * * * *":
        const health = await engine.getMetrics();
        await blackboard.broadcastStatus({
          uptime: process.uptime(),
          requestsProcessed: health.totalRequests,
          fastPathPct: health.fastPathPct,
          avgResponseMs: health.avgResponseMs,
          reflexesStored: health.reflexesStored,
          agentsRegistered: health.agentsRegistered
        });
        break;
      case "0 * * * *":
        await blackboard.broadcastMetrics(await engine.getMetrics());
        break;
      case "0 3 * * *":
        await blackboard.syncIndex();
        break;
    }
  }
};
export {
  AgentCoordination,
  index_default as default
};
