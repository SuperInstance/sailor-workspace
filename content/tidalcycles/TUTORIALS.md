# 🥁 fleet-midi-tidalcycles — Tutorial Collection

## Tutorial 1: Syncopated Groove
**Vector:** `[1,0,-1,1,0,-1,1,1]`
The core groove that shows how ternary strategy maps to rhythm. +1 = kick, 0 = hat, -1 = snare.

```bash
curl -X POST localhost:3002/pattern -d '{"ternary_vector":[1,0,-1,1,0,-1,1,1]}'
```

## Tutorial 2: Call and Response
**Vector:** `[1,1,1,-1,-1,-1,1,1]`
Two agents trading musical phrases. The first three +1s assert, three -1s oppose, two +1s conclude.

## Tutorial 3: Euclidean Percussion
**Vector:** `[1,0,0,1,0,0,1,0]`
Sparse minimalism. Euclidean rhythm generator produces `e(3,8)` — the classic tresillo pattern.

## Tutorial 4: Long-Form 16-Step
**Vector:** `[1,0,-1,0,1,0,-1,0,1,0,-1,0,1,0,-1,0]`
Extended pattern for longer agent state trajectories. Perfect for tracking an agent's journey over 16 decision steps.
