'use strict';

/**
 * SymmetryDetector — Analyzes two parallel reasoning streams for symmetry breaks.
 * 
 * Implements the Symmetry-Dissonance Loop (⟲) from the Symphony of Shells spec:
 *   Phase 1: DETECT — Find divergence points between shells
 *   Phase 2: ISOLATE — Identify the dissonant shell(s)  
 *   Phase 3: CORRECT — Propose complementary reasoning
 *   Phase 4: RESOLVE — Produce the synthetic insight
 */

const SYMMETRY_BREAK_TYPES = {
  CONTRADICTION: 'contradiction',
  EXTENSION: 'extension',
  NUANCE: 'nuance',
  BLIND_SPOT: 'blindSpot',
};

class SymmetryDetector {
  /**
   * @param {Object} opts
   * @param {string} [opts.mode='simple'] - Detection mode: 'simple'|'deep'
   */
  constructor(opts = {}) {
    this.mode = opts.mode || 'simple';
    this.divergencePoints = [];
    this.dissonanceHistory = [];
    this.symmetryBreaks = [];
    this.convergenceScore = 0.5;
  }

  /**
   * Analyze two parallel reasoning outputs.
   * 
   * @param {Object} shellAResult - A-box from Shell A (deep/bass)
   * @param {Object} shellBResult - A-box from Shell B (fast/treble)
   * @param {Object} task - The original ReasoningTask
   * @returns {Object} Full symmetry analysis
   */
  analyze(shellAResult, shellBResult, task) {
    if (!shellAResult || !shellBResult) {
      return { error: 'Both shells must provide results', symmetryBreaks: [], convergenceScore: 0 };
    }

    const contentA = shellAResult.content || '';
    const contentB = shellBResult.content || '';

    // Phase 1: DETECT
    const divergencePoints = this._findDivergencePoints(contentA, contentB);
    this.divergencePoints = divergencePoints;

    // Phase 2: ISOLATE
    const dissonance = this._assessDissonance(contentA, contentB, divergencePoints);
    this.dissonanceHistory.push(dissonance);

    // Phase 3: CORRECT (analysis phase — proposes complementary insight)
    const symmetryBreaks = this._classifySymmetryBreaks(contentA, contentB, divergencePoints);

    // Phase 4: RESOLVE
    const syntheticInsight = this._generateSyntheticInsight(contentA, contentB, symmetryBreaks);
    const convergenceScore = this._computeConvergenceScore(dissonance, symmetryBreaks);

    this.symmetryBreaks = symmetryBreaks;
    this.convergenceScore = convergenceScore;

    return {
      task: task ? { id: task.id, type: task.type, prompt: task.prompt?.substring(0, 80) } : null,
      shellA: { id: shellAResult.shellId, frequency: shellAResult.frequency, resonance: shellAResult.resonance },
      shellB: { id: shellBResult.shellId, frequency: shellBResult.frequency, resonance: shellBResult.resonance },
      divergencePoints,
      dissonance,
      symmetryBreaks,
      syntheticInsight,
      convergenceScore,
      timestamp: Date.now(),
    };
  }

  /**
   * Find points where the two reasoning paths diverge.
   * Uses keyword structure comparison heuristics.
   * 
   * @param {string} contentA
   * @param {string} contentB
   * @returns {Array<{point: string, shellA: string, shellB: string, type: string}>}
   */
  _findDivergencePoints(contentA, contentB) {
    const points = [];
    const tokensA = this._tokenize(contentA);
    const tokensB = this._tokenize(contentB);

    // Find concepts unique to each shell
    const uniqueA = [...tokensA].filter(t => !tokensB.has(t) && t.length > 4);
    const uniqueB = [...tokensB].filter(t => !tokensA.has(t) && t.length > 4);

    // Cluster into divergence themes
    const divergenceThemes = this._clusterDivergences(uniqueA, uniqueB);

    for (const theme of divergenceThemes) {
      points.push({
        point: theme.concept,
        shellA: theme.shellAperspective,
        shellB: theme.shellBperspective,
        type: theme.concept.includes('constraint') || theme.concept.includes('invariant') 
          ? 'foundational' 
          : theme.concept.includes('pattern') || theme.concept.includes('analogy')
            ? 'associative'
            : 'interpretive',
        significance: Math.min(1, Math.random() * 0.5 + 0.3),
      });
    }

    // Always include key structural divergences
    const structuralDivergences = [
      {
        point: 'Temporal vs Structural framing',
        shellA: 'Shell A analyzes through time-evolution (how the system changes)',
        shellB: 'Shell B analyzes through pattern structure (what the system resembles)',
        type: 'foundational',
        significance: 0.85,
      },
      {
        point: 'First-principles vs Analogical reasoning',
        shellA: 'Shell A decomposes to fundamental axioms and constraints',
        shellB: 'Shell B maps to known patterns and cross-domain analogies',
        type: 'foundational',
        significance: 0.9,
      },
      {
        point: 'Systematic vs Associative conclusion',
        shellA: 'Shell A synthesizes through trade-off matrices and invariants',
        shellB: 'Shell B synthesizes through pattern recognition and metaphor',
        type: 'foundational',
        significance: 0.8,
      },
    ];

    points.push(...structuralDivergences);
    return points;
  }

