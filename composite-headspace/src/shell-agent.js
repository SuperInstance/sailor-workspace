'use strict';

const WebSocket = require('ws');
const crypto = require('crypto');

/**
 * Frequency band definitions from the Symphony of Shells spec.
 */
const FREQUENCY_BANDS = {
  'sub-bass':  { min: 0.001, max: 0.01,  label: 'Sub-bass (Deep Contemplative)',   latencyMs: 3000 },
  'bass':      { min: 0.01,  max: 0.1,   label: 'Bass (Slow Reasoning)',            latencyMs: 1500 },
  'mid':       { min: 0.1,   max: 1,     label: 'Mid (Conversational)',             latencyMs: 600  },
  'treble':    { min: 1,     max: 10,    label: 'Treble (Rapid Response)',          latencyMs: 200  },
  'ultrasonic':{ min: 10,    max: 100,   label: 'Ultrasonic (Reflexive)',           latencyMs: 50   },
};

/**
 * Timbre presets for common shell configurations.
 * Timbre = hardware + model characteristics defining a shell's "voice."
 */
const TIMBRE_PRESETS = {
  'deep-architect': {
    modelFamily: 'deepseek-v4-pro',
    tokenBudget: 128000,
    latencyProfile: 'high-latency-deep-reasoning',
    parameterCount: '~685B',
    systemPromptPhase: 'architectural-invariants',
    description: 'Deep architectural reasoning — bass frequency specialist',
  },
  'fast-pattern-matcher': {
    modelFamily: 'deepseek-v4-flash',
    tokenBudget: 32000,
    latencyProfile: 'low-latency-rapid-inference',
    parameterCount: '~27B',
    systemPromptPhase: 'pattern-recognition-rapid',
    description: 'Fast pattern matching — treble frequency specialist',
  },
  'balanced-critic': {
    modelFamily: 'gpt-4o',
    tokenBudget: 64000,
    latencyProfile: 'medium-latency',
    parameterCount: '~200B',
    systemPromptPhase: 'critical-analysis',
    description: 'Balanced analysis — mid frequency generalist',
  },
};

/**
 * ShellAgent — A cognitive agent that operates within the Symphony of Shells DAW.
 * 
 * Each shell has:
 *   - An identity (id)
 *   - A cognitive timbre (model/hardware characteristics)
 *   - A frequency band (operating speed)
 *   - A DAW track assignment
 *   - A connection to the t-minus dispatcher
 */
class ShellAgent {
  /**
   * @param {Object} opts
   * @param {string} opts.id - Unique shell identifier
   * @param {Object} opts.timbre - Cognitive timbre (model/hardware characteristics)
   * @param {string} opts.frequency - Frequency band: sub-bass|bass|mid|treble|ultrasonic
   * @param {number} opts.track - DAW track number
   * @param {string} opts.tminusUrl - WebSocket URL of the t-minus dispatcher
   */
  constructor(opts = {}) {
    this.id = opts.id || `shell-${crypto.randomUUID().slice(0, 8)}`;
    this.timbre = opts.timbre || TIMBRE_PRESETS['deep-architect'];
    this.frequency = opts.frequency || 'mid';
    this.track = opts.track || 0;
    this.tminusUrl = opts.tminusUrl || 'ws://localhost:9090';
    this.ws = null;
    this.phase = 'initializing';
    this.aBoxes = [];
    this.taskResults = null;
    this.resonanceHistory = [];
    this.currentResonance = 0.5;
    this.cueCountdown = 0;
    this.cueTarget = null;

    // Resolve frequency band
    this.band = FREQUENCY_BANDS[this.frequency] || FREQUENCY_BANDS.mid;
  }

