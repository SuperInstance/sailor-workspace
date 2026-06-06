/**
 * veto-engine.ts — SAEP Veto Engine (Port from Pincher)
 *
 * Pre-execution command validation. Mirrors pincher's VetoEngine with
 * pattern-based blocking of dangerous actions.
 *
 * Blocked patterns (mirroring pincher's veto rules):
 *   - rm -rf /
 *   - mkfs, dd if=/dev/zero (destructive disk ops)
 *   - Shell fork bombs
 *   - chmod 777 -R (insecure permissions)
 *   - curl/bash pipe patterns (arbitrary code execution)
 */

import type { VetoDecision } from './types';

// Known dangerous regex patterns
const DANGEROUS_PATTERNS: RegExp[] = [
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
  /cryptonight/,
];

export class VetoEngine {
  /** Check an action against the veto rules */
  check(action: string): VetoDecision {
    if (!action || action.trim().length === 0) {
      return { allow: true };
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(action.toLowerCase())) {
        return {
          allow: false,
          reason: `VETO: Action matches dangerous pattern: ${pattern.toString().slice(0, 60)}`,
        };
      }
    }

    return { allow: true };
  }

  /** Add a custom veto rule at runtime */
  addRule(pattern: RegExp): number {
    return DANGEROUS_PATTERNS.push(pattern);
  }

  /** Get all registered veto patterns (for debugging) */
  getPatterns(): string[] {
    return DANGEROUS_PATTERNS.map((p) => p.toString());
  }
}
