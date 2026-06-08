# 🎵 Tensor-MIDI Prototypes

> *Where ternary strategy vectors become music, and the arena jams.*

This directory collects prototypes exploring **Tensor-MIDI** — the encoding of ternary {-1, 0, +1} strategy data as compact MIDI-compatible byte streams and musical renderings. Every ternary value maps to a musical interval, every agent to a voice, and every conservation law to a voice-leading rule.

---

## Active Prototypes

### 1. Fleet Clock Tensor-MIDI (`forgemaster-archive`)

**Rust crate** — `fleet-clock` → `src/tensor_midi.rs`

INT8 Tensor-MIDI encoding for compact wire representation of clock state in distributed agent fleets. Encodes Fraction timestamps and offsets as quantized INT8 tensors compatible with MIDI-style byte streams.

**Key files:**
- [`forgemaster-archive/products/fleet-clock/src/tensor_midi.rs`](../forgemaster-archive/products/fleet-clock/src/tensor_midi.rs) — Rust implementation: magic bytes `[0xF1, 0xEE]`, encode/decode tick messages, drift tensors, CRC-16 validation
- [`forgemaster-archive/products/metronome-sync/metronome_sync/tensor_midi.py`](../forgemaster-archive/products/metronome-sync/metronome_sync/tensor_midi.py) — Python implementation: INT8 quantization of Fraction drift, compact clock snapshots (17 bytes)
- [`forgemaster-archive/experiments/tensor_midi_fidelity.py`](../forgemaster-archive/experiments/tensor_midi_fidelity.py) — Experiment 22: fidelity comparison of float64 vs INT8 quantized drift across δ ∈ {1/256, 1/128, 1/64, 1/32, 1/16, 1/8}
- [`forgemaster-archive/experiments/results/experiment22_tensor_midi.json`](../forgemaster-archive/experiments/results/experiment22_tensor_midi.json) — Results: INT8 achieves <0.2% additional drift at δ=1/256

### 2. Ternary-Rhythm Engine (`ternary-rhythm`)

**Rust crate** — [ternary-rhythm](../ternary-rhythm)

Temporal pattern recognition and generation using ternary time. Key components:
- **Rhythm** — cyclic ternary pattern with `tick()`, `density()`, `balance()`
- **Metronome** — steady tick generator with accent patterns (waltz, clave, custom)
- **Polyrhythm** — multiple simultaneous rhythms with LCM cycle length
- **Syncopation** — off-beat emphasis detection and generation
- **Groove** — swing ratio, intensity, regularity analysis
- **RhythmEvolver** — genetic algorithm for evolving rhythm patterns

---

## The Tensor-MIDI Mapping

| Ternary Concept | MIDI Concept | Encoding |
|---|---|---|
| Ternary value (-1, 0, +1) | Interval direction (down, hold, up) | Cumulative sum → pitch |
| Strategy vector | Melody | Sequential values → note sequence |
| Ternary weight mask | Voice leading | Inter-agent weights → harmonic intervals |
| Tick | Beat | 1 tick = 1 beat (BPM = tick rate) |
| Density (non-zero fraction) | Rhythmic density | Fraction of ticks with notes |
| Balance (pos/neg ratio) | Melodic contour | Ascending vs. descending tendency |
| Surprise | Dissonance | High surprise = unexpected interval |
| Conservation | Harmonic stability | γ + H ≈ 1.283 - 0.159·log(V) |

## Wire Format (Fleet Clock)

Fleet clock Tensor-MIDI frames follow this format:

```
[0xF1, 0xEE]  magic        2 bytes
msg_type                     1 byte
sender_id                    1 byte
timestamp_quantized          1 byte (INT8)
payload_len                  1 byte
payload                   variable
crc16                        2 bytes
```

**Total overhead:** 8 bytes + payload. Drift tensor entries are single INT8 bytes each.

A full clock snapshot (true_time, offset, drift_rate) fits in **17 bytes**:
- 4B numerator + 4B denominator for true_time
- 1B INT8 offset
- 4B numerator + 4B denominator for drift_rate

## Running the Prototype

### Fidelity experiment (Python):
```bash
cd forgemaster-archive/experiments
python3 tensor_midi_fidelity.py
```

### Fleet clock tests (Rust):
```bash
cd forgemaster-archive/products/fleet-clock
cargo test
```

## Next Steps

1. **MIDI file export** — Write a converter from arena session data to Standard MIDI File (.mid) format
2. **Real-time MIDI streaming** — Stream Tensor-MIDI frames over UDP to a DAW
3. **Spreadsheet piano roll** — Visual piano roll overlay for the living spreadsheet
4. **Tensor orchestra** — Multi-voice MIDI rendering where timbre = species, dynamics = energy, harmony = trust
5. **DAW integration** — VST/AU plugin to receive and render Tensor-MIDI streams

---

*"The arena doesn't just host combat — it hosts jam sessions. Strategy ecology IS jazz improvisation. Conservation laws ARE voice-leading rules. Every session exports as MIDI."*
— MIDI Tensor Arena Architecture Document