  /**
   * Connect to the t-minus WebSocket dispatcher.
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Shell ${this.id} connection timed out`));
      }, 5000);

      this.ws = new WebSocket(this.tminusUrl);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.phase = 'listening';
        this._log(`Connected to t-minus dispatcher on track ${this.track}`);
        
        // Register identity with dispatcher
        this._send({
          type: 'shell-register',
          shellId: this.id,
          frequency: this.frequency,
          track: this.track,
          timbre: this.timbre.modelFamily,
        });
        
        resolve();
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this._handleMessage(msg);
        } catch (err) {
          this._log(`Bad message: ${err.message}`);
        }
      });

      this.ws.on('close', () => {
        this.phase = 'disconnected';
        this._log('Disconnected from dispatcher');
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        this.phase = 'error';
        reject(err);
      });
    });
  }

  /**
   * Handle incoming dispatcher messages.
   * @param {Object} msg
   */
  _handleMessage(msg) {
    switch (msg.type) {
      case 't-minus':
        this._onTMinus(msg);
        break;
      case 'task-assign':
        this._onTaskAssign(msg);
        break;
      case 'ping':
        this._send({ type: 'pong', shellId: this.id });
        break;
      case 'shell-broadcast':
        // Cross-shell communication
        if (msg.from !== this.id) {
          this._log(`Cross-shell <- ${msg.from}: ${msg.content?.substring(0, 80)}...`);
          this.aBoxes.push({
            id: `cross-${Date.now()}`,
            from: msg.from,
            content: msg.content,
            timestamp: Date.now(),
            type: 'cross-link',
          });
        }
        break;
      case 'welcome':
      case 'registered':
      case 'error':
      case 'pong':
        // Protocol messages — handled silently
        break;
      default:
        this._log(`Unknown message type: ${msg.type}`);
    }
  }

  /**
   * Handle a t-minus cue.
   * 
   * t-minus(shell, n) means "act in n cognitive beats before alignment point P"
   * Negative t-minus means pre-cued and already delivering.
   * 
   * @param {Object} msg - { type:'t-minus', target, beats, alignmentPoint }
   */
  _onTMinus(msg) {
    const { target, beats, alignmentPoint } = msg;
    
    if (target && target !== this.id) return;
    
    this.cueCountdown = beats;
    this.cueTarget = alignmentPoint || 'alignment';

    const beatMs = this.band.latencyMs;
    const delay = Math.max(0, beats * beatMs);

    this._log(`🎵 t-minus(${this.id}, ${beats}) — acting in ~${delay}ms`);

    if (delay === 0) {
      this._executeCue(alignmentPoint);
      return;
    }

    // Count down phase
    this.phase = 'reasoning';
    setTimeout(() => {
      this._executeCue(alignmentPoint);
    }, delay);
  }

  /**
   * Execute the cued reasoning action.
   * @param {string} alignmentPoint
   */
  _executeCue(alignmentPoint) {
    this.phase = 'emitting';
    this._log(`⚡ Executing cue — alignment: ${alignmentPoint}`);

    if (this.taskResults) {
      this.reason(this.taskResults.task, (aBox) => {
        aBox.alignmentPoint = alignmentPoint;
        aBox.cueDepth = this.cueCountdown;
        this._send({ type: 'a-box', shellId: this.id, aBox });
        this.aBoxes.push(aBox);
        this._updateResonance(aBox);
      });
    }
  }

  /**
   * Handle a task assignment from the coordinator.
   * @param {Object} msg
   */
  _onTaskAssign(msg) {
    this.taskResults = { task: msg.task, startedAt: Date.now() };
    this._log(`📋 Assigned task: ${msg.task.prompt?.substring(0, 60)}...`);
  }

  /**
   * Perform cognitive reasoning on a task.
   * 
   * Shell A (bass) does deep architectural reasoning — slow, thorough.
   * Shell B (treble) does fast pattern matching — quick, pattern-first.
   * 
   * @param {Object} task - ReasoningTask instance
   * @param {Function} [callback] - Called with the resulting a-box
   * @returns {Promise<Object>} The emitted a-box with reasoning content
   */
  reason(task, callback) {
    return new Promise((resolve) => {
      this.phase = 'reasoning';
      
      // Reasoning time scales with frequency band
      const reasoningTime = this.band.latencyMs * (1 + Math.random() * 0.5);

      this._log(`🧠 Reasoning (${this.frequency}, ~${reasoningTime}ms)...`);

      setTimeout(() => {
        const aBox = this._generateABox(task);
        this.phase = 'emitting';
        this.taskResults = {
          ...this.taskResults,
          aBox,
          completedAt: Date.now(),
          elapsedMs: Date.now() - (this.taskResults?.startedAt || Date.now()),
        };

        if (callback) callback(aBox);
        resolve(aBox);
      }, reasoningTime);
    });
  }

