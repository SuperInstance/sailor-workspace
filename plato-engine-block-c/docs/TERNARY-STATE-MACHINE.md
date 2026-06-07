# Ternary State Machine

## Why Three States?

Most embedded systems use binary logic: HIGH/LOW, ON/OFF, ALARM/OK. This works for the simple case but fails when a sensor is *almost* at the threshold. The LED flickers. The motor oscillates. The system becomes unstable.

Ternary logic fixes this with a **Leminal Zone** (deadband):

```
     -1         0        +1
──────[████████]───────────── temperature
      30°C   85°C
```

- **`+1`**: Clearly above upper threshold (85°C — overheating)
- **`0`**: Inside deadband/neutral zone (30°C–85°C — nominal)
- **`−1`**: Clearly below lower threshold (30°C — too cold)

With binary logic, a sensor at 29.9°C oscillates between ON and OFF. With ternary logic, it stays at `−1` until it firmly crosses the threshold + hysteresis boundary.

## The Hysteresis Principle

```
Alarm ON ────┬──────────────────────────────────────────┐
             │  ┌─────────────────────┐                 │
             │  │                     │                 │
Alarm OFF ───┴──┘                     └─────────────────┘
             30°C                    32°C
           (trigger)              (release + hyst)
```

A rising sensor triggers alarm at 30°C but doesn't release until it falls to 28°C. The 2°C deadband prevents oscillation.

## From Binary to Ternary

| Feature | Binary | Ternary (plato) |
|---------|--------|----------------|
| States | ON/OFF | +1/0/−1 |
| Deadband | None | Configurable Leminal Zone |
| Confidence | N/A | 0.0–1.0 per sensor |
| Combining | AND/OR | AND/OR/XOR (+ third state) |
| Stability | Prone to flicker | Inherently stable |
