# 🧱 plato-engine-block-c — TUTORIALS

## The Hacker's la-link: From 0 to First Alarm in 15 Minutes

---

### 🎯 Tutorial 1: "I want to blink an LED when temperature is too hot"

**Goal:** Read a TMP36 temperature sensor, trigger an LED alarm at 30°C.

**Time:** 5 minutes

```c
// 1. Hardware setup
// TMP36 sensor → ADC pin 3
// LED (with resistor) → GPIO pin 7

#include "plato/engine.h"
#include "plato/gpio.h"

int main(void) {
    // 2. Initialize engine
    plato_engine_t eng;
    plato_engine_init(&eng, "thermometer");

    // 3. Register temperature sensor on ADC channel 3
    plato_sensor_config_t config = {
        .channel = 3,
        .threshold = 30.0f,   // 30°C
        .hysteresis = 2.0f,   // 2°C deadband
        .type = PLATO_SENSOR_TEMP
    };
    plato_sensor_register(&eng, 0x01, &config);

    // 4. Register alarm on GPIO 7
    plato_alarm_register(&eng, 0x01, 7);

    // 5. Main loop
    while (1) {
        trit_t state = plato_engine_tick(&eng);
        // +1 = hot, LED on
        // 0  = nominal, LED off
        // -1 = cold, LED off (or different color)
        plato_alarm_update(&eng, state);
        delay_ms(100);
    }
}
```

```bash
# Build & flash (Arduino Uno)
avr-gcc -std=c99 -mmcu=atmega328p -Iinclude -o temp-alarm.elf temp-alarm.c src/*.c -lm
avr-objcopy -O ihex temp-alarm.elf temp-alarm.hex
avrdude -c arduino -p m328p -U flash:w:temp-alarm.hex
```

---

### 🎯 Tutorial 2: "I want two sensors — temperature AND humidity — with a combined alarm"

**Goal:** Trigger alarm when temp > 35°C OR humidity < 20%.

**Time:** 10 minutes

```c
#include "plato/engine.h"
#include "plato/ternary.h"

int main(void) {
    plato_engine_t eng;
    plato_engine_init(&eng, "greenhouse");

    // Temperature sensor
    plato_sensor_register(&eng, 0x01, &(plato_sensor_config_t){
        .channel = 3, .threshold = 35.0f, .hysteresis = 2.0f,
        .type = PLATO_SENSOR_TEMP
    });

    // Humidity sensor
    plato_sensor_register(&eng, 0x02, &(plato_sensor_config_t){
        .channel = 4, .threshold = 20.0f, .hysteresis = 5.0f,
        .type = PLATO_SENSOR_HUMIDITY, .invert = true
        // invert=true: alarm when BELOW threshold
    });

    // Register alarm
    plato_alarm_register(&eng, 0x01 | 0x02, 7);  // OR-combined

    while (1) {
        // Symmetry detector checks correlation
        trit_t temp_state = plato_engine_tick_sensor(&eng, 0x01);
        trit_t hum_state  = plato_engine_tick_sensor(&eng, 0x02);

        // OR logic — any alarm triggers
        trit_t combined = ternary_or(temp_state, hum_state);

        // Symmetry check: are temp and humidity moving together?
        float distance = plato_symmetry_wasserstein(&eng, 0x01, 0x02);
        if (distance > 0.8f) {
            // Sensors are decoupled — possible sensor fault
            plato_gate_log_warning(&eng, "Sensor decoupling detected");
        }

        plato_alarm_update(&eng, combined);
        delay_ms(500);
    }
}
```

**What's happening under the hood:**

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Temp Sensor │────▶│ Ternary Map  │────▶│              │
│ (ADC ch 3)  │     │ {+1, 0, -1}  │     │   OR Gate    │───▶ LED
└─────────────┘     └──────────────┘     │              │
┌─────────────┐     ┌──────────────┐     │              │
│ Humidity    │────▶│ Ternary Map  │────▶│              │
│ (ADC ch 4)  │     │ {+1, 0, -1}  │     └──────────────┘
└─────────────┘     └──────────────┘
```

---

### 🎯 Tutorial 3: "I want SAEP veto — a master switch that blocks all alarms"

**Goal:** A physical "safety override" switch that suppresses alarms when active.

**Time:** 5 minutes

```c
#include "plato/engine.h"
#include "plato/gate.h"

