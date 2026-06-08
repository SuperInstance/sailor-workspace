#!/usr/bin/env node

/**
 * Fleet Conductor — Fleet MIDI Cue Router (WebSocket + HTTP)
 *
 * Listens on port 8769. Connects to tminus-dispatcher(:8768) as agent
 * "fleet-conductor", subscribes to the voice-real-time phase group, and
 * routes incoming cues to the appropriate fleet-midi ensign agents.
 *
 * Architecture:
 *   tminus-dispatcher (:8768)
 *         │ WS (fleet-conductor)
 *         ▼
 *   fleet-conductor (:8769) ─── HTTP POST /agent ──→ fleet-midi-* (:2160+)
 *         │
 *         └── logging → memory/fleet-conductor-log.md
 *
 * Fleet-MIDI Agent Port Map:
 *   2160  fleet-midi-chord         note/velocity → chord analysis
 *   2161  fleet-midi-scale          note/velocity → scale detection
 *   2162  fleet-midi-voicing        note/velocity → voicing suggestions
 *   2163  fleet-midi-tempo          tempo data → BPM & time sig
 *   2164  fleet-midi-cc             CC data → control surface mapping
 *   2165  fleet-midi-expression     CC data → expression/articulation
 *   2166  fleet-midi-dynamics       tempo data → dynamic shaping
 *   2167  fleet-midi-pan            spatial data → pan & spatialization
 *   2168  fleet-midi-modulation     spatial data → LFO/modulation
 *   2169  fleet-midi-arp            arpeggiator patterns
 *   2170  fleet-midi-groove         groove quantize / swing
 *   2171  fleet-midi-velocity       velocity curves & humanization
 *   2172  fleet-midi-fx             effects routing (reverb/delay)
 *   2173  fleet-midi-register       register/brightness mapping
 *   2174  fleet-midi-melody         melody generation / contour
 *   2175  fleet-midi-bass           bass line generation
 */

const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────
const CONDUCTOR_PORT  = parseInt(process.env.CONDUCTOR_PORT || '8769', 10);
const CONDUCTOR_HOST  = process.env.CONDUCTOR_HOST  || '0.0.0.0';
const TMINUS_WS_URL   = process.env.TMINUS_WS_URL   || 'ws://127.0.0.1:8768';
const TMINUS_REST_URL = process.env.TMINUS_REST_URL || 'http://127.0.0.1:8768';
const LOG_PATH        = process.env.FLEET_LOG_PATH  ||
  path.join(__dirname, '..', '..', 'memory', 'fleet-conductor-log.md');

// ─── Agent Port Registry ──────────────────────────────────────────────
const AGENT_REGISTRY = {
  chord:        { port: 2160, name: 'fleet-midi-chord',        roles: ['note', 'velocity'] },
  scale:        { port: 2161, name: 'fleet-midi-scale',        roles: ['note', 'velocity'] },
  voicing:      { port: 2162, name: 'fleet-midi-voicing',      roles: ['note', 'velocity'] },
  tempo:        { port: 2163, name: 'fleet-midi-tempo',        roles: ['tempo'] },
  cc:           { port: 2164, name: 'fleet-midi-cc',           roles: ['cc'] },
  expression:   { port: 2165, name: 'fleet-midi-expression',    roles: ['cc'] },
  dynamics:     { port: 2166, name: 'fleet-midi-dynamics',      roles: ['tempo'] },
  pan:          { port: 2167, name: 'fleet-midi-pan',           roles: ['spatial'] },
  modulation:   { port: 2168, name: 'fleet-midi-modulation',    roles: ['spatial'] },
  arp:          { port: 2169, name: 'fleet-midi-arp',           roles: ['note'] },
  groove:       { port: 2170, name: 'fleet-midi-groove',        roles: ['tempo'] },
  velocity:     { port: 2171, name: 'fleet-midi-velocity',      roles: ['note', 'cc'] },
  fx:           { port: 2172, name: 'fleet-midi-fx',            roles: ['spatial', 'cc'] },
  register:     { port: 2173, name: 'fleet-midi-register',      roles: ['note'] },
  melody:       { port: 2174, name: 'fleet-midi-melody',        roles: ['note', 'velocity'] },
  bass:         { port: 2175, name: 'fleet-midi-bass',          roles: ['note', 'velocity'] },
};

// ─── Agent State Cache ────────────────────────────────────────────────
// Tracks last known status per agent: { status, output, lastSeen, errorCount }
const agentStateCache = new Map();

