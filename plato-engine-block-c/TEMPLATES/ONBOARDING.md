# 🧱 plato-engine-block-c — Engineer Onboarding

**From 0 to embedded ternary in 5 days.**

---

## 🎒 Day 1: The Lay of the Land

### Morning (30 min)
- [ ] Read [README.md](../README.md) — understand the hook
- [ ] Read the [TUTORIALS.md](../TUTORIALS.md) — pick one to try
- [ ] Skim `include/plato/` headers (5 files, 50 lines each)

### Afternoon (2 hours)
- [ ] Set up your toolchain:
  ```bash
  sudo apt-get install gcc build-essential cmake
  # Or for ARM cross-compile:
  sudo apt-get install gcc-arm-none-eabi
  ```
- [ ] Build the host tests:
  ```bash
  gcc -std=c99 -Iinclude -DTESTING -o test_runner tests/*.c src/*.c -lm
  ./test_runner
  ```
- [ ] Run Tutorial 1 (temperature → LED blink)

### Evening (optional)
- [ ] Read `docs/TERNARY-STATE-MACHINE.md`
- [ ] Explore `TEMPLATES/` for your board

**🎯 Checkpoint:** You have compiled and run the engine. You know where everything lives.

---

## ⚡ Day 2: First Sensor + Alarm

### Morning (1 hour)
- [ ] Connect a real sensor (TMP36, DHT22, or potentiometer as analog input)
- [ ] Wire an LED or buzzer
- [ ] Run Tutorial 2 — dual-sensor with combined alarm

### Afternoon (2 hours)
- [ ] Experiment with thresholds and hysteresis
- [ ] Observe the Leminal Zone deadband behavior
  ```c
  // Try it: narrow deadband = more flicker
  config.hysteresis = 0.5f;
  // Wide deadband = stable but slow
  config.hysteresis = 5.0f;
  ```
- [ ] Log ternary states over UART/serial:
  ```bash
  screen /dev/ttyUSB0 115200
  # See: t:+1 h:0 t:+1 h:-1 ...
  ```

### Evening (optional)
- [ ] Read `docs/SAEP-VETO.md`
- [ ] Wire a physical button as veto switch

**🎯 Checkpoint:** Two sensors, one alarm, serial output. You understand the ternary map.

---

## 🔀 Day 3: Multiple Sensors + Symmetry

### Morning (1.5 hours)
- [ ] Connect 3+ sensors (temp, humidity, light)
- [ ] Implement Tutorial 3 — SAEP veto with physical override
- [ ] Read about symmetry detection in `include/plato/symmetry.h`

### Afternoon (2 hours)
- [ ] Log sensor correlations:
  ```c
  float d = plato_symmetry_wasserstein(&eng, 0x01, 0x03);
  printf("Wasserstein distance: %f\n", d);
  ```
- [ ] Introduce a deliberate fault (disconnect a sensor)
- [ ] Observe the symmetry detector flagging the decoupling

### Evening (optional)
- [ ] Experiment with the 4-tier SAEP hierarchy
- [ ] Create a "Sector-level" veto that only blocks specific sensors

**🎯 Checkpoint:** Symmetry detection works. You can detect sensor faults.

---

## 🔗 Day 4: Cross-Compile + Fleet Integration

### Morning (1 hour)
- [ ] Cross-compile for your target board:
  - ARM Cortex-M: use `TEMPLATES/stm32f4/`
  - Arduino: use `TEMPLATES/arduino/`
  - Linux GPIO: use `TEMPLATES/linux-gpio/`
- [ ] Flash and run on real hardware

### Afternoon (2 hours)
- [ ] Implement Tutorial 5 — UART bridge to pincher
- [ ] Start `pincher hybrid-bridge` on the host
- [ ] Verify sensor events appear in pincher's reflex database:
  ```bash
  pincher reflexes | grep "sensor"
  ```

### Evening (optional)
- [ ] Set up continuous UART logging
- [ ] Create a `.nail` bundle of your sensor configuration

**🎯 Checkpoint:** Code runs on embedded hardware. Sensors feed into the fleet.

---

## 🚢 Day 5: Custom Application

### All Day
- [ ] Design your own sensor → alarm application:
  - Greenhouse controller
  - Machine monitoring
  - Smart home sensor hub
  - Robot obstacle detection
- [ ] Choose: single-threaded loop or interrupt-driven
- [ ] Write your application in `examples/my-app/`
- [ ] Create a custom SAEP veto rule

### Stretch Goals
- [ ] Implement a new sensor type (I²C, SPI, 1-Wire)
- [ ] Add a CAN bus alarm output
- [ ] Contribute a board template back to the repo

**🎯 Checkpoint:** You have a working embedded ternary sensor system.

---

## 📚 Quick Reference

| Resource | What It Is | Read When |
|----------|-----------|-----------|
| `README.md` | Hook, build, architecture | Day 1 |
| `TUTORIALS.md` | Path from 0 to first alarm | Day 1–2 |
| `include/plato/*.h` | API headers (5 files) | Day 1 |
| `docs/TERNARY-STATE-MACHINE.md` | Theory of ternary logic | Day 1 evening |
| `docs/SAEP-VETO.md` | 4-tier veto hierarchy | Day 2 evening |
| `docs/CONFIGURATION.md` | Sensor setup options | Day 2 |
| `TEMPLATES/stm32f4/` | STM32 board template | Day 4 |
| `TEMPLATES/arduino/` | Arduino board template | Day 4 |
| `TEMPLATES/linux-gpio/` | Linux GPIO (Raspberry Pi) | Day 4 |
| `examples/` | Real-world example projects | Day 5 |

---

## ❓ Getting Help

- **Bug or feature request?** Open a GitHub issue
- **Fleet coordination?** Post to `construct-coordination` repo
- **Pincher integration?** See `pincher/hybrid-bridge` docs

---

*The sensor learns. The cortex teaches. The spinal cord gets faster.*