int main(void) {
    plato_engine_t eng;
    plato_engine_init(&eng, "safety-room");

    // Register sensors & alarms (as above)
    // ...

    // Register a SAEP veto on GPIO 8 (physical switch)
    plato_gate_add_veto(&eng, "emergency-stop", 8, PLATO_VETO_LEVEL_MARKET);

    while (1) {
        trit_t state = plato_engine_tick(&eng);

        // SAEP check: 4-tier hierarchy
        // Room → Sector → Portfolio → Market
        // If emergency-stop is pulled LOW, Market-level veto blocks ALL
        if (plato_gate_veto_is_active(&eng, "emergency-stop")) {
            plato_alarm_clear(&eng);
            plato_gate_log_veto(&eng, "Emergency stop active");
            continue;
        }

        plato_alarm_update(&eng, state);
        delay_ms(100);
    }
}
```

---

### 🎯 Tutorial 4: "I want to cross-compile for STM32"

**Goal:** Build for STM32F4 Discovery board.

**Time:** 15 minutes

```bash
# 1. Install toolchain
sudo apt-get install gcc-arm-none-eabi cmake

# 2. Use the STM32 template
cp -r TEMPLATES/stm32f4/ my-project/
cd my-project

# 3. Configure pins in plato_config.h
#    Edit PLATO_ADC_PINS and PLATO_GPIO_ALARM

# 4. Build
mkdir build && cd build
cmake .. -DCMAKE_TOOLCHAIN_FILE=../arm-none-eabi.cmake
make

# 5. Flash
openocd -f board/stm32f4discovery.cfg -c "program plato-engine.elf verify reset exit"
```

---

### 🎯 Tutorial 5: "I want to connect pincher reflexes to this sensor"

**Goal:** Feed sensor ternary state into pincher's reflex engine over UART.

**Time:** 10 minutes

```c
#include "plato/engine.h"
#include "plato/uart.h"

// Pincher-compatible .nail serialization
void send_reflex_to_pincher(plato_engine_t *eng, trit_t state) {
    plato_nail_packet_t packet = {
        .version = 1,
        .sensor_id = eng->active_sensor,
        .trit_value = state,
        .confidence = eng->confidence,
        .timestamp_ms = millis()
    };
    uart_send(sizeof(packet), (uint8_t*)&packet);
}

int main(void) {
    plato_engine_t eng;
    plato_engine_init(&eng, "pincher-sensor");

    // ... register sensors ...

    uart_init(115200);  // Same baud as pincher hybrid-bridge

    while (1) {
        trit_t state = plato_engine_tick(&eng);
        send_reflex_to_pincher(&eng, state);
        delay_ms(100);
    }
}
```

On the pincher side:

```bash
# Start the hybrid bridge
pincher hybrid-bridge --port /dev/ttyUSB0 --baud 115200
# Now sensor events flow into pincher's reflex engine
```

---

## 🔬 Quick Reference

| Function | Purpose | Docs |
|----------|---------|------|
| `plato_engine_init` | Initialize the ternary engine | `src/engine.h` |
| `plato_sensor_register` | Register a sensor by pin/channel | `src/sensor.h` |
| `plato_engine_tick` | Run one cycle → get trit | `src/engine.h` |
| `plato_alarm_trigger` | Fire alarm via GPIO/PWM/CAN | `src/alarm.h` |
| `plato_gate_veto_check` | Check SAEP constraints | `src/gate.h` |
| `plato_symmetry_detect` | Wasserstein distance between sensors | `src/symmetry.h` |
| `plato_nail_pack` | Serialize state for pincher | `src/nail.h` |

---

## 🏆 From Here

- ➡️ [ONBOARDING.md](./TEMPLATES/ONBOARDING.md) — Day 1 → Day 5 plan
- ➡️ [README.md](./README.md) — Full docs & quickstart
- ➡️ [TEMPLATES/](./TEMPLATES/) — Board-specific configs
- ➡️ [docs/SAEP-VETO.md](./docs/SAEP-VETO.md) — Veto hierarchy deep dive
- ➡️ [docs/TERNARY-STATE-MACHINE.md](./docs/TERNARY-STATE-MACHINE.md) — Theory of operation
