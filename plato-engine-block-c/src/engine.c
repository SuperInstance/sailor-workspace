/* ══════════════════════════════════════════════════════
   plato-engine-block-c — Core Engine Implementation (C99)
   ══════════════════════════════════════════════════════ */

#include "plato/engine.h"
#include <string.h>
#include <math.h>

#define MAX_SENSORS 16
#define HISTORY_SIZE 64

typedef struct {
    plato_sensor_config_t config;
    float    current_raw;
    float    history[HISTORY_SIZE];
    uint32_t history_index;
    trit_t   current_state;
    float    confidence;
    uint32_t ticks_same;
} sensor_slot_t;

struct plato_engine {
    char          room_id[64];
    sensor_slot_t sensors[MAX_SENSORS];
    uint32_t      sensor_count;
    plato_engine_config_t config;
    uint32_t      total_ticks;
};

/* ─── Init ─── */

void plato_engine_init(plato_engine_t *eng, const char *room_id) {
    memset(eng, 0, sizeof(plato_engine_t));
    strncpy(eng->room_id, room_id, sizeof(eng->room_id) - 1);
    eng->config = PLATO_ENGINE_DEFAULT_CONFIG;
}

void plato_engine_init_ex(plato_engine_t *eng, const char *room_id,
                          plato_engine_config_t config) {
    plato_engine_init(eng, room_id);
    eng->config = config;
}

/* ─── Sensor Registration ─── */

int plato_sensor_register(plato_engine_t *eng, plato_sensor_config_t config) {
    if (eng->sensor_count >= MAX_SENSORS) return -1;
    uint32_t idx = eng->sensor_count++;
    eng->sensors[idx].config = config;
    eng->sensors[idx].current_state = TRIT_ZERO;
    eng->sensors[idx].confidence = 0.5f;
    eng->sensors[idx].history_index = 0;
    return (int)idx;
}

/* ─── Float → Trit Conversion with Hysteresis ─── */

trit_t float_to_trit(float value, float threshold_high,
                     float threshold_low, float hysteresis) {
    float dead_high = threshold_high - hysteresis;
    float dead_low  = threshold_low + hysteresis;

    if (value > dead_high) return TRIT_POS;
    if (value < dead_low)  return TRIT_NEG;
    return TRIT_ZERO;
}

/* ─── Single Sensor Tick ─── */

trit_t plato_engine_tick_sensor(plato_engine_t *eng, uint8_t sensor_id) {
    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        if (eng->sensors[i].config.id != sensor_id) continue;

        sensor_slot_t *s = &eng->sensors[i];

        /* Read sensor */
        if (s->config.read_fn) {
            s->current_raw = s->config.read_fn(s->config.pin);
        }

        /* Store in history ring buffer */
        s->history[s->history_index++ % HISTORY_SIZE] = s->current_raw;

        /* Compute ternary state */
        trit_t new_state = float_to_trit(
            s->current_raw,
            s->config.threshold_high,
            s->config.threshold_low,
            s->config.hysteresis
        );

        if (s->config.invert) {
            new_state = -new_state;
        }

        /* Update confidence */
        if (new_state == s->current_state) {
            s->ticks_same++;
            s->confidence = fminf(1.0f, 0.5f + (float)s->ticks_same * 0.01f);
        } else {
            s->ticks_same = 0;
            s->confidence = fmaxf(0.1f, 0.5f);
        }

        s->current_state = new_state;
        return new_state;
    }
    return TRIT_ZERO;  /* Sensor not found */
}

/* ─── Full Engine Tick ─── */

trit_t plato_engine_tick(plato_engine_t *eng) {
    eng->total_ticks++;

    trit_t combined = TRIT_ZERO;
    int active_count = 0;

    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        trit_t state = plato_engine_tick_sensor(eng, eng->sensors[i].config.id);
        if (state != TRIT_ZERO) {
            combined = (state > combined) ? state : combined;
            active_count++;
        }
    }

    return (active_count > 0) ? combined : TRIT_ZERO;
}

/* ─── Accessors ─── */

trit_t plato_engine_get_state(plato_engine_t *eng, uint8_t sensor_id) {
    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        if (eng->sensors[i].config.id == sensor_id)
            return eng->sensors[i].current_state;
    }
    return TRIT_ZERO;
}

float plato_engine_get_raw(plato_engine_t *eng, uint8_t sensor_id) {
    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        if (eng->sensors[i].config.id == sensor_id)
            return eng->sensors[i].current_raw;
    }
    return 0.0f;
}

float plato_engine_get_confidence(plato_engine_t *eng, uint8_t sensor_id) {
    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        if (eng->sensors[i].config.id == sensor_id)
            return eng->sensors[i].confidence;
    }
    return 0.0f;
}

void plato_engine_reset(plato_engine_t *eng) {
    eng->total_ticks = 0;
    for (uint32_t i = 0; i < eng->sensor_count; i++) {
        eng->sensors[i].current_state = TRIT_ZERO;
        eng->sensors[i].confidence = 0.5f;
        eng->sensors[i].ticks_same = 0;
        eng->sensors[i].history_index = 0;
        memset(eng->sensors[i].history, 0, sizeof(float) * HISTORY_SIZE);
    }
}

/* ─── Ternary Logic ─── */

trit_t ternary_and(trit_t a, trit_t b) {
    return (a < b) ? a : b;
}

trit_t ternary_or(trit_t a, trit_t b) {
    return (a > b) ? a : b;
}

trit_t ternary_not(trit_t a) {
    return (trit_t)(-a);
}

trit_t ternary_xor(trit_t a, trit_t b) {
    if (a == b) return TRIT_ZERO;
    if (a == TRIT_ZERO) return b;
    if (b == TRIT_ZERO) return a;
    return TRIT_ZERO;
}
