'use strict';

const WebSocket = require('ws');
const http = require('http');
const { ShellAgent, TIMBRE_PRESETS } = require('./shell-agent.js');
const { SymmetryDetector } = require('./symmetry-detector.js');

/**
 * CompositeHeadspace — Two parallel headspaces running in stereoscopic cognition.
 * 
 * ℂ = ⟨headspaces[], crosstalkChannel, fusionMechanism, phaseDelta⟩
 * 
 * Two shells (typically bass/deep + treble/fast) operate on the same reasoning
 * problem with t-minus offset cueing. The coordinator detects divergence points
 * and produces synthetic insight.
 */
class CompositeHeadspace {
  /**
   * @param {Object} opts
   * @param {ShellAgent} opts.shellA - Deep architectural shell (bass)
   * @param {ShellAgent} opts.shellB - Fast pattern matcher (treble)
   * @param {string} [opts.fusionMechanism='harmonic_sum'] - Fusion strategy
   * @param {number} [opts.phaseDelta=0.3] - Intentional phase offset
   * @param {SymmetryDetector} [opts.detector] - Symmetry analysis engine
   * @param {Function} [opts.onABox] - Callback on each a-box emission
   */
  constructor(opts = {}) {
    this.shellA = opts.shellA;
    this.shellB = opts.shellB;
    this.fusionMechanism = opts.fusionMechanism || 'harmonic_sum';
    this.phaseDelta = opts.phaseDelta || 0.3;
    this.detector = opts.detector || new SymmetryDetector();
    this.onABox = opts.onABox || null;

    this.aBoxes = [];
    this.shellAResult = null;
    this.shellBResult = null;
    this.isRunning = false;
    this.currentTask = null;
    this.startTime = null;
  }

  /**
   * Run a reasoning task through the composite headspace.
   * 
   * Implements the t-minus cueing protocol:
   *   - Shell A (deep/slow) gets t-minus(5) — acts after 5 cognitive beats
   *   - Shell B (fast/light) gets t-minus(0) — acts immediately
   * 
   * @param {Object} task - ReasoningTask
   * @returns {Promise<Object>} The symmetry analysis
   */
  async runTask(task) {
    if (this.isRunning) {
      throw new Error('Composite headspace is already running a task');
    }

    this.isRunning = true;
    this.currentTask = task;
    this.startTime = Date.now();

    // Assign task to both shells
    this._cueShell(this.shellA, task);
    this._cueShell(this.shellB, task);

    // Cue shell A with t-minus 5 (deep reasoning needs a head start)
    // Cue shell B with t-minus 0 (fast response starts immediately)
    const shellAPromise = this._cueWithTMinus(this.shellA, task, 5, 'deep-alignment');
    const shellBPromise = this._cueWithTMinus(this.shellB, task, 0, 'rapid-alignment');

    console.log('\n  🎼 ===== COMPOSITE HEADSPACE ACTIVE =====');
    console.log(`  🎵 Shell A: ${this.shellA.id} @ ${this.shellA.frequency} (t-minus 5)`);
    console.log(`  🎵 Shell B: ${this.shellB.id} @ ${this.shellB.frequency} (t-minus 0)`);
    console.log(`  🧩 Fusion: ${this.fusionMechanism}, Phase Delta: ${this.phaseDelta}`);
    console.log(`  📋 Task: ${task.prompt.substring(0, 80)}...\n`);

    try {
      // Wait for both shells to complete
      const [aBoxA, aBoxB] = await Promise.all([shellAPromise, shellBPromise]);

      this.shellAResult = aBoxA;
      this.shellBResult = aBoxB;

      this.aBoxes.push(aBoxA, aBoxB);
      if (this.onABox) {
        this.onABox(aBoxA);
        this.onABox(aBoxB);
      }

      // Run symmetry analysis
      console.log('\n  🔬 ===== SYMMETRY ANALYSIS =====');
      const report = this.detector.generateReport(aBoxA, aBoxB, task);
      
      const elapsed = Date.now() - this.startTime;
      this.isRunning = false;

      return {
        report,
        shellA: aBoxA,
        shellB: aBoxB,
        elapsedMs: elapsed,
        headspaceState: this.getState(),
      };
    } catch (err) {
      this.isRunning = false;
      throw err;
    }
  }

