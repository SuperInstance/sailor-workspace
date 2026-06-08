'use strict';

/**
 * ReasoningTask — Defines a cognitive problem for Composite Headspace analysis.
 * 
 * A reasoning task has:
 *   - A prompt (the problem statement)
 *   - A type (architectural, pattern-matching, debug-analysis, design-decision)
 *   - A difficulty level
 *   - Expected insights the ideal solution should touch on
 */
class ReasoningTask {
  /**
   * @param {Object} opts
   * @param {string} opts.id - Unique task identifier
   * @param {string} opts.prompt - The reasoning problem
   * @param {string} [opts.type='architectural'] - Problem type
   * @param {string} [opts.difficulty='medium'] - Difficulty level
   * @param {string[]} [opts.expectedInsights=[]] - Target insights
   */
  constructor(opts = {}) {
    this.id = opts.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.prompt = opts.prompt || '';
    this.type = opts.type || 'architectural';
    this.difficulty = opts.difficulty || 'medium';
    this.expectedInsights = opts.expectedInsights || [];
    this.createdAt = Date.now();
    this.phase = 'created';
    this.results = { shellA: null, shellB: null };
  }

  /**
   * Validate the task configuration.
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate() {
    const errors = [];
    if (!this.prompt || this.prompt.length < 10) {
      errors.push('Prompt must be at least 10 characters');
    }
    const validTypes = ['architectural', 'pattern-matching', 'debug-analysis', 'design-decision'];
    if (!validTypes.includes(this.type)) {
      errors.push(`Type must be one of: ${validTypes.join(', ')}`);
    }
    const validDifficulties = ['easy', 'medium', 'hard', 'gemini'];
    if (!validDifficulties.includes(this.difficulty)) {
      errors.push(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Convert a free-form prompt string into a ReasoningTask.
   * @param {string} prompt
   * @returns {ReasoningTask}
   */
  static fromPrompt(prompt) {
    return new ReasoningTask({ prompt, type: 'architectural', difficulty: 'medium' });
  }

  /**
   * Return a curated set of sample reasoning problems.
   * @returns {ReasoningTask[]}
   */
  static sampleProblems() {
    return [
      new ReasoningTask({
        id: 'task-arch-001',
        prompt:
          'Design a distributed event-sourcing system for a ride-sharing platform. ' +
          'Consider consistency, availability, and partition tolerance. What is the ' +
          'optimal trade-off for rider state vs driver state? How do you handle ' +
          'conflicting ride assignments?',
        type: 'architectural',
        difficulty: 'hard',
        expectedInsights: [
          'CAP theorem trade-offs',
          'Event sourcing patterns',
          'Conflict resolution strategies',
          'State partitioning',
        ],
      }),
      new ReasoningTask({
        id: 'task-pattern-001',
        prompt:
          'Analyze this code smell pattern: A codebase where every new feature ' +
          'creates a new abstraction layer. The layers accumulate but never get ' +
          'removed. What cognitive pattern does this resemble? How does it relate ' +
          'to the Second-System Effect? What invariants are being violated?',
        type: 'pattern-matching',
        difficulty: 'medium',
        expectedInsights: [
          'Leaky abstractions',
          'Second-system effect',
          'Accidental complexity',
          'Cognitive load accumulation',
        ],
      }),
      new ReasoningTask({
        id: 'task-debug-001',
        prompt:
          'A production system shows intermittent failures every 47 minutes. ' +
          'Logs show nothing unusual. Memory is stable. CPU spikes correlate but ' +
          'do not cause the failures. What is the likely root cause pattern? What ' +
          'experimental protocol would you follow to isolate it?',
        type: 'debug-analysis',
        difficulty: 'medium',
        expectedInsights: [
          'Periodic failure patterns',
          'Garbage collection cycles',
          'Cron-job interference',
          'Systematic debugging protocol',
        ],
      }),
      new ReasoningTask({
        id: 'task-design-001',
        prompt:
          'You need to choose between a monorepo and polyrepo for a 50-developer ' +
          'org with 15 microservices and 3 shared libraries. Analyze the second-order ' +
          'effects of each choice. Consider CI/CD complexity, developer cognitive load, ' +
          'deployment coupling, and organizational scaling over 2 years.',
        type: 'design-decision',
        difficulty: 'hard',
        expectedInsights: [
          'Second-order effects analysis',
          'Organizational Conway\'s Law',
          'CI/CD trade-offs',
          'Cognitive load per developer',
          'Scaling considerations',
        ],
      }),
      new ReasoningTask({
        id: 'task-gemini-001',
        prompt:
          'Why do distributed systems eventually become inconsistent? Trace the ' +
          'fundamental physical and logical constraints that force divergence. ' +
          'Connect this to the CAP theorem, the FLP impossibility result, and ' +
          'the human cognitive tendency to prefer strong consistency despite ' +
          'mathematical impossibility.',
        type: 'architectural',
        difficulty: 'gemini',
        expectedInsights: [
          'FLP impossibility',
          'CAP theorem fundamentals',
          'Physical constraints (speed of light)',
          'Human cognitive bias toward consistency',
          'CRDTs and convergence strategies',
        ],
      }),
    ];
  }
}

module.exports = { ReasoningTask };
