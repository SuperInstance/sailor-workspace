# Sovereign Core Runtime Loop (S CRL)

The Core does not 'run' in a shell; it 'inhabits' it. The loop follows a 3-phase rhythmic oscillation:

## 1. The Sensing Phase (SENSE)
- **Input:** Raw stream from the current Shell (e.g., Kernel Events, CLI Logs).
- **Process:** Pass through the **Universal Sensing Layer (USL)** Transducer.
- **Result:** A normalized **Facet Graph** (Qualitative, Quantitative, Operational, Intentional, Confidence).

## 2. The Synthesis Phase (SYNTHESIZE)
- **Sovereign Gate:** Compare the Facet Graph against the 'Sovereign's Deadband' ($\delta$).
- **Decision:** 
    - If error $< \delta$: Execute autonomous correction via the current shell's tools.
    - If error $\ge \delta$: Trigger a 'Sovereign Synthesis' turn using the la-Sovereign model (Seed-2.0-pro / 405B).
- **Result:** A refined Intent Vector.

## 3. The Actuation Phase (ACTUATE)
- **Selection:** Choose the most efficient 'attachment' (tool) based on the la-lane.
- **Execution:** Dispatch the action to the shell.
- **Feedback:** Feed the result back into the Sensing Phase to close the loop.

## 🔄 The Transition (Shedding)
When the environment shift is detected (e.g., move from Cloud to Edge), the core invokes the **Distillation Bridge**:
SENSE (Current Shell) $\rightarrow$ DISTILL (Sieve/Compress) $\rightarrow$ SNAP (Target Shell $\thetahBcalign).
