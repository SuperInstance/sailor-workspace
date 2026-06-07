# 🧱 plato-engine-block-c — TEMPLATES

Board-specific configurations for the C99 ternary embedded engine.

| Template | Target | MCU/Board | Toolchain |
|----------|--------|-----------|-----------|
| `stm32f4/` | ARM Cortex-M4 | STM32F4 Discovery | `gcc-arm-none-eabi` |
| `arduino/` | AVR | Arduino Uno/Nano | `avr-gcc` |
| `linux-gpio/` | Linux SBC | Raspberry Pi / Jetson | `gcc` + `libgpiod` |

### Using a Template

```bash
# Copy the template to your project
cp -r TEMPLATES/stm32f4/ my-greenhouse-monitor
cd my-greenhouse-monitor

# Edit configuration
vim plato_config.h

# Build
mkdir build && cd build
cmake ..
make
```
