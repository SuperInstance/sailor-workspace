/**
 * Ghost Track WebSocket Bridge Server
 * 
 * Bridges browser Prosody Bridge → tminus-dispatcher via WebSocket.
 * 
 * Architecture:
 *   Browser (mic → MIDI CC) ──WS──→ Ghost Track Bridge ──IPC──→ tminus-dispatcher
 *                                        ↓                        ↓
 *                                   Session state            CueBuffer
 *                                   Ghost tracks             Ghost predictions
 *                                   CR monitoring            Reharmonization
 *                                   Session capture (.mid)   Pivot tables
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Reharmonizer from './reharmonizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8767', 10);
const SESSIONS_DIR = join(__dirname, '..', 'sessions');

// Ensure sessions directory exists
if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });

// ─── MIDI Note Names ───
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiName(note) {
  return NOTE_NAMES[note % 12] + Math.floor(note / 12) - 1;
}

// ─── Ghost Track Engine ───
class GhostTrackEngine {
  constructor() {
    this.reset();
    this.reharmonizer = new Reharmonizer();
    this.agentFeedback = [];
    this.accumulatorDelta = 0;
  }

  reset() {
    this.T0 = null;       // Current note
    this.T1 = [];         // Predicted next 4 beats
    this.T2 = [];         // Predicted next measure (16 beats)
    this.T3 = [];         // Predicted next section
    this.T4 = [];         // Full form structure
    this.lastNote = 60;   // Last MIDI note played
    this.lastTrit = 0;    // Last ternary classification
    this.lastVelocity = 0;
    this.conservationRatios = [];
    this.cr = 0.5;        // Current CR (0-1)
    this.history = [];    // Note history for pattern matching
    this.surpriseEvents = 0;
    this.totalEvents = 0;
    this.pivotCount = 0;
    this.sessionStart = Date.now();
  }

  /**
   * Process incoming MIDI note data from the Prosody Bridge.
   * Returns ghost track predictions.
   */
  processNote(note, velocity, trit, bpm, ccData) {
    this.totalEvents++;
    
    // Store current note
    this.T0 = { note, velocity, trit, bpm, ccData, time: Date.now() };
    
    // Build history (last 32 notes for pattern matching)
    this.history.push(note);
    if (this.history.length > 32) this.history.shift();

    // Accumulator invariant: predicted next = lastNote + lastTrit * 4
    const predictedNote = this.lastNote + this.lastTrit * 4;
    const actualDiff = note - this.lastNote;
    
    // Conservation Ratio: CR = 1 - |actual - predicted| / maxError
    const maxError = 24; // 2 octaves
    const error = Math.abs(actualDiff - predictedNote);
    const cr = Math.max(0, Math.min(1, 1 - error / maxError));
    this.cr = cr;
    this.conservationRatios.push(cr);
    if (this.conservationRatios.length > 100) this.conservationRatios.shift();

    // Detect surprise events → trigger reharmonization
    if (cr < 0.7) {
      this.surpriseEvents++;
      this.pivotCount++;
      const avgCR = this.conservationRatios.length > 0
        ? this.conservationRatios.reduce((a,b) => a+b, 0) / this.conservationRatios.length
        : cr;
      const reharmPlan = this.reharmonizer.evaluate(cr, [trit, 0, 0], note, avgCR);
      if (reharmPlan) {
        this.activeReharm = reharmPlan;
        console.log(`  🔄 REHARM: ${reharmPlan.label} (shift ${reharmPlan.shift}, conf ${reharmPlan.confidence})`);
      }
    }

    // Update ghost track predictions
    this.updateGhostTracks(note, velocity, trit, bpm);
    
    // Store for next iteration
    this.lastNote = note;
    this.lastTrit = trit;
    this.lastVelocity = velocity;

    return this.getGhostTrackState();
  }

  /**
   * Process agent feedback — update accumulator.
   * Called when fleet conductor forwards agent ternary vectors back here.
   */
  processFeedback(feedback) {
    this.agentFeedback.push({...feedback, receivedAt: Date.now()});
    if (this.agentFeedback.length > 32) this.agentFeedback.shift();
    if (feedback.ternary_vector && feedback.ternary_vector.length >= 1) {
      const trit = feedback.ternary_vector[0];
      const predicted = this.lastTrit * 4;
      const actual = trit * 4;
      this.accumulatorDelta += (actual - predicted);
    }
    return {
      accumulatorDelta: this.accumulatorDelta,
      agentFeedbackCount: this.agentFeedback.length,
      closedGesture: Math.abs(this.accumulatorDelta) < 2
    };
  }

  /**
   * Update T-1 through T-4 ghost tracks based on current state.
   */
  updateGhostTracks(note, velocity, trit, bpm) {
    const beatsPerSecond = bpm / 60;
    
    // T-1: Next 4 beats (micro-prediction)
    this.T1 = this.generatePath(note, trit, 4, bpm);
    
    // T-2: Next measure (pattern-based)
    this.T2 = this.generatePath(note, trit, 16, bpm);
    
    // T-3: Next section (harmonic progression)
    const sectionSize = Math.max(4, Math.floor(beatsPerSecond * 4));
    this.T3 = this.generatePath(note, trit, sectionSize, bpm);
    
    // T-4: Full form
    this.T4 = this.generatePath(note, trit, sectionSize * 2, bpm);
  }

  /**
   * Generate a ghost track path from current state.
   * Uses ternary accumulator for harmonic progression.
   */
  generatePath(startNote, startTrit, length, bpm) {
    const path = [];
    let currentNote = startNote;
    let currentTrit = startTrit;
    
    for (let i = 0; i < length; i++) {
      // Apply accumulator invariant
      currentNote += currentTrit * 4;
      
      // Clamp to MIDI range
      if (currentNote < 24) { currentNote = 36; currentTrit = 1; }
      if (currentNote > 108) { currentNote = 96; currentTrit = -1; }
      
      // Ternary drift: trit tends toward +1 (agreement) over time
      // unless CR is low (surprise → flips toward 0)
      if (this.cr < 0.5) {
        currentTrit = currentTrit === 1 ? -1 : (currentTrit === -1 ? 1 : 0);
      } else {
        // Drift toward +1 in high-agreement contexts
        currentTrit = currentTrit === -1 ? 0 : (currentTrit === 0 ? 1 : 1);
      }
      
      path.push({
        note: currentNote,
        noteName: midiName(currentNote),
        trit: currentTrit,
        beat: i,
        timeMs: Math.round((i / (bpm / 60)) * 1000)
      });
    }
    
    return path;
  }

  /**
   * Get current ghost track state for serialization.
   */
  getGhostTrackState() {
    return {
      T0: this.T0,
      T1: this.T1,
      T2: this.T2,
      T3: this.T3,
      T4: this.T4,
      cr: Math.round(this.cr * 1000) / 1000,
      surprise: Math.round((1 - this.cr) * 1000) / 1000,
      surpriseRate: this.totalEvents > 0 
        ? Math.round((this.surpriseEvents / this.totalEvents) * 1000) / 10 
        : 0,
      pivotCount: this.pivotCount,
      totalEvents: this.totalEvents,
      sessionDuration: Date.now() - this.sessionStart
    };
  }

  /**
   * Get the session data for MIDI file capture.
   */
  getSessionData() {
    return {
      sessionStart: this.sessionStart,
      duration: Date.now() - this.sessionStart,
      totalEvents: this.totalEvents,
      surpriseEvents: this.surpriseEvents,
      pivotCount: this.pivotCount,
      averageCR: this.conservationRatios.length > 0
        ? Math.round((this.conservationRatios.reduce((a,b) => a+b, 0) / this.conservationRatios.length) * 1000) / 1000
        : 0,
      history: this.history,
      lastState: this.getGhostTrackState()
    };
  }
}

