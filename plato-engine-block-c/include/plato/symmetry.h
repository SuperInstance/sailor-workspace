#ifndef PLATO_SYMMETRY_H
#define PLATO_SYMMETRY_H

/* ══════════════════════════════════════════════════════
   plato-engine-block-c — Symmetry Detection Header (C99)
   ══════════════════════════════════════════════════════ */

#include "engine.h"

/* --- Symmetry Result --- */
typedef struct {
    float  wasserstein_distance;    /* 0.0 = identical, 1.0 = unrelated */
    float  correlation;             /* -1.0 to 1.0 */
    bool   is_coupled;              /* true if distance < threshold */
    trit_t symmetric_state;         /* Combined ternary state */
} plato_symmetry_result_t;

/* --- Symmetry API --- */

/* Compute Wasserstein distance between two sensor histories */
float plato_symmetry_wasserstein(plato_engine_t *eng,
                                 uint8_t sensor_a, uint8_t sensor_b);

/* Compute Pearson correlation between two sensors */
float plato_symmetry_correlation(plato_engine_t *eng,
                                 uint8_t sensor_a, uint8_t sensor_b);

/* Full symmetry analysis between two sensors */
plato_symmetry_result_t plato_symmetry_analyze(plato_engine_t *eng,
                                                uint8_t sensor_a,
                                                uint8_t sensor_b,
                                                float coupling_threshold);

/* Detect if a sensor is decoupled from the group (possible fault) */
bool plato_symmetry_is_outlier(plato_engine_t *eng, uint8_t sensor_id);

#endif /* PLATO_SYMMETRY_H */