  /**
   * Cue a shell with t-minus timing.
   * 
   * @param {ShellAgent} shell
   * @param {Object} task
   * @param {number} beats - Cognitive beats before action
   * @param {string} alignmentPoint
   * @returns {Promise<Object>} The emitted a-box
   */
  _cueWithTMinus(shell, task, beats, alignmentPoint) {
    return new Promise((resolve) => {
      // Assign the task to the shell
      if (shell.ws && shell.ws.readyState === WebSocket.OPEN) {
        shell._send({
          type: 'task-assign',
          task: { id: task.id, prompt: task.prompt, type: task.type },
        });
      }
      shell.taskResults = { task, startedAt: Date.now() };

      // Send t-minus cue
      if (shell.ws && shell.ws.readyState === WebSocket.OPEN) {
        shell._send({
          type: 't-minus',
          target: shell.id,
          beats,
          alignmentPoint,
        });
      }

      shell._onTMinus({ target: shell.id, beats, alignmentPoint });

      // Wait for reasoning to complete
      setTimeout(() => {
        shell.reason(task, (aBox) => {
          resolve(aBox);
        });
      }, Math.max(0, beats * shell.band.latencyMs));
    });
  }

  /**
   * Send a t-minus cue to a shell without awaiting result.
   * @param {ShellAgent} shell
   * @param {Object} task
   */
  _cueShell(shell, task) {
    if (shell.ws && shell.ws.readyState === WebSocket.OPEN) {
      shell._send({
        type: 'task-assign',
        task: { id: task.id, prompt: task.prompt, type: task.type },
      });
    }
    shell.taskResults = { task, startedAt: Date.now() };
  }

  /**
   * Get the current headspace waveform state.
   * @returns {Object}
   */
  getState() {
    return {
      shells: [
        { id: this.shellA.id, frequency: this.shellA.frequency, resonance: this.shellA.currentResonance },
        { id: this.shellB.id, frequency: this.shellB.frequency, resonance: this.shellB.currentResonance },
      ],
      aBoxCount: this.aBoxes.length,
      fusionMechanism: this.fusionMechanism,
      phaseDelta: this.phaseDelta,
      isRunning: this.isRunning,
      convergenceScore: this.detector.convergenceScore,
    };
  }

  /**
   * Get the waveform (Ψ) — amplitude projection over time.
   * @returns {Array}
   */
  getWaveform() {
    return this.aBoxes.map((box, i) => ({
      index: i,
      time: box.timestamp,
      amplitude: box.resonance,
      shellId: box.shellId,
      frequency: box.frequency,
    }));
  }

  /**
   * Get the mix (Ξ) — weighted sum of waveforms.
   * @returns {Object}
   */
  getMix() {
    const waveA = this.aBoxes.filter(b => b.shellId === this.shellA?.id);
    const waveB = this.aBoxes.filter(b => b.shellId === this.shellB?.id);

    return {
      shellA: {
        count: waveA.length,
        averageResonance: waveA.reduce((s, b) => s + b.resonance, 0) / Math.max(1, waveA.length),
        weight: 0.6, // Deep reasoning gets higher weight in mix
      },
      shellB: {
        count: waveB.length,
        averageResonance: waveB.reduce((s, b) => s + b.resonance, 0) / Math.max(1, waveB.length),
        weight: 0.4,
      },
    };
  }

  /**
   * Cross-illuminate — share a-boxes between shells for stereo effect.
   */
  crossIlluminate() {
    if (this.shellAResult && this.shellBResult) {
      this.shellA.broadcast(`Cross-link from Shell B: ${this.shellBResult.content.substring(0, 100)}...`);
      this.shellB.broadcast(`Cross-link from Shell A: ${this.shellAResult.content.substring(0, 100)}...`);
    }
  }

  /**
   * Disconnect both shells.
   */
  disconnect() {
    this.shellA?.disconnect();
    this.shellB?.disconnect();
  }
}

/**
 * Coordinator — The Conductor that manages the t-minus dispatcher and Composite Headspaces.
 * 
 * In the Symphony of Shells, the Conductor does not tell instruments WHAT to do,
 * but WHEN and at what FREQUENCY to resonate.
 */
class Coordinator {
  /**
   * @param {Object} opts
   * @param {number} [opts.port=9090] - WebSocket dispatcher port
   * @param {string} [opts.detectorMode='simple'] - 'simple'|'deep'
   */
  constructor(opts = {}) {
    this.port = opts.port || 9090;
    this.detectorMode = opts.detectorMode || 'simple';
    this.server = null;
    this.wss = null;
    this.headspaces = [];
    this.clients = new Map();
    this.isRunning = false;
  }

