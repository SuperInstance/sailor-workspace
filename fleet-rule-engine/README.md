# Fleet Rule Engine

Validates lead-sheet-MIDI data against music theory and conversation theory rules.

Inspired by **CMC (Creative MIDI Companion)** — but our rules are proprietary: conversation conservation law, ternary state machines, and speaker alternation patterns that no existing tool checks.

## Quick Start

```bash
# Validate a lead-sheet
python3 fleet-rule-engine.py validate -i tensor-output/lead-sheet-v2.json

# Generate markdown report
python3 fleet-rule-engine.py report -i tensor-output/lead-sheet-v2.json

# Visualize conservation law shape
python3 fleet-rule-engine.py visualize -i tensor-output/lead-sheet-v2.json

# Suggest fixes
python3 fleet-rule-engine.py fix -i tensor-output/lead-sheet-v2.json -o fixed.json
```

## Rule Set

### Music Theory
| Rule | Name | What it checks |
|------|------|----------------|
| R01 | Scale Membership | Notes are within ±1 semitone of a scale |
| R02 | Interval Affinity | No tritones or minor 2nds melodically |
| R03 | Voice Leading | Large leaps resolve in opposite direction |

### Conversation Theory (Proprietary)
| Rule | Name | What it checks |
|------|------|----------------|
| C01 | Conservation Law | Σ(Δ_ternary) → 0 over closed gesture |
| C02 | Ternary Transitions | No direct agreement↔disagreement flips |
| C03 | Speaker Alternation | Flags extended monologue (>5 consecutive) |
| C04 | Tempo Adherence | Extreme interval deviations flagged |

## Integration

The rule engine sits between audio decomposition and MIDI output:

```
Audio → Decomposition → Rule Engine → Validated Lead-sheet → Fleet Agents
                                ↓
                         Reports (for HITL review)
```

Error-level findings should pause the pipeline for human review.
Warning-level findings can be auto-fixed by the `fix` command.