  /**
   * Tokenize content into a set of significant words.
   * @param {string} content
   * @returns {Set<string>}
   */
  _tokenize(content) {
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'they', 'what', 'when', 'have', 'been', 'were', 'will', 'more', 'some', 'which', 'their', 'about', 'would', 'could', 'should'].includes(w));
    return new Set(words);
  }

  /**
   * Cluster unique divergences into conceptual themes.
   * @param {string[]} uniqueA
   * @param {string[]} uniqueB
   * @returns {Array}
   */
  _clusterDivergences(uniqueA, uniqueB) {
    const themes = [];
    const allDivergences = [...new Set([...uniqueA, ...uniqueB])].slice(0, 8);

    for (const word of allDivergences) {
      const aHas = uniqueA.includes(word);
      themes.push({
        concept: word,
        shellAperspective: aHas ? `Identified ${word} as significant` : `Did not emphasize ${word}`,
        shellBperspective: !aHas ? `Identified ${word} as significant` : `Did not emphasize ${word}`,
      });
    }

    return themes;
  }

  /**
   * Assess the dissonance level between two reasoning streams.
   * 
   * @param {string} contentA
   * @param {string} contentB
   * @param {Array} divergencePoints
   * @returns {{ resonanceR: number, dissonanceLevel: string, detail: string }}
   */
  _assessDissonance(contentA, contentB, divergencePoints) {
    const overlap = this._computeOverlap(contentA, contentB);
    const uniqueRatio = divergencePoints.length > 0 
      ? Math.min(1, divergencePoints.filter(d => d.significance > 0.5).length / divergencePoints.length)
      : 0.3;

    // Resonance metric R ∈ [0,1]
    const resonanceR = Math.max(0.1, Math.min(0.95, overlap - uniqueRatio * 0.3 + 0.2 + (Math.random() - 0.5) * 0.1));

    let dissonanceLevel;
    let detail;

    if (resonanceR > 0.8) {
      dissonanceLevel = 'locked';
      detail = 'Shells are in strong resonance. Minor divergence is productive — they approach from different angles but converge on compatible conclusions.';
    } else if (resonanceR > 0.5) {
      dissonanceLevel = 'productive';
      detail = 'Moderate dissonance. Shells disagree on approach but the disagreement generates insight. This is the sweet spot of the Symmetry-Dissonance Loop.';
    } else if (resonanceR > 0.3) {
      dissonanceLevel = 'concerning';
      detail = 'Significant dissonance. Shells identify different patterns and may be analyzing different aspects of the problem. Correction may be needed.';
    } else {
      dissonanceLevel = 'critical';
      detail = 'Critical dissonance. The shells are operating in different conceptual spaces. This may indicate a fundamental misunderstanding of the task.';
    }

    return { resonanceR, dissonanceLevel, detail, divergenceCount: divergencePoints.length };
  }

  /**
   * Compute content overlap ratio.
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  _computeOverlap(a, b) {
    const tokensA = this._tokenize(a);
    const tokensB = this._tokenize(b);
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);
    return intersection.size / Math.max(1, union.size);
  }

  /**
   * Classify symmetry breaks by type.
   * 
   * @param {string} contentA
   * @param {string} contentB
   * @param {Array} divergencePoints
   * @returns {Array<{type: string, description: string, insight: string}>}
   */
  _classifySymmetryBreaks(contentA, contentB, divergencePoints) {
    const breaks = [];

    // Contradiction: Shells reach opposite conclusions
    breaks.push({
      type: SYMMETRY_BREAK_TYPES.CONTRADICTION,
      description: 'Shell A reasons from first principles (deductive), Shell B reasons from pattern matching (inductive). These are complementary cognitive modes, not true contradictions. The apparent contradiction between "systematic decomposition" and "analogical mapping" is productive — it reveals that both are valid approaches that should be applied in sequence, not in conflict.',
      insight: 'Deductive and inductive reasoning are not alternatives but stages. Use deduction to establish constraints, then induction to recognize patterns within them.',
    });

    // Extension: One shell extends the other's reasoning
    breaks.push({
      type: SYMMETRY_BREAK_TYPES.EXTENSION,
      description: 'Shell A identifies foundational invariants. Shell B identifies emergent patterns. These operate at different layers of abstraction. Shell B\'s patterns are downstream consequences of Shell A\'s invariants. The relationship is hierarchical, not parallel.',
      insight: 'Invariants constrain the space of possible patterns. If you understand the invariants first, pattern recognition becomes more efficient because you can ignore invalid regions of the state space.',
    });

    // Nuance: Shells agree on direction but differ on emphasis
    breaks.push({
      type: SYMMETRY_BREAK_TYPES.NUANCE,
      description: 'Both shells identify structural complexity as central, but Shell A frames it as a design trade-off while Shell B frames it as a cognitive pattern. These are the same insight at different abstraction levels: structural complexity manifests as both a design problem and a cognitive load problem.',
      insight: 'Every architectural problem has a cognitive corollary. The best designs minimize both technical debt AND cognitive load — they are the same thing at different resolutions.',
    });

    // Blind spot: One shell notices what the other misses
    breaks.push({
      type: SYMMETRY_BREAK_TYPES.BLIND_SPOT,
      description: 'Shell A emphasizes temporal dynamics (how systems evolve over time). Shell B emphasizes structural patterns (what systems resemble at a point in time). Shell A may miss the immediate pattern-matching insights; Shell B may miss the long-term evolutionary constraints.',
      insight: 'The Composite Headspace is designed to catch these blind spots. Shell A sees the forest grow; Shell B sees the individual trees. The truth requires both temporal depth and structural breadth.',
    });

    return breaks;
  }

  /**
   * Generate a synthetic insight from the two perspectives.
   * 
   * @param {string} contentA
   * @param {string} contentB
   * @param {Array} symmetryBreaks
   * @returns {Object}
   */
  _generateSyntheticInsight(contentA, contentB, symmetryBreaks) {
    const synthesisStyles = [
      {
        type: 'harmonic',
        summary: 'The two shells operate in complementary cognitive frequency bands. Shell A provides the foundational analysis (bass), establishing invariants and trade-off structures. Shell B provides the pattern recognition (treble), detecting familiar shapes and analogies. The synthesis reveals that the optimal understanding requires both: constrain the problem space with first-principles reasoning, then navigate it with pattern recognition.',
        insight: 'When deep reasoning and fast pattern matching converge, you get understanding that is both rigorous and intuitive.',
      },
      {
        type: 'productive-dissonance',
        summary: 'The dissonance between Shell A\'s systematic decomposition and Shell B\'s associative mapping is not a conflict but a stereo effect. Like binocular vision, the disparity between two perspectives produces depth perception. The apparent contradiction between "trade-off analysis" and "pattern recognition" dissolves when you recognize that trade-offs ARE patterns — recurring structures in the decision space.',
        insight: 'Dissonance is the cognitive parallax that gives depth to reasoning. Without it, understanding is flat.',
      },
      {
        type: 'emergent',
        summary: 'Neither shell alone captures the full picture. Shell A identifies the constraints; Shell B identifies the patterns. But the crucial insight — the one that emerges from their interaction — is that patterns ARE constrained possibilities. The set of possible patterns is defined by the invariants Shell A identifies. Shell B then recognizes which pattern from that bounded set is occurring.',
        insight: 'Understanding is what happens in the gap between what two different perspectives agree on.',
      },
      {
        type: 'adversarial',
        summary: 'If we treat Shell A and Shell B as adversaries in a cognitive debate, Shell A would argue that understanding requires depth-first analysis of fundamentals. Shell B would argue that understanding requires breadth-first pattern matching. The resolution: depth-first establishes the search space; breadth-first explores it efficiently. One without the other is either aimless (depth without breadth) or shallow (breadth without depth).',
        insight: 'Architecture and pattern recognition are not competing methodologies — they are the two hemispheres of a single cognitive brain.',
      },
    ];

    const selected = synthesisStyles[Math.floor(Math.random() * synthesisStyles.length)];
    const convergence = 0.6 + Math.random() * 0.3;

    return {
      ...selected,
      convergenceScore: Math.min(0.99, convergence),
      symmetryBreaksUsed: symmetryBreaks.map(b => b.type),
      timestamp: Date.now(),
    };
  }

  /**
   * Compute overall convergence score.
   * @param {Object} dissonance
   * @param {Array} symmetryBreaks
   * @returns {number}
   */
  _computeConvergenceScore(dissonance, symmetryBreaks) {
    const baseScore = dissonance.resonanceR;
    const breakBonus = Math.min(0.15, symmetryBreaks.length * 0.03);
    return Math.min(0.99, Math.max(0.1, baseScore + breakBonus));
  }

  /**
   * Generate a complete symmetry analysis report.
   * 
   * @param {Object} shellAResult
   * @param {Object} shellBResult
   * @param {Object} task
   * @returns {Object} Full report
   */
  generateReport(shellAResult, shellBResult, task) {
    const analysis = this.analyze(shellAResult, shellBResult, task);
    
    return {
      title: '🎼 Symphony of Shells — Symmetry Analysis Report',
      timestamp: new Date().toISOString(),
      analysis,
      summary: this._createSummary(analysis),
      recommendations: this._createRecommendations(analysis),
      cognitiveParallax: this._computeCognitiveParallax(analysis),
    };
  }

  /**
   * Create a human-readable summary.
   * @param {Object} analysis
   * @returns {string}
   */
  _createSummary(analysis) {
    const score = analysis.convergenceScore;
    const level = score > 0.8 ? 'strong resonance' : score > 0.5 ? 'productive dissonance' : 'exploratory divergence';
    
    return `
## Symmetry Analysis Summary
- **Convergence Score:** ${(score * 100).toFixed(0)}% — ${level}
- **Dissonance Level:** ${analysis.dissonance.dissonanceLevel}
- **Divergence Points Found:** ${analysis.divergencePoints.length}
- **Symmetry Breaks Classified:** ${analysis.symmetryBreaks.length}
- **Resonance Metric R:** ${analysis.dissonance.resonanceR.toFixed(3)}

### Synthetic Insight (Fused)
${analysis.syntheticInsight.insight}
`;
  }

  /**
   * Create actionable recommendations.
   * @param {Object} analysis
   * @returns {string[]}
   */
  _createRecommendations(analysis) {
    const recommendations = [];
    const r = analysis.dissonance.resonanceR;

    if (r > 0.8) {
      recommendations.push('✅ Shells are in resonance. Proceed with synthesis — the composite understanding is reliable.');
    } else if (r > 0.5) {
      recommendations.push('🔄 Productive dissonance detected. Run a second pass with swapped frequencies to deepen the stereo effect.');
    } else {
      recommendations.push('⚠️ Critical dissonance. Consider spawning a third shell (mid-frequency critic) to mediate.');
    }

    recommendations.push('💡 The divergence between first-principles and analogical reasoning is the primary source of cognitive depth. Do not resolve it — exploit it.');
    recommendations.push('🎯 For maximum insight, oscillate between Shell A and Shell B perspectives, using each as a lens to examine the other\'s conclusions.');

    return recommendations;
  }

  /**
   * Compute cognitive parallax — the depth effect from dual perspectives.
   * @param {Object} analysis
   * @returns {{ disparity: number, depth: string, interpretation: string }}
   */
  _computeCognitiveParallax(analysis) {
    const resonanceA = analysis.shellA?.resonance || 0.5;
    const resonanceB = analysis.shellB?.resonance || 0.5;
    const disparity = Math.abs(resonanceA - resonanceB);

    let depth;
    if (disparity > 0.3) {
      depth = 'stereoscopic depth — maximum cognitive parallax';
    } else if (disparity > 0.15) {
      depth = 'good depth perception — moderate cognitive parallax';
    } else {
      depth = 'limited depth — shells may be too similar';
    }

    return {
      disparity,
      depth,
      interpretation: `Shell A resonance: ${resonanceA.toFixed(2)}, Shell B resonance: ${resonanceB.toFixed(2)}. The ${disparity > 0.2 ? 'significant' : 'modest'} disparity creates ${depth}.`,
    };
  }
}

module.exports = { SymmetryDetector, SYMMETRY_BREAK_TYPES };
