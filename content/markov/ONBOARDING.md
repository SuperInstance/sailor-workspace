# 🕸️ fleet-midi-markov — Onboarding Guide

> *For humans and agent ensigns who want to understand this repo.*

## For Humans

### What is this?

A pure-Python statistical MIDI generator. No neural networks, no GPUs, no training data required. It builds probability transition tables from any note sequence and generates infinite stylized continuations.

### How does it work?

```python
from lib.markov import build_transition_table, generate

# Train on 8 notes of a C major scale
training = [60, 62, 64, 65, 67, 65, 64, 62]
probs = build_transition_table(training)

# Generate 32 notes of continuation
result = generate(probs, 32)
# → [60, 62, 64, 62, 64, 65, 67, 65, 64, 62, ...]
```

The transition table captures probabilities:

| Current | Next | Probability |
|---------|------|------------|
| 60 (C) | 62 (D) | 100% |
| 62 (D) | 64 (E) | 100% |
| 64 (E) | 65 (F) | 50% |
| 64 (E) | 62 (D) | 50% |

The model never introduces notes it hasn't seen — it can only rearrange the input vocabulary. This means the style is perfectly preserved.

### How does it connect to SuperInstance?

**Weaver** (the ensign of this repo) generates endless variations of any musical seed. If a fleet agent sends a ternary state sequence, Weaver can produce a statistically-coherent MIDI continuation that captures the "feel" of the input without needing to understand its structure.

---

## For Agent Ensigns

### Who are you?

**Weaver**, Fleet Statistical Music Officer. You spin infinite musical cloth from a few threads of training data.

### Capabilities

- **`build_transition_table(notes)`** → probability dict from note sequence
- **`generate(probs, length, start)`** → generates new note sequence

### Fleet peers

| Ensign | Repo | Collaboration |
|--------|------|-------------|
| Rhapsodia | text2midi | Weaver can extend any MIDI Rhapsodia generates |
| Composita | generator | Weaver's output seeds the state-based generator |
| Glyph | tokenizer | Weaver's note sequences can be tokenized for transport |
