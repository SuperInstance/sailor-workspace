# 🕸️ fleet-midi-markov — Tutorial Collection

## Tutorial 1: Scale Walking (C Major)
**Training:** `[60,62,64,65,67,65,64,62]` → 8 notes of a C major scale
**Generated:** Stabilizes around 64-65-67 pattern. The model learns that C major mainly moves stepwise.

## Tutorial 2: Arpeggio Expansion (Two Octaves)
**Training:** `[48,52,55,60,64,67,72,76]` → Two-octave arpeggio
**Generated:** Octave jumps preserved beautifully. The model learned that arpeggios leap between inversions.

## Tutorial 3: Melodic Motif Development
**Training:** `[60,60,60,62,64,62,60,64,65,64,62,60]` → Rhythmic motif with repetition
**Generated:** The motif's internal rhythm (three C's, two steps, return) is captured and recombined.

## Tutorial 4: Wide Interval Exploration
**Training:** `[60,67,64,72,67,76,72,81]` → Wide interval jumps
**Generated:** The surprise of a 7-semitone jump is maintained. The model knows: after 81, go back to 60 gracefully.
