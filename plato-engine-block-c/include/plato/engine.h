#ifndef PLATO_ENGINE_H
#define PLATO_ENGINE_H

/* ══════════════════════════════════════════════════════
   plato-engine-block-c — Core Engine Header (C99)
   ══════════════════════════════════════════════════════ */

#include <stdint.h>
#include <stdbool.h>

/* --- Ternary Logic --- */
typedef int8_t trit_t;  /* -1, 0, +1 */

#define TRIT_NEG  (-1)
#define TRIT_ZERO (0)
#define TRIT_POS  (1)

/* --- Sensor Types --- */
typedef enum {
    PLATO_SENSOR_TEMPERATURE = 0x01,
    PLATO_SENSOR_HUMIDITY    = 0x02,
    PLATO_SENSOR_LIGHT       = 0x03,
    PLATO_SENSOR_PRESSURE    = 0x04,
    PLATO_SENSOR_VOLTAGE     = 0x05,
    PLATO_SENSOR_CURRENT     = 0x06,
    PLATO_SENSOR_CUSTOM      = 0xFF
} plato_sensor_type_t;

/* --- Sensor Configuration --- */
typedef struct {
    uint8_t  id;
    uint8_t  pin;                /* ADC channel or GPIO pin */
    plato_sensor_type_t type;
    float    threshold_high;     /* Above this → +1 */
    float    threshold_low;      /* Below this → −1 */
    float    hysteresis;         /* Deadband width (Leminal Zone) */
    bool     invert;             /* Invert ternary output */
    float    (*read_fn)(uint8_t pin);  /* Platform read function */
} plato_sensor_config_t;

/* --- Engine Configuration --- */
typedef struct {
    float deadband_low;
    float deadband_high;
    uint32_t max_sensors;
    uint32_t tick_interval_ms;
} plato_engine_config_t;

#define PLATO_ENGINE_DEFAULT_CONFIG { \
    .deadband_low  = 0.3f,           \
    .deadband_high = 0.7f,           \
    .max_sensors   = 16,             \
    .tick_interval_ms = 100           \
}

/* --- Engine Instance --- */
typedef struct plato_engine plato_engine_t;

/* --- Core API --- */

/* Initialize engine with config */
void plato_engine_init(plato_engine_t *eng, const char *room_id);

/* Initialize with custom config */
void plato_engine_init_ex(plato_engine_t *eng, const char *room_id,
                          plato_engine_config_t config);

/* Register a sensor — returns sensor index or -1 on error */
int plato_sensor_register(plato_engine_t *eng, plato_sensor_config_t config);

/* Run one tick — reads all sensors, runs ternary state machine */
trit_t plato_engine_tick(plato_engine_t *eng);

/* Run tick for a specific sensor */
trit_t plato_engine_tick_sensor(plato_engine_t *eng, uint8_t sensor_id);

/* Get last ternary state for a sensor */
trit_t plato_engine_get_state(plato_engine_t *eng, uint8_t sensor_id);

/* Get raw sensor reading */
float plato_engine_get_raw(plato_engine_t *eng, uint8_t sensor_id);

/* Get confidence (0.0–1.0) — how stable is the current state */
float plato_engine_get_confidence(plato_engine_t *eng, uint8_t sensor_id);

/* Reset engine to initial state */
void plato_engine_reset(plato_engine_t *eng);

/* ─── Ternary Utility Functions ─── */

trit_t ternary_and(trit_t a, trit_t b);
trit_t ternary_or(trit_t a, trit_t b);
trit_t ternary_not(trit_t a);
trit_t ternary_xor(trit_t a, trit_t b);
trit_t float_to_trit(float value, float threshold_high,
                     float threshold_low, float hysteresis);

#endif /* PLATO_ENGINE_H */