function initAgentStates() {
  for (const [id, info] of Object.entries(AGENT_REGISTRY)) {
    agentStateCache.set(id, {
      agentId: id,
      port: info.port,
      name: info.name,
      status: 'unknown',
      output: null,
      lastSeen: null,
      errorCount: 0,
      lastError: null,
    });
  }
}

// ─── Logging ──────────────────────────────────────────────────────────
let logStream = null;

function ensureLogStream() {
  if (logStream) return;
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Append mode
  logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
  logStream.write(`--- fleet-conductor log started ${new Date().toISOString()} ---\n`);
}

function logEvent(event) {
  ensureLogStream();
  const entry = {
    ts: Date.now(),
    iso: new Date().toISOString(),
    ...event,
  };
  const line = JSON.stringify(entry) + '\n';
  logStream.write(line);
  console.log(`[${entry.iso}] ${event.type || 'event'}:`, JSON.stringify(event).slice(0, 200));
}

// ─── HTTP Agent Router ────────────────────────────────────────────────
// Determine which agents should receive a given cue based on payload keys.

function routeCue(payload) {
  const targets = new Set();

  if (!payload) return Array.from(targets);

  // note/velocity data → chord, scale, voicing, melody, bass, arp, velocity, register
  if (payload.note !== undefined || payload.velocity !== undefined || payload.notes) {
    targets.add('chord').add('scale').add('voicing')
           .add('melody').add('bass').add('arp')
           .add('velocity').add('register');
  }

  // CC data → cc, expression, fx, velocity
  if (payload.cc !== undefined || payload.ccs || payload.cc_map) {
    targets.add('cc').add('expression').add('fx').add('velocity');
  }

  // tempo data → tempo, dynamics, groove
  if (payload.tempo !== undefined || payload.bpm !== undefined ||
      payload.time_signature !== undefined || payload.beat) {
    targets.add('tempo').add('dynamics').add('groove');
  }

  // spatial data → pan, modulation, fx
  if (payload.pan !== undefined || payload.spatial !== undefined ||
      payload.azimuth !== undefined || payload.modulation !== undefined) {
    targets.add('pan').add('modulation').add('fx');
  }

  return Array.from(targets);
}