// ─── Session Manager ───
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createSession() {
    const id = `ghost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const session = {
      id,
      engine: new GhostTrackEngine(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      ccHistory: [],
      noteHistory: []
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  getOrCreate(id) {
    let session = this.sessions.get(id);
    if (!session) {
      session = this.createSession();
    }
    return session;
  }

  removeSession(id) {
    const session = this.sessions.get(id);
    if (session) {
      this.saveSessionCapture(session);
    }
    this.sessions.delete(id);
  }

  saveSessionCapture(session) {
    const data = session.engine.getSessionData();
    const filename = `session-${session.id}-${new Date().toISOString().slice(0, 19).replace(/:/g,'-')}.json`;
    const path = join(SESSIONS_DIR, filename);
    appendFile(path, JSON.stringify(data, null, 2)).catch(() => {});
    console.log(`  📝 Session captured: ${filename}`);
  }
}

// ─── HTTP Server (for health checks & session list) ───
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      uptime: process.uptime(),
      sessions: sessionManager.sessions.size
    }));
  } else if (req.url === '/sessions') {
    const sessions = Array.from(sessionManager.sessions.values()).map(s => ({
      id: s.id,
      duration: Date.now() - s.startTime,
      events: s.engine.totalEvents,
      cr: s.engine.cr
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions, null, 2));
  } else if (req.url.startsWith('/session/')) {
    const id = req.url.slice(9);
    const session = sessionManager.getSession(id);
    if (session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session.engine.getGhostTrackState(), null, 2));
    } else {
      res.writeHead(404);
      res.end('Session not found');
    }
  } else if (req.url === '/feedback' && req.method === 'POST') {
    // Accept agent feedback via HTTP (used by fleet conductor)
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const feedback = JSON.parse(body);
        // Find session or use first available
        const sessions = Array.from(sessionManager.sessions.values());
        if (sessions.length > 0 && sessions[0].engine.processFeedback) {
          const result = sessions[0].engine.processFeedback(feedback);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active session' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else if (req.url === '/reharmonize' && req.method === 'GET') {
    const sessions = Array.from(sessionManager.sessions.values()).map(s => ({
      id: s.id,
      reharmonizer: s.engine.reharmonizer?.getState() || null,
      activeReharm: s.engine.activeReharm || null,
      accumulatorDelta: s.engine.accumulatorDelta
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions, null, 2));
  } else if (req.url === '/accumulator' && req.method === 'GET') {
    const sessions = Array.from(sessionManager.sessions.values()).map(s => ({
      id: s.id,
      accumulatorDelta: s.engine.accumulatorDelta,
      agentFeedbackCount: s.engine.agentFeedback.length,
      lastFeedback: s.engine.agentFeedback[s.engine.agentFeedback.length - 1] || null
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions, null, 2));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Ghost Track Bridge\n');
  }
});

// ─── WebSocket Server ───
const wss = new WebSocketServer({ server: httpServer });
const sessionManager = new SessionManager();

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const session = sessionManager.createSession();
  console.log(`  🔗 Client connected from ${clientIp} → session ${session.id}`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      session.lastActivity = Date.now();
      
      switch (msg.type) {
        case 'feedback': {
          // Agent feedback from fleet conductor — update accumulator
          if (session.engine.processFeedback) {
            const result = session.engine.processFeedback(msg.feedback || msg);
            ws.send(JSON.stringify({
              type: 'feedback_ack',
              sessionId: session.id,
              accumulatorDelta: result.accumulatorDelta,
              closedGesture: result.closedGesture
            }));
          }
          break;
        }

        case 'midi': {
          const { note, velocity, trit, bpm, cc } = msg;
          session.ccHistory.push({ ...cc, time: Date.now() });
          session.noteHistory.push({ note, velocity, trit, time: Date.now() });
          
          // Process through ghost engine
          const ghostState = session.engine.processNote(
            note, velocity, trit, bpm || 90, cc
          );
          
          // Build response with reharmonization plan if active
          const reharm = session.engine.activeReharm;
          const response = {
            type: 'ghost',
            sessionId: session.id,
            data: ghostState
          };
          if (reharm && Date.now() - (session.engine.reharmonizer?.lastPivotTime || 0) < 500) {
            response.reharmonization = {
              active: true,
              shift: reharm.shift,
              label: reharm.label,
              confidence: reharm.confidence,
              alternateTrits: reharm.alternateTrits
            };
          }
          ws.send(JSON.stringify(response));
          break;
        }

        case 'config': {
          // Update session config
          if (msg.sensitivity) session.sensitivity = msg.sensitivity;
          if (msg.baseNote) session.baseNote = msg.baseNote;
          if (msg.maxNotes) session.maxNotes = msg.maxNotes;
          
          ws.send(JSON.stringify({
            type: 'config_ack',
            sessionId: session.id,
            config: {
              sensitivity: session.sensitivity,
              baseNote: session.baseNote,
              maxNotes: session.maxNotes
            }
          }));
          break;
        }

        case 'ping': {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            sessionId: session.id, 
            time: Date.now() 
          }));
          break;
        }

        case 'resync': {
          // Client wants full state after disconnect
          ws.send(JSON.stringify({
            type: 'state_sync',
            sessionId: session.id,
            data: session.engine.getGhostTrackState(),
            session: session.engine.getSessionData()
          }));
          break;
        }

        default:
          console.log(`  ⚠ Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      console.error(`  ❌ Message error: ${err.message}`);
    }
  });

  ws.on('close', () => {
    console.log(`  🔌 Client ${session.id} disconnected`);
    sessionManager.saveSessionCapture(session);
    sessionManager.sessions.delete(session.id);
  });

  ws.on('error', (err) => {
    console.error(`  ❌ WebSocket error: ${err.message}`);
  });

  // Send welcome message with session ID
  ws.send(JSON.stringify({
    type: 'welcome',
    sessionId: session.id,
    server: 'ghost-track-bridge',
    version: '0.1.0',
    config: {
      ghostTracks: ['T0', 'T1', 'T2', 'T3', 'T4'],
      accumulator: 'Δ = trit * 4',
      crThreshold: 0.7,
      reharmonizeOn: 'CR < 0.7'
    }
  }));
});

// ─── Start ───
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║    👻 Ghost Track Bridge v0.1.0          ║
║    ${new Date().toISOString()}            ║
║                                          ║
║    WebSocket :${PORT}                      ║
║    HTTP      :${PORT} (health: /health)    ║
║    Sessions  :${SESSIONS_DIR}              ║
╚══════════════════════════════════════════╝
  `);
});

// ─── Graceful shutdown ───
process.on('SIGINT', () => {
  console.log('\n  Shutting down...');
  // Save all active sessions
  for (const [id, session] of sessionManager.sessions) {
    sessionManager.saveSessionCapture(session);
  }
  wss.close(() => {
    httpServer.close(() => {
      console.log('  👋 Goodbye');
      process.exit(0);
    });
  });
});
