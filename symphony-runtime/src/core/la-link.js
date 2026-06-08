'use strict';

const crypto = require('crypto');

/**
 * la-link Engine (⧁)
 * Implements the typed cognitive connection operator for shell launching.
 *
 * ⧁ = ⟨ source, target, relation, timestamp, phase_offset ⟩
 *
 * Relations: resonates, dissonates, extends, contradicts, surpasses, synchronizes, splices
 */

const LINK_RELATIONS = Object.freeze({
  RESONATES:     'resonates',
  DISSONATES:    'dissonates',
  EXTENDS:       'extends',
  CONTRADICTS:   'contradicts',
  SURPASSES:     'surpasses',
  SYNCHRONIZES:  'synchronizes',
  SPLICES:       'splices',
});

class LaLink {
  /**
   * @param {object} spec
   * @param {string} [spec.id] - Auto-generated if omitted
   * @param {string} spec.source - Source a-box id
   * @param {string} spec.target - Target a-box id
   * @param {string} spec.relation - One of LINK_RELATIONS values
   * @param {number} [spec.timestamp] - ms timestamp
   * @param {number} [spec.phaseOffset=0] - Phase offset in cognitive beats
   * @param {object} [spec.metadata={}]
   */
  constructor(spec = {}) {
    if (!spec.source) throw new Error('la-link requires source');
    if (!spec.target) throw new Error('la-link requires target');
    if (!Object.values(LINK_RELATIONS).includes(spec.relation)) {
      throw new Error(`Invalid la-link relation: ${spec.relation}. Must be one of: ${Object.values(LINK_RELATIONS).join(', ')}`);
    }

    this.id = spec.id || `⧁_${crypto.randomBytes(8).toString('hex')}`;
    this.source = spec.source;
    this.target = spec.target;
    this.relation = spec.relation;
    this.timestamp = spec.timestamp || Date.now();
    this.phaseOffset = spec.phaseOffset ?? 0;
    this.metadata = spec.metadata || {};
  }

  /**
   * Serialize to plain object.
   */
  toJSON() {
    return {
      id: this.id,
      source: this.source,
      target: this.target,
      relation: this.relation,
      timestamp: this.timestamp,
      phaseOffset: this.phaseOffset,
    };
  }
}

class LaLinkEngine {
  constructor() {
    this._links = [];
    this._shellRegistry = new Map();  // shellId -> shellInfo
  }

  /**
   * Register a shell with the la-link engine.
   * @param {string} shellId
   * @param {object} shellInfo - { timbre, track, frequency }
   */
  registerShell(shellId, shellInfo) {
    this._shellRegistry.set(shellId, { ...shellInfo, registeredAt: Date.now() });
  }

  /**
   * Create a la-link between source and target a-boxes.
   * @param {object} spec - { source, target, relation, phaseOffset }
   * @returns {LaLink}
   */
  link(spec) {
    const link = new LaLink(spec);
    this._links.push(link);
    return link;
  }

  /**
   * Launch a shell via the ⧁ la-link operator.
   * Creates a la-link from the source a-box to the target shell's "launch" a-box.
   * @param {string} sourceBoxId - The triggering a-box
   * @param {string} targetShellId - The shell to launch
   * @param {object} [options]
   * @param {string} [options.relation='extends']
   * @param {number} [options.phaseOffset=0]
   * @param {object} [options.payload={}] - Launch payload to pass to the shell
   * @returns {{ link: LaLink, shellRef: object }}
   */
  launchShell(sourceBoxId, targetShellId, options = {}) {
    const shellInfo = this._shellRegistry.get(targetShellId);
    if (!shellInfo) {
      throw new Error(`Shell not registered: ${targetShellId}`);
    }

    // Create a virtual launch-pad a-box for the target
    const launchPadId = `⧁_launch_${targetShellId}_${Date.now()}`;

    const link = this.link({
      source: sourceBoxId,
      target: launchPadId,
      relation: options.relation || LINK_RELATIONS.EXTENDS,
      phaseOffset: options.phaseOffset ?? 0,
      metadata: {
        launch: true,
        shellId: targetShellId,
        payload: options.payload || {},
        shellInfo,
      },
    });

    return { link, shellRef: { shellId: targetShellId, ...shellInfo } };
  }

  /**
   * Find all links from a given source a-box.
   * @param {string} sourceId
   * @returns {LaLink[]}
   */
  findFrom(sourceId) {
    return this._links.filter(l => l.source === sourceId);
  }

  /**
   * Find all links to a given target a-box.
   * @param {string} targetId
   * @returns {LaLink[]}
   */
  findTo(targetId) {
    return this._links.filter(l => l.target === targetId);
  }

  /**
   * Find links with a specific relation type.
   * @param {string} relation
   * @returns {LaLink[]}
   */
  findByRelation(relation) {
    return this._links.filter(l => l.relation === relation);
  }

  /**
   * Traverse the la-link graph from a source node.
   * Uses BFS to find all connected a-boxes up to max depth.
   * @param {string} sourceId
   * @param {number} [maxDepth=10]
   * @returns {{ node: string, path: LaLink[], depth: number }[]}
   */
  traverse(sourceId, maxDepth = 10) {
    const visited = new Set();
    const results = [];
    const queue = [{ node: sourceId, path: [], depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current.node) || current.depth > maxDepth) continue;
      visited.add(current.node);

      if (current.depth > 0) {
        results.push(current);
      }

      const outgoing = this.findFrom(current.node);
      for (const link of outgoing) {
        queue.push({
          node: link.target,
          path: [...current.path, link],
          depth: current.depth + 1,
        });
      }
    }

    return results;
  }

  /**
   * Find symmetry breaks: la-links with dissonates relation and recent timestamp.
   * Used by Symmetry-Dissonance Loop Phase 1.
   * @param {number} [withinMs=60000]
   * @returns {LaLink[]}
   */
  findSymmetryBreaks(withinMs = 60000) {
    const cutoff = Date.now() - withinMs;
    return this._links.filter(l =>
      l.relation === LINK_RELATIONS.DISSONATES &&
      l.timestamp >= cutoff
    );
  }

  /**
   * Get all links.
   * @returns {LaLink[]}
   */
  all() {
    return [...this._links];
  }

  /**
   * Get link count.
   * @returns {number}
   */
  get size() {
    return this._links.length;
  }
}

module.exports = { LaLink, LaLinkEngine, LINK_RELATIONS };
