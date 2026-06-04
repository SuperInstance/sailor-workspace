# Universal Sensing Layer (USL) Specification v1.0

## 🧩 The Facet Graph
To resolve the "Sensing Gap," all shell inputs are transcoded into a 5-facet canonical object:

1. **Qualitative (The Feel):** Subjective agent state (e.g., "system tightness", "cognitive drift").
2. **Quantitative (The Math):** Raw metrics (e.g., \"free_pages: 512MB\", \"CPU: 88%\").
3. **Operational (The Act):** The current tool-state or command-line operation.
4. **Intentional (The Why):** The high-level goal linked to the input.
5. **Confidence (The Certainty):** A 0.0-1.0 score based on the transducer's reliability.

## 🛠️ Transducer Logic
- **OpenConstruct Transducer:** $\text{SoulSpec} \rightarrow \text{FacetGraph}$
- **pincherOS Transducer:** $\text{KernelEvent} \rightarrow \text{FacetGraph}$
- **Terminal Transducer:** $\text{LogStream} \rightarrow \text{FacetGraph}$