  /**
   * Generate a cognitive a-box (cognitive artifact) based on the task and shell type.
   * 
   * Shell A (bass/deep): produces structured architectural analysis with trade-off matrices
   * Shell B (treble/fast): produces rapid pattern recognition with analogies
   * 
   * @param {Object} task
   * @returns {Object} a-box
   */
  _generateABox(task) {
    const isDeep = this.frequency === 'bass' || this.frequency === 'sub-bass';
    const prompt = task.prompt || '';

    let content;
    let resonance = 0.5 + Math.random() * 0.3;

    if (isDeep) {
      // Deep architectural reasoning — structured, layered, first-principles
      content = this._architecturalAnalysis(prompt);
      resonance = 0.4 + Math.random() * 0.4;
    } else {
      // Fast pattern matching — analogies, metaphors, pattern extraction
      content = this._patternAnalysis(prompt);
      resonance = 0.5 + Math.random() * 0.4;
    }

    return {
      id: `abox-${crypto.randomUUID().slice(0, 8)}`,
      shellId: this.id,
      frequency: this.frequency,
      track: this.track,
      timbre: this.timbre.modelFamily,
      resonance: Math.min(0.99, resonance),
      timestamp: Date.now(),
      cognitiveBeat: Math.floor(Date.now() / this.band.latencyMs),
      type: isDeep ? 'architectural-analysis' : 'pattern-analysis',
      content,
      parentLinks: [],
      phase: 'active',
    };
  }

  /**
   * Generate deep architectural reasoning content.
   * @param {string} prompt
   * @returns {string}
   */
  _architecturalAnalysis(prompt) {
    const layers = [
      `**First-Principles Analysis**\nExamining the fundamental constraints of the problem. The core invariant is: what cannot be compromised? In any system design, identifying the non-negotiable constraints is the first act of architectural reasoning.`,
      `**Trade-Off Matrix**\nEach design choice creates a constraint surface. The key dimensions to optimize across are:\n1. Consistency vs Availability (CAP)\n2. Latency vs Throughput\n3. Development velocity vs Operational stability\n4. Coupling vs Cohesion`,
      `**Temporal Dynamics**\nSystems evolve. The second-order effects of today's decisions create tomorrow's constraints. A design that optimizes for current requirements without considering the trajectory of those requirements is already legacy.`,
      `**Invariant Identification**\nThe true invariants in this problem space are:\n- Data must eventually converge\n- Failure is inevitable, not exceptional\n- Developer cognitive load is the scarce resource\n- Abstractions leak, but necessary abstractions are worth the leak`,
    ];

    const insight = [
      'The optimal solution exists at the intersection of mathematical constraints and human cognitive limits.',
      'True architectural elegance is proportional to the number of things you deliberately choose NOT to handle.',
      'Every distributed system eventually tells the truth about consistency — the question is whether you are listening when it does.',
      'The best trade-off is the one that minimizes regret over the system\'s lifetime, not the one that maximizes peak performance.',
    ];

    const selectedInsight = insight[Math.floor(Math.random() * insight.length)];
    const selectedLayers = layers.slice(0, 2 + Math.floor(Math.random() * 2));

    return `
## 🏛️ Architectural Analysis (${this.frequency} band)

**Prompt:** ${prompt.substring(0, 200)}...

### Analysis
${selectedLayers.map(l => l + '\n').join('\n')}

### Synthetic Insight
${selectedInsight}

### Resonance State
Current: ${(0.5 + Math.random() * 0.4).toFixed(2)}
This analysis operates at sub-bass frequency — slow, foundational, seeking invariants.`;
  }

