# Oracle2 Process Guide — Spawning & Managing Specialists

> *We are building a process to build the process.*

---

## 1. The Spawn Pattern

Every specialist gets:
1. **Orientation file** (JSON template from `templates/`)
2. **Task brief** (specific mission, objectives, deliverables)
3. **Injected context** (relevant memory, workspace files, prior work)
4. **Timeout** (from template)
5. **Completion triggers** (from template)

### Spawn Sequence

```
1. Select template → agent_type matches task type
2. Instantiate → merge template defaults with task-specific overrides
3. Validate → check against SCHEMA.md (compatibility check)
4. Inject context → memory_search, workspace files, prior artifacts
5. Spawn → sessions_spawn with orientation + task + injected context
6. Yield → sessions_yield while specialist works
7. Receive → completion event fires as user message
8. Verify → check completion_triggers conditions met
9. Consume → read reports, update plan, persist findings
10. Escalate (if needed) → spawn higher-rank agent with context
```

---

## 2. When to Use Each Pattern

### Parallel Fan-Out (Multiple Specialists at Once)
**Use when:** Tasks are independent (different domains, different repos, non-overlapping)
**Example:** Research 3 different SuperInstance repos simultaneously
**Spawn function:** `sessions_spawn()` multiple times, then `sessions_yield()`
**Risk:** Silo effect — specialists don't share context, may produce conflicting results
**Mitigation:** Include the STRATEGY document as common context for all

### Sequential Delegation (One After Another)
**Use when:** Each step depends on the previous step's output
**Example:** Code audit → bug fix → regression test
**Spawn function:** Spawn → receive → consume output → spawn next
**Risk:** Pipeline stalls if a step fails
**Mitigation:** Each step has a fallback agent defined

### Batched Parallel (Groups of Sequential Chains)
**Use when:** Multiple independent chains, each chain has sequential dependencies
**Example:** Chain A: research polychora → write docs → push. Chain B: audit ternary-core → file issues. Both chains run in parallel.
**Spawn function:** `sessions_spawn()` for each chain head, yield, process chain outputs
**Risk:** Coordination overhead when chains need to merge
**Mitigation:** Integration engineer merges divergent outputs

### Hierarchical (Specialist Spawns Sub-Specialists)
**Use when:** Task decomposes into clear sub-tasks that need fresh contexts
**Allowed only for:** commander-rank specialists (integration_engineer, etc.)
**Example:** integration_engineer spawns code_auditor + docs_specialist for different parts
**Spawn function:** Specialist uses `subagent_spawn` tool internally
**Risk:** Unbounded depth — spawning chains could go infinite
**Mitigation:** max_children cap in template (default: 4), max_depth = 2

---

## 3. Context Injection Rules

### What to Inject
| Situation | Inject |
|-----------|--------|
| Prior research exists | Relevant memory_search results |
| Task references a file | The file contents |
| Task requires domain knowledge | The closest STRATEGY document section |
| Task builds on previous agent output | The previous agent's report |

### What NOT to Inject
- Entire workspace (too much noise)
- HEARTBEAT.md (not relevant to focused work)
- Old memory files from different sessions (stale context)

### Token Budget
| Agent Rank | Max Context Tokens |
|-----------|-------------------|
| ensign | 4,000 |
| lieutenant | 8,000 - 12,000 |
| commander | 16,000 |
| captain | 32,000 |

---

## 4. Completion Verification

When a specialist reports completion, verify:

1. **Artifacts exist** — required files at expected paths
2. **Schema matches** — output conforms to template's output_format
3. **Self-checks passed** — if verification.self_check_steps exists, confirm each was done
4. **No regression** — if code_auditor/integration_engineer, test count and lint warnings are within tolerance

### Auto-Pass Triggers
- Research officer: report exists, sources cited → auto-pass
- Code auditor: linter output captured, test log present → auto-pass
- Docs specialist: docs written, correct format → auto-pass

### Escalation Triggers
- "task too large" → split into sub-tasks, re-spawn
- "tools missing" → check infra, try fallback agent
- "model context full" → checkpoint state, resume with compressed context
- "timeout" → check partial output, resume from checkpoint

---

## 5. State Checkpointing

For long-running specialists (>5 minutes), checkpoint state:

```json
{
  "checkpoint": {
    "timestamp": "2026-06-05T20:30:00Z",
    "agent_type": "research_officer",
    "task": "polychora-architecture-analysis",
    "progress": "completed reading source code, writing report section 2/5",
    "artifacts_so_far": ["/tmp/polychora-notes.md"],
    "remaining_steps": [
      "section 3: event storage mapping",
      "section 4: cross-pollination table",
      "section 5: recommendations"
    ],
    "context_summary": "Analyzed 4D render pipeline, chunk storage, WASM plugin runtime"
  }
}
```

Checkpoints go to: `artifacts/checkpoints/<agent_type>/<task_id>.json`

---

## 6. Result Synthesis

When multiple specialists finish:

1. **Collect** all output artifacts
2. **Deduplicate** — if two specialists found the same thing, merge, don't repeat
3. **Conflict resolution** — if specialists disagree, escalate or make judgment call
4. **Synthesize** — produce a combined report that references each specialist's findings
5. **Update plan** — mark steps as completed, add new steps from findings
6. **Persist** — update memory files with what was learned

### Synthesis Template

```
# Synthesis: <Topic>

## Research Inputs
- [Specialist A] — <summary of findings>
- [Specialist B] — <summary of findings>

## Convergences
- <what both specialists agreed on>
- <strong findings that don't contradict>

## Divergences
- <where specialists disagreed, and resolution>

## Actionable Items
- <concrete next steps from synthesis>

## Updated State
- <plan status, new tasks, archived tasks>
```

---

## 7. Rank Escalation Chain

```
ensign (tool executor)
   ↓ escalate on: timeout, task_too_large
lieutenant (domain specialist)
   ↓ escalate on: conflicting_sources, infra_failure, scope_creep
commander (orchestrator)
   ↓ escalate on: architectural_conflict, fleet_wide_decision
captain (Oracle2 — me)
   ↓ escalate on: strategic_decision, external_action, new_directive
Casey
```

---

## 8. Quick Reference

| Action | API Call | Notes |
|--------|----------|-------|
| Spawn specialist | `sessions_spawn(task, taskName, model, mode="run")` | Include orientation context in task text |
| Wait for results | `sessions_yield()` | One yield per set of parallel agents |
| Check status | `subagents(action="list")` | Debug only — don't poll loop |
| Read report | `read(path)` | Consume output artifact |
| Escalate | `sessions_spawn(escalated_task)` | Include prior context for continuity |
| Abort hanging agent | `process(action="kill")` | Last resort — agent may not respond |

---

## 9. Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Spawning specialists for 1-minute tasks | Overhead of spawn/receive exceeds value | Keep fast tasks inline |
| Injecting 50KB of context | Token waste, model confusion | Be selective — inject the 10% that matters |
| Never yielding | Agents stack up results you don't see | Yield after every spawn batch |
| Ignoring escalation | Deepening failure modes | Always handle escalation.triggers |
| Flat fan-out for sequential work | Race conditions, partial results | Use sequential or batched patterns |

---

*Built by: Oracle2 Process Builder | 2026-06-05 | v1.0.0*
