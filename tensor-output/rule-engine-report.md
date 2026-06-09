# Fleet Rule Engine Report
**Date**: 2026-06-09
**Total findings**: 95

## Summary
- 🔴 Errors: 1
- 🟡 Warnings: 94
- 🔵 Info: 0

## By Rule
### 🔴 C01 — 1 findings
- Conversation conservation law violated: Σ(Δ_ternary) = 42 (should approach 0)
  - 💡 *Adjust opposing ternary states to balance the gesture*

### 🟡 C03 — 54 findings
- Extended monologue: speaker 0 for 5+ consecutive events (events 0-4) (event [0, 4])
  - 💡 *Consider interjecting the other speaker*
- Extended monologue: speaker 0 for 5+ consecutive events (events 1-5) (event [1, 5])
  - 💡 *Consider interjecting the other speaker*
- Extended monologue: speaker 0 for 5+ consecutive events (events 2-6) (event [2, 6])
  - 💡 *Consider interjecting the other speaker*
  - *... and 51 more*

### 🟡 C04 — 3 findings
- Extreme tempo change at event 53: interval=1.44s, deviation=414% from median (event 53)
  - 💡 *Normalize inter-word timing*
- Extreme tempo change at event 44: interval=1.36s, deviation=386% from median (event 44)
  - 💡 *Normalize inter-word timing*
- Extreme tempo change at event 20: interval=1.18s, deviation=321% from median (event 20)
  - 💡 *Normalize inter-word timing*

### 🟡 R01 — 37 findings
- Note D#5 is outside D# major scale (nearest scale degree: D, distance: 1 semitone) (event 0)
  - 💡 *Shift to D5 (nearest scale tone)*
- Note C#5 is outside D# major scale (nearest scale degree: C, distance: 1 semitone) (event 2)
  - 💡 *Shift to C5 (nearest scale tone)*
- Note A#4 is outside D# major scale (nearest scale degree: A, distance: 1 semitone) (event 5)
  - 💡 *Shift to A4 (nearest scale tone)*
  - *... and 34 more*