// ─── Forward cue to a single fleet-midi agent ─────────────────────────
function forwardToAgent(agentId, cuePayload, source) {
  const agent = AGENT_REGISTRY[agentId];
  if (!agent) {
    logEvent({ type: 'route_error', agentId, error: 'unknown_agent' });
    return Promise.resolve(null);
  }

  const body = JSON.stringify({
    type: 'cue',
    source: source || 'fleet-conductor',
    timestamp: Date.now(),
    ...cuePayload,
  });

  const url = `http://127.0.0.1:${agent.port}/agent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return res.json();
    })
    .then((data) => {
      const cache = agentStateCache.get(agentId);
      if (cache) {
        cache.status = data.status || 'ok';
        cache.output = data.output || null;
        cache.lastSeen = Date.now();
        cache.errorCount = 0;
      }
      logEvent({
        type: 'forward_ok',
        agentId,
        port: agent.port,
        status: data.status,
        output: data.output,
      });
      return data;
    })
    .catch((err) => {
      clearTimeout(timeout);
      const cache = agentStateCache.get(agentId);
      if (cache) {
        cache.status = 'error';
        cache.errorCount++;
        cache.lastError = err.message;
      }
      logEvent({
        type: 'forward_error',
        agentId,
        port: agent.port,
        error: err.message,
      });
      return null;
    });
}

// ─── Process a cue from tminus-dispatcher ─────────────────────────────
async function processCue(source, payload) {
  logEvent({ type: 'cue_received', source, payloadSize: JSON.stringify(payload).length });

  const targetIds = routeCue(payload);
  logEvent({ type: 'cue_routed', targets: targetIds });

  if (targetIds.length === 0) {
    logEvent({ type: 'cue_no_targets', source });
    return;
  }

  const tasks = targetIds.map((id) =>
    forwardToAgent(id, { voice: payload }, source)
  );

  const results = await Promise.allSettled(tasks);

  // Log summary
  const ok = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
  const fail = results.filter((r) => r.status === 'rejected' || r.value === null).length;
  logEvent({ type: 'cue_batch_complete', totalTargets: targetIds.length, ok, fail });
}

// ─── WebSocket Client to tminus-dispatcher ────────────────────────────
class TminusClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.agentId = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this._seq = 0;
    this._pending = new Map();
    this._subscribed = false;
  }

  _nextSeq() {
    return ++this._seq;
  }

  connect() {
    console.log(`[tminus-client] Connecting to ${this.url} ...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.connected = true;
      console.log('[tminus-client] WebSocket connected');
      this._register();
    });

    this.ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this._handleMessage(msg);
      } catch (e) {
        console.error('[tminus-client] Parse error:', e.message);
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      console.log('[tminus-client] Connection closed');
      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[tminus-client] WebSocket error:', err.message);
      this.ws.close();
    });
  }

  _send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[tminus-client] Cannot send, not connected');
      return;
    }
    const msg = JSON.stringify({ type, payload, seq: this._nextSeq() });
    this.ws.send(msg);
  }

  _register() {
    this._send('REGISTER', {
      name: 'fleet-conductor',
      timbre: 'conductor',
      frequency: 1.0,
      latency_ms: 100,
      context_depth: 'medium',
    });
  }

  _subscribe() {
    this._send('SUBSCRIBE', {
      phase_groups: ['voice-real-time'],
    });
    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this._send('PING', {});
    }, 10000);
  }

  _handleMessage(msg) {
    const { type, payload } = msg;

    switch (type) {
      case 'REGISTERED':
        if (payload.phase_groups) {
          // SUBSCRIBE response
          if (!this._subscribed) {
            this._subscribed = true;
            console.log(`[tminus-client] Subscribed to ${payload.phase_groups.join(', ')}`);
            logEvent({ type: 'subscribed', agentId: this.agentId, phaseGroups: payload.phase_groups });
          }
        } else {
          // Initial REGISTER response
          this.agentId = payload.agent_id;
          console.log(`[tminus-client] Registered as ${this.agentId} (state: ${payload.state})`);
          this._subscribe();
        }
        break;

      case 'CUED':
        console.log(`[tminus-client] CUED from ${payload.source} (group: ${payload.phase_group})`);
        processCue(payload.source || 'tminus-dispatcher', payload.payload || {});
        break;

      case 'PRIMED':
        console.log(`[tminus-client] PRIMED from ${payload.source} (group: ${payload.phase_group})`);
        processCue(payload.source || 'tminus-dispatcher', payload.payload || {});
        break;

      case 'COMPLETE_ACK':
        // no-op
        break;

      case 'PHASE_ADVANCE':
        console.log(`[tminus-client] Phase advance: ${payload.group} → ${payload.point}`);
        break;

      case 'ERROR':
        console.error(`[tminus-client] Server error: ${payload.code} — ${payload.message}`);
        break;

      case 'PONG':
        break;

      default:
        console.log(`[tminus-client] Unknown message type: ${type}`);
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = 3000 + Math.random() * 2000;
    console.log(`[tminus-client] Reconnecting in ${Math.round(delay)}ms ...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.agentId = null;
  }
}

// ─── HTTP Server (Health, Agent Status, Port Registry) ────────────────
function createHttpServer(tminusClient) {
  return http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      // GET /health
      if (path === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          uptime_ms: process.uptime() * 1000,
          connected: tminusClient.connected,
          agentId: tminusClient.agentId,
          agentsTracked: agentStateCache.size,
          agentsOnline: Array.from(agentStateCache.values())
            .filter((a) => a.status === 'ok').length,
        }));
        return;
      }

      // GET /agents — fleet-midi agent status
      if (path === '/agents' && req.method === 'GET') {
        const agents = Array.from(agentStateCache.values()).map((a) => ({
          id: a.agentId,
          name: a.name,
          port: a.port,
          status: a.status,
          lastSeen: a.lastSeen,
          output: a.output,
          errorCount: a.errorCount,
          lastError: a.lastError,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ agents, count: agents.length }));
        return;
      }

      // GET /agents/:id — single agent detail
      const agentMatch = path.match(/^\/agents\/([a-z-]+)$/);
      if (agentMatch && req.method === 'GET') {
        const agentId = agentMatch[1];
        const agent = agentStateCache.get(agentId);
        const registry = AGENT_REGISTRY[agentId];
        if (!agent || !registry) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AGENT_NOT_FOUND', message: `Agent ${agentId} not found` }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...agent,
          roles: registry.roles,
          port: registry.port,
        }));
        return;
      }

      // POST /probe — ping a specific fleet-midi agent
      if (path === '/probe' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'INVALID_JSON' }));
            return;
          }
          const { agentId } = parsed;
          const agent = AGENT_REGISTRY[agentId];
          if (!agent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'AGENT_NOT_FOUND', message: `Unknown agent: ${agentId}` }));
            return;
          }
          const result = await forwardToAgent(agentId, { type: 'probe' }, 'fleet-conductor');
          if (result) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ agentId, status: 'ok', output: result }));
          } else {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ agentId, status: 'unreachable' }));
          }
        });
        return;
      }

      // POST /dispatch — manually dispatch a cue (bypass tminus)
      if (path === '/dispatch' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', async () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'INVALID_JSON' }));
            return;
          }
          const { source, payload } = parsed;
          if (!payload) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'MISSING_PAYLOAD' }));
            return;
          }
          await processCue(source || 'manual', payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', message: 'Cue dispatched to fleet-midi agents' }));
        });
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND', message: `Path ${path} not found` }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR', message: err.message }));
    }
  });
}

// ─── Periodic Agent Health Check ──────────────────────────────────────
// Every 15s, probe all fleet-midi agents that haven't been seen in 30s.
function startHealthCheck() {
  setInterval(async () => {
    const now = Date.now();
    for (const [agentId, cache] of agentStateCache) {
      if (cache.status === 'unknown' || (cache.lastSeen && (now - cache.lastSeen) > 30000)) {
        // Stale or unknown — probe
        if (cache.errorCount < 5 || (now - (cache.lastError ? cache.lastError.ts || 0 : 0)) > 60000) {
          await forwardToAgent(agentId, { type: 'probe' }, 'fleet-conductor');
        }
      }
    }
  }, 15000);
}

// ─── Periodic Registry Health Report ──────────────────────────────────
function logRegistryState() {
  setInterval(() => {
    const states = {};
    let ok = 0;
    let error = 0;
    let unknown = 0;
    for (const [, cache] of agentStateCache) {
      states[cache.name] = cache.status;
      if (cache.status === 'ok') ok++;
      else if (cache.status === 'error') error++;
      else unknown++;
    }
    logEvent({
      type: 'registry_health',
      total: agentStateCache.size,
      ok,
      error,
      unknown,
      states,
    });
  }, 60000);
}

// ─── Main ─────────────────────────────────────────────────────────────
function main() {
  initAgentStates();

  let tminusClient = null;
  let server = null;
  let wss = null;

  // ── Connect to tminus-dispatcher ──────────────────────────────────
  tminusClient = new TminusClient(TMINUS_WS_URL);
  tminusClient.connect();

  // ── HTTP + WebSocket Server (port 8769) ───────────────────────────
  const httpServer = createHttpServer(tminusClient);

  wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    console.log(`[ws] Client connected from ${req.socket.remoteAddress}`);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type, payload } = msg;

        switch (type) {
          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));
            break;
          case 'GET_AGENTS':
            ws.send(JSON.stringify({
              type: 'AGENTS',
              agents: Array.from(agentStateCache.values()),
            }));
            break;
          case 'GET_HEALTH':
            ws.send(JSON.stringify({
              type: 'HEALTH',
              connected: tminusClient.connected,
              uptime_ms: process.uptime() * 1000,
            }));
            break;
          default:
            // Unknown WS message — ignore
            break;
        }
      } catch (e) {
        // Bad JSON — ignore
      }
    });

    ws.on('close', () => {
      console.log('[ws] Client disconnected');
    });
  });

  server = httpServer.listen(CONDUCTOR_PORT, CONDUCTOR_HOST, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║     Fleet Conductor — v1.0.0                     ║');
    console.log('║     ' + new Date().toISOString() + '            ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  HTTP/WS  : http://${CONDUCTOR_HOST}:${CONDUCTOR_PORT}         ║`);
    console.log(`║  t-minus  : ${TMINUS_WS_URL}                     ║`);
    console.log(`║  Agents   : ${agentStateCache.size} fleet-midi agents          ║`);
    console.log(`║  Log      : ${LOG_PATH}    ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });

  // ── Background tasks ──────────────────────────────────────────────
  startHealthCheck();
  logRegistryState();

  // ── Graceful Shutdown ─────────────────────────────────────────────
  function shutdown(signal) {
    console.log(`\n⏹  ${signal}: Shutting down gracefully...`);
    logEvent({ type: 'shutdown', signal });

    if (tminusClient) tminusClient.disconnect();

    if (wss) {
      wss.close(() => {
        if (server) {
          server.close(() => {
            if (logStream) logStream.end();
            console.log('⏹  Conductor stopped.');
            process.exit(0);
          });
        }
      });
    } else {
      if (server) server.close(() => process.exit(0));
      else process.exit(0);
    }

    // Force exit after 5s
    setTimeout(() => {
      console.error('⏹  Force exit after timeout');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ─── Run ───────────────────────────────────────────────────────────────
main();
