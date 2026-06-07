#ifndef PLATO_GATE_H
#define PLATO_GATE_H

/* ══════════════════════════════════════════════════════
   plato-engine-block-c — SAEP Veto Gate Header (C99)
   ══════════════════════════════════════════════════════ */

#include "engine.h"
#include <stdint.h>
#include <stdbool.h>

/* --- Veto Level (4-tier SAEP hierarchy) --- */
typedef enum {
    PLATO_VETO_LEVEL_NONE     = 0,
    PLATO_VETO_LEVEL_ROOM     = 1,  /* Single sensor/room */
    PLATO_VETO_LEVEL_SECTOR   = 2,  /* Group of related sensors */
    PLATO_VETO_LEVEL_PORTFOLIO = 3, /* All sensors on this device */
    PLATO_VETO_LEVEL_MARKET   = 4   /* Fleet-wide override */
} plato_veto_level_t;

/* --- Veto Rule --- */
typedef struct {
    char     name[32];
    uint8_t  gpio_pin;              /* Physical switch pin */
    plato_veto_level_t level;
    bool     active_low;            /* true = pulled LOW = active */
    bool     current_state;
} plato_veto_rule_t;

/* --- Gate Configuration --- */
typedef struct {
    uint32_t max_veto_rules;
    bool     reject_absolute_claims;
    float    min_confidence;
} plato_gate_config_t;

/* --- Veto API --- */

/* Register a physical veto switch */
int plato_gate_add_veto(plato_engine_t *eng, const char *name,
                        uint8_t gpio_pin, plato_veto_level_t level);

/* Check if any veto is active */
bool plato_gate_veto_is_active(plato_engine_t *eng, const char *name);

/* Check all vetos — returns highest active level */
plato_veto_level_t plato_gate_veto_check(plato_engine_t *eng);

/* Log veto event */
void plato_gate_log_veto(plato_engine_t *eng, const char *reason);

/* Log warning (non-blocking) */
void plato_gate_log_warning(plato_engine_t *eng, const char *message);

#endif /* PLATO_GATE_H */