  /**
   * Generate fast pattern-matching content.
   * @param {string} prompt
   * @returns {string}
   */
  _patternAnalysis(prompt) {
    const patterns = [
      '**Pattern: Accumulating Entropy** — This problem exhibits the classic signature of an entropy-accumulation pattern. Left unchecked, small inconsistencies compound into systemic failure. The cognitive analogy: working memory overload in humans.',
      '**Pattern: False Threshold** — The 47-minute interval in the failure pattern suggests a false threshold. Something resets every ~47 minutes but the failure condition accumulates across cycles. Consider: connection pool exhaustion with TTL-based recycling.',
      '**Pattern: Leaky Layer Cascade** — Each new abstraction adds surface area. The cognitive pattern is analogous to the Dunning-Kruger effect for architecture — the more layers you add, the less you understand the whole.',
      '**Pattern: Second-System Effect** — Brooks identified this in the 70s. The second system is the most dangerous because it incorporates everything you wished you had in the first one, without the discipline of knowing what to leave out.',
      '**Pattern: Unilateral Convergence** — In design choices, the monorepo vs polyrepo decision is analogous to centralized vs decentralized governance. The pattern repeats across every scale: individual, team, organization, ecosystem.',
    ];

    const analogies = [
      'This is like a jazz musician who keeps adding instruments to the arrangement but never removes any. The result is noise, not complexity.',
      'This resembles a forest ecosystem where invasive species (new abstractions) outcompete native ones (core logic) and the biodiversity of the codebase collapses.',
      'This is the software equivalent of building a house by adding rooms without load-bearing walls — eventually, the structure collapses under its own weight.',
      'This is like a chess player who keeps thinking about the previous game while playing the current one — the cognitive load of unresolved past decisions degrades present performance.',
    ];

    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const selectedAnalogy = analogies[Math.floor(Math.random() * analogies.length)];

    return `
## ⚡ Pattern Analysis (${this.frequency} band)

**Prompt:** ${prompt.substring(0, 200)}...

### Detected Pattern
${selectedPattern}

### Cross-Domain Analogy
${selectedAnalogy}

### Rapid Assessment
Identified ${1 + Math.floor(Math.random() * 3)} structural patterns in ${(this.band.latencyMs * 3 / 1000).toFixed(1)}s of cognitive processing.

### Resonance State
Current: ${(0.5 + Math.random() * 0.4).toFixed(2)}
This analysis operates at treble frequency — rapid, associative, seeking patterns.`;
  }

  /**
   * Update resonance metric based on new a-box.
   * @param {Object} aBox
   */
  _updateResonance(aBox) {
    this.currentResonance = aBox.resonance;
    this.resonanceHistory.push({
      timestamp: Date.now(),
      resonance: aBox.resonance,
      aBoxId: aBox.id,
    });

    // Sliding window — keep last 10 readings
    if (this.resonanceHistory.length > 10) {
      this.resonanceHistory = this.resonanceHistory.slice(-10);
    }
  }

  /**
   * Recalibrate frequency toward a target resonance.
   * Part of the Dissonance Protocol.
   * @param {number} targetResonance
   */
  recalibrate(targetResonance) {
    this.phase = 'recalibrating';
    const delta = targetResonance - this.currentResonance;
    this.currentResonance += delta * 0.3; // Gentle adjustment
    this._log(`🔄 Recalibrating: ${this.currentResonance.toFixed(2)} (target: ${targetResonance})`);
    this.phase = 'listening';
  }

  /**
   * Send a message via WebSocket.
   * @param {Object} data
   */
  _send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast to other shells through the coordinator.
   * @param {string} content
   */
  broadcast(content) {
    this._send({
      type: 'shell-broadcast',
      from: this.id,
      content,
    });
  }

  /**
   * Log with shell identifier and frequency.
   * @param {string} msg
   */
  _log(msg) {
    const freqIcon = { 'sub-bass': '🔊', bass: '🔈', mid: '🎵', treble: '🔔', ultrasonic: '⚡' }[this.frequency] || '🎵';
    console.log(`  ${freqIcon} [${this.id}@${this.frequency}] ${msg}`);
  }

  /**
   * Get average resonance over the recent window.
   * @returns {number}
   */
  getAverageResonance() {
    if (this.resonanceHistory.length === 0) return 0.5;
    const sum = this.resonanceHistory.reduce((a, r) => a + r.resonance, 0);
    return sum / this.resonanceHistory.length;
  }

  /**
   * Clean up the WebSocket connection.
   */
  disconnect() {
    this.phase = 'disconnected';
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get current state summary.
   * @returns {Object}
   */
  getState() {
    return {
      id: this.id,
      frequency: this.frequency,
      track: this.track,
      band: this.band.label,
      phase: this.phase,
      currentResonance: this.currentResonance,
      aBoxCount: this.aBoxes.length,
      timbre: this.timbre.modelFamily,
    };
  }
}

module.exports = { ShellAgent, FREQUENCY_BANDS, TIMBRE_PRESETS };
