# 🧱 plato-engine-block-c

**A hermit crab doesn't grow a new shell. It finds one that fits, moves in, and makes it home.**

---

> 🚀 **The Hook:**  
> *Pure C99 embedded sensor → alarm engine with ternary logic, SAEP veto, and topological symmetry — for microcontrollers that need to think like a fleet.*

---

## 🛠️ Quickstart

```c
// 5 commands to get from 0 to "sensor is alarming"
#include "plato/sensor.h"
#include "plato/ternary.h"
#include "plato/gate.h"

int main() {
    // 1. Initialize the engine with default SAEP constraints
    plato_engine_t engine;
    plato_engine_init(&engine, "sensor-room-1");

    // 2. Register a temperature sensor (reads from ADC pin 3)
    plato_sensor_t temp = {
        .id = 0x01,
        .pin = 3,
        .type = PLATO_SENSOR_TEMPERATURE,
        .threshold_high = 85.0f,  // °C
        .threshold_low  = -10.0f,
        .hysteresis = 2.0f
    };
    plato_sensor_register(&engine, &temp);

    // 3. Run one cycle of the ternary state machine
    trit_t state = plato_engine_tick(&engine);

    // 4. Check for SAEP veto
    if (plato_gate_veto_check(&engine)) {
        // Alarm blocked by safety constraint
        plato_gate_log_veto(&engine);
        return -1;
    }

    // 5. Execute alarm if triggered
    plato_alarm_trigger(&engine, state);
    return 0;
}
```

**Build & Run:**

```bash
# Build
gcc -std=c99 -Iinclude -o plato-engine src/*.c -lm

# Run
./plato-engine --config config/default.ini

# Cross-compile for ARM Cortex-M
arm-none-eabi-gcc -std=c99 -mcpu=cortex-m4 -Iinclude -o plato-engine.elf src/*.c -lm
```

---

## 📐 The la-link (Architecture)

```
                    ┌─────────────────────────────────────────┐
                    │         plato-engine-block-c             │
                    │         ┌───────────────┐                │
  ┌────────┐        │         │ Ternary State  │                │
  │Sensor 1├───────▶│ ┌──────▶│   Machine     │────┐           │
  └────────┘        │ │       │ {-1, 0, +1}   │    │           │
  ┌────────┐        │ │       └───────────────┘    │           │
  │Sensor 2├───────▶│─┤                           │           │
  └────────┘        │ │       ┌───────────────┐    │           │
  ┌────────┐        │ │       │  Symmetry     │    │           │
  │Sensor N├───────▶│ └──────▶│  Detector     │────┤           │
  └────────┘        │         │ (XOR→Topology) │    │           │
  (ADC/GPIO)        │         └───────────────┘    │           │
                    │                               ▼           │
                    │         ┌─────────────────────────────┐   │
                    │         │      SAEP Veto Gate          │   │
                    │         │  ┌─────┐ ┌──────┐ ┌──────┐ │   │
                    │         │  │Room │▶│Sector│▶│Port. │▶│Mkt│ │
                    │         │  └─────┘ └──────┘ └──────┘ └┘  │
                    │         └─────────────────────────────┘   │
                    │                      │                    │
                    │                      ▼                    │
                    │         ┌─────────────────────────────┐   │
                    │         │    Alarm / Actuator Bus      │   │
                    │         │  (GPIO, PWM, CAN, I²C)       │   │
                    │         └─────────────────────────────┘   │
                    └─────────────────────────────────────────┘
```

**Three-tier compute:**

```
Fast  (μs):   Ternary state machine — no heap, no floats
Medium (ms):  Symmetry detection — XOR masks → topological identity
Slow   (s):   SAEP gate — multi-sensor correlation → veto
```

---

## 📚 The Knowledge Path

### 🧭 Path A: "What is a Ternary State Machine?"

➡️ Start here: [`docs/TERNARY-STATE-MACHINE.md`](./docs/TERNARY-STATE-MACHINE.md)

Ternary logic replaces binary {HIGH, LOW} with three states:
- **`+1`**: Alarm / Over-threshold
- **`0`**: Nominal / Deadband (Leminal Zone 0.3–0.7)
- **`−1`**: Under-threshold / Fault

The deadband prevents oscillation. A sensor that flickers around the threshold stays at `0` until it firmly crosses into `±1` territory.

### 🧭 Path B: "How do I connect multiple sensors?"

➡️ [`docs/CONFIGURATION.md`](./docs/CONFIGURATION.md)

Sensors are registered by ID, pin, type, and thresholds. The engine manages the mapping internally.

### 🧭 Path C: "How does SAEP veto work?"

➡️ [`docs/SAEP-VETO.md`](./docs/SAEP-VETO.md)

A 4-tier veto hierarchy: Room → Sector → Portfolio → Market. Each tier can suppress an alarm if safety constraints are violated.

### 🧭 Path D: "I want to cross-compile for my board"

➡️ [`TEMPLATES/ONBOARDING.md`](./TEMPLATES/ONBOARDING.md)

---

## 🔌 Ecosystem Connection

```
SuperInstance Fleet
├── plato-engine-block-c        ← YOU ARE HERE (C99 embedded)
├── pincher                     → Reflex runtime (Rust)
│   └── hybrid-bridge           → C↔Rust FFI bridge
├── market-manifold             → TDA market analysis
├── savanty                     → LLM→ASP optimization
├── construct-coordination      → Fleet intent tracking
└── ternary-types               → Z₃ math primitives
```

The `plato-engine-block-c` is the **sensor eyeball** of the fleet. It runs on bare metal, reads physical signals, and feeds ternary state into the wider SuperInstance nervous system.

---

## 🧪 Tests

```bash
# Unit tests (host)
gcc -std=c99 -Iinclude -DTESTING -o test_runner tests/*.c src/*.c -lm
./test_runner

# Hardware-in-the-loop (Cortex-M)
make test-hil BOARD=cortex-m4
```

---

## 📄 License

MIT — embedded-friendly, corporate-friendly, go build.

---

*The sensor is the spinal cord. Cortex teaches. Spinal cord gets faster.*
