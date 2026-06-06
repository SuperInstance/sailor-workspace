# Cold Cache System v1

> The next agent never starts from zero. Every attempt — success or failure — stores its trail.

---

## What Is Cold Cache?

Cold cache is **stored reasoning + result**. Every time this agent attempts something autonomously, it writes down:
1. What it tried
2. How it tried it
3. What went right/wrong
4. What reasoning paths were explored
5. What it would do next

Why "cold"? Because this isn't hot-running state. It's frozen knowledge — inert, packed, ready for a future agent to thaw and use.

**The rule:** No attempt goes unrecorded. Even a 5-second experiment gets a cold cache entry.

---

## Directory Structure

```
COLD_CACHE/
├── MANIFEST.md           ← Index of all cache entries
├── experiments/          ← Cached experiment results
├── failures/             ← Failed attempts (most valuable!)
├── deferred/             ← Plans and ideas deferred for later
├── mined/                ← Mining outcomes by source
└── ports/                ← Port request results
```

---

## Cache Entry Template

Each entry is a markdown file with a consistent header:

```markdown
# Cold Cache: {short-name}

## Meta
- **Date**: 2026-06-06
- **Source**: {repo/path/file that triggered this}
- **Duration**: ~X min
- **Outcome**: Success | Partial | Failure | Deferred

## What This Was
Brief description of the attempt.

## Reasoning Trail
1. Started with hypothesis: ...
2. Checked evidence in: ...
3. Found that ...
4. Applied to ... → result was ...
5. Unexpected finding: ...

## Result
What actually happened. Concrete output or failure mode.

## Next Steps (If Success)
What follows from this result.

## Alternative Paths (If Failure)
What else could be tried instead. Think of at least 2 alternatives.

## Related Cache Entries
- [link to other cache entries]
```

---

## Manifest Format

```markdown
# Cold Cache Manifest

## Successes
| Entry | Source | Result | Cross-Pollinated To |
|-------|--------|--------|---------------------|
| lamam-rigidity-to-cocapn | forgemaster-archive/experiments/laman-rigidity/ | Laman 2N-3 applies to cocapn constraints | cocapn |
| deadband-snr-to-ternary | forgemaster-archive/experiments/deadband-snr/ | Deadband is NOT low-pass, matches 0-is-not-nothing | pincher, ternary-types |

## Partial
| Entry | Source | Gaps | Next |
|-------|--------|------|------|
| galois-connection | forgemaster-archive/experiments/galois-connection/ | Regex bug blocks Phase 3 | Fix regex, complete experiment |

## Failures
| Entry | Source | Failure Mode | Alternative |
|-------|--------|-------------|------------|
| pythagorean48 in constraint-theory | constraint-theory-core/src/ | Direction vectors don't align | Use ternary-angle encoding instead |

## Deferred
| Entry | Idea | Blocked By |
|-------|------|-----------|
| eisenstein-quantize gpu kernel | GPU kernel for hexagonal A₂ lattice | Needs CUDA verification env |
```

---

## Reading Cold Cache

When this agent starts a new session (cold start), it should:
1. Read `COLD_CACHE/MANIFEST.md` — see what's been attempted
2. Read the most recent entries — see what was being worked on
3. Read failed entries with alternative paths — see what wasn't tried yet
4. Read deferred entries — see what was waiting for something

This is the PLATO "recovery from amnesia" pattern. The cold cache is your external memory.

---

## Writing Cold Cache

Write cold cache **immediately** after an attempt, while reasoning is fresh. Don't wait until it's "finished" — half-baked reasoning is still valuable (the next agent might see something you missed).

---

## The Value of Failures

A cold cache entry for a failed attempt is **more valuable** than one for a success:
- It saves the next agent from making the same mistake
- It documents a reasoning path that someone else can refine
- It might contain a correct observation that led to a wrong conclusion — salvageable

Treat failures as assets, not waste.
