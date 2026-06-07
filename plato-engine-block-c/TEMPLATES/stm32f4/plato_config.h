#ifndef PLATO_CONFIG_H
#define PLATO_CONFIG_H

/* ══════════════════════════════════════════════════════
   plato-engine-block-c — STM32F4 Configuration
   ══════════════════════════════════════════════════════ */

/* --- Sensor ADC Channels --- */
#define PLATO_ADC_CHANNEL_TEMP     3   /* PA3 — TMP36 output */
#define PLATO_ADC_CHANNEL_HUMIDITY 4   /* PA4 — DHT22 (digital, emulated) */
#define PLATO_ADC_CHANNEL_LIGHT    5   /* PA5 — photoresistor divider */

/* --- Alarm GPIO Pins --- */
#define PLATO_GPIO_ALARM_PRIMARY   7   /* PD7 — Red LED / Buzzer */
#define PLATO_GPIO_ALARM_SECONDARY 8   /* PD8 — Yellow LED */
#define PLATO_GPIO_STATUS_OK       9   /* PD9 — Green LED (heartbeat) */

/* --- SAEP Veto Pins --- */
#define PLATO_GPIO_VETO_ROOM       10  /* PD10 — Room-level override switch */
#define PLATO_GPIO_VETO_MARKET     11  /* PD11 — Market-level kill switch */

/* --- Timing --- */
#define PLATO_TICK_INTERVAL_MS     100 /* Main loop interval */
#define PLATO_DEBOUNCE_MS          50  /* Switch debounce window */

/* --- Ternary Deadband (Leminal Zone) --- */
#define PLATO_DEADBAND_LOW         0.3f  /* Below 0.3 = -1 */
#define PLATO_DEADBAND_HIGH        0.7f  /* Above 0.7 = +1 */

/* --- UART for Pincher Bridge --- */
#define PLATO_UART_BAUD            115200

/* --- Platform --- */
#define PLATO_PLATFORM_STM32F4
#define PLATO_HAS_FPU              /* STM32F4 has hardware float */

#endif /* PLATO_CONFIG_H */
