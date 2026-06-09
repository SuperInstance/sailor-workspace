# Synthesis Brief — Oroboros v1

**Purpose**: Higher-level session that sees all narrow agent outputs synoptically and identifies novel insights, cross-cutting patterns, and next-move decisions.

**Models**: Hermes 3 405B (reasoning) + ByteDance Seed 2.0 (ideation)

## Inputs (read these)

1. `round-table/tool-audits/FULL_AUDIT.md` — Kimi's audit of 11 tools
2. `round-table/futures/JEPA_RESEARCH.md` — Claude's JEPA research
3. `round-table/futures/JEPA_VISUALIZATION.md` — Claude's JEPA visualization
4. `round-table/tool-audits/DEMUCS.md` — Kimi's Demucs integration
5. `round-table/futures/2032-LIVING_ARCHIVE.md` — Reverse-actualization exercise
6. `round-table/futures/2029-LIGHTING_DESIGNER.md` — Reverse-actualization exercise
7. `round-table/futures/2028-DAW_PLUGIN.md` — Reverse-actualization exercise
8. `tensor-demo/TOOL_HERITAGE.md` — The lineage map
9. `tensor-demo/FORK_STRATEGY.md` — The fork strategy
10. `tensor-demo/LEAD_SHEET_MIDI.md` — The lead-sheet-MIDI format

## Synthesis Questions

### 1. Cross-Cutting Patterns
What patterns appear across ALL the agent outputs? Where do they agree? Where do they conflict?

### 2. Fork Priority
Given the 11-tool audit, JEPA research, and Demucs analysis — what ONE tool should we fork first? What's the smallest piece of work that proves the concept?

### 3. Architecture Gap
What's missing from our architecture that's visible only when you see all the outputs together? Something no single agent spotted, but becomes obvious synoptically?

### 4. Novel Insight
What's the most surprising thing across all outputs? Something none of us expected to find.

### 5. Next Move
Given everything — what do we build next? One concrete action, not a roadmap.

## Output

Write to `/home/ubuntu/.openclaw/workspace/round-table/decisions/2026-06-08-synthesis.md`:

```markdown
# Synthesis: [Date]
## Participants
- Narrow agents: [list]
- Synthesis: [model used]

## Cross-Cutting Patterns
[3-5 patterns found across all outputs]

## Fork Priority
[One tool, with rationale]

## Architecture Gap
[Something no single agent saw]

## Novel Insight
[The surprising finding]

## Next Move
[One concrete action]

## Raw Notes
[Quick notes from each input]
```