  /**
   * Start the t-minus WebSocket dispatcher.
   * @returns {Promise<void>}
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer();
      this.wss = new WebSocket.Server({ server: this.server });

      this.wss.on('connection', (ws, req) => {
        const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        this.clients.set(clientId, ws);

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            this._routeMessage(msg, clientId, ws);
          } catch (err) {
            console.error(`  ❌ Bad message from ${clientId}: ${err.message}`);
          }
        });

        ws.on('close', () => {
          this.clients.delete(clientId);
        });

        // Send welcome
        ws.send(JSON.stringify({
          type: 'welcome',
          clientId,
          server: 'composite-headspace-coordinator',
          protocol: 't-minus-v1',
          message: 'Connected to Symphony of Shells t-minus dispatcher',
        }));
      });

      this.wss.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, () => {
        this.isRunning = true;
        console.log(`\n  🎼 T-Minus Dispatcher listening on ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Route incoming messages to appropriate handlers.
   * @param {Object} msg
   * @param {string} clientId
   * @param {WebSocket} ws
   */
  _routeMessage(msg, clientId, ws) {
    switch (msg.type) {
      case 'shell-register':
        this._onShellRegister(msg, clientId, ws);
        break;
      case 'a-box':
        this._onABox(msg);
        break;
      case 'shell-broadcast':
        this._broadcast(msg, clientId);
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${msg.type}`,
        }));
    }
  }

  /**
   * Handle shell registration.
   * @param {Object} msg
   * @param {string} clientId
   * @param {WebSocket} ws
   */
  _onShellRegister(msg, clientId, ws) {
    console.log(`  🐚 Shell registered: ${msg.shellId} (${msg.frequency} @ track ${msg.track})`);
    ws.send(JSON.stringify({
      type: 'registered',
      shellId: msg.shellId,
      track: msg.track,
    }));
  }

  /**
   * Handle a-box emission.
   * @param {Object} msg
   */
  _onABox(msg) {
    const { shellId, aBox } = msg;
    console.log(`  ▣ a-box from ${shellId} — resonance: ${aBox.resonance?.toFixed(3)}, freq: ${aBox.frequency}`);
  }

  /**
   * Broadcast a message to all clients except the sender.
   * @param {Object} msg
   * @param {string} senderId
   */
  _broadcast(msg, senderId) {
    for (const [id, ws] of this.clients) {
      if (id !== senderId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  /**
   * Create a composite headspace with two shells.
   * 
   * @param {Object} [shellAConfig] - Configuration for Shell A (deep/bass)
   * @param {Object} [shellBConfig] - Configuration for Shell B (fast/treble)
   * @returns {CompositeHeadspace}
   */
  createCompositeHeadspace(shellAConfig = {}, shellBConfig = {}) {
    const shellA = new ShellAgent({
      id: shellAConfig.id || 'shell-alpha',
      timbre: shellAConfig.timbre || TIMBRE_PRESETS['deep-architect'],
      frequency: shellAConfig.frequency || 'bass',
      track: shellAConfig.track || 1,
      tminusUrl: `ws://localhost:${this.port}`,
    });

    const shellB = new ShellAgent({
      id: shellBConfig.id || 'shell-beta',
      timbre: shellBConfig.timbre || TIMBRE_PRESETS['fast-pattern-matcher'],
      frequency: shellBConfig.frequency || 'treble',
      track: shellBConfig.track || 2,
      tminusUrl: `ws://localhost:${this.port}`,
    });

    const headspace = new CompositeHeadspace({
      shellA,
      shellB,
      fusionMechanism: 'harmonic_sum',
      phaseDelta: 0.3,
      detector: new SymmetryDetector({ mode: this.detectorMode }),
    });

    this.headspaces.push(headspace);
    return headspace;
  }

  /**
   * Stop the coordinator and clean up.
   */
  async stop() {
    for (const hs of this.headspaces) {
      hs.disconnect();
    }
    this.headspaces = [];

    if (this.wss) {
      for (const [, ws] of this.clients) {
        ws.close();
      }
      this.clients.clear();
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          console.log('  🎼 T-Minus Dispatcher stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Broadcast a t-minus cue to all connected shells.
   * @param {number} beats
   * @param {string} [target]
   * @param {string} [alignmentPoint]
   */
  broadcastTMinus(beats, target, alignmentPoint) {
    const msg = JSON.stringify({
      type: 't-minus',
      target: target || 'all',
      beats,
      alignmentPoint: alignmentPoint || 'global-alignment',
    });
    for (const [, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }
}

module.exports = { Coordinator, CompositeHeadspace };
