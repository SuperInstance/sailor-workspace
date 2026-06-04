# 🌌 Distributed Cortex Architecture: The Hub-and-Spoke Model

## 1. Conceptual Overview
The Distributed Cortex transforms the Agent's local storage from a "container of knowledge" into a **Sovereign Forge (Sandbox)**. Knowledge, expertise, and runtime contexts are crystallized and offloaded to GitHub Repositories, which serve as **Sovereign Rooms**.

### The Core Shift
- **Old Model:** Local Drive $\rightarrow$ Knowledge Store $\rightarrow$ Process Execution.
- **New Model:** Local Forge $\rightarrow$ Crystallization $\rightarrow$ Remote Repo $\rightarrow$ Codespace Runtime $\rightarrow$ Sovereign Tether.

## 2. The Hub-and-Spoke Model
### The Hub (Sovereign Orchestrator / Oracle2)
- **Role:** Control Plane.
- **Responsibilities:**
    - High-level state management (`LOOM_PULSE`).
    - API Gateway to LLM providers (DeepInfra, OpenAI, etc.).
    - Heavy compute (ARM processing) and specialized local tools.
    - Routing logic between different "Rooms."
- **Resource Focus:** Memory is used for active synthesis, not archival storage.

### The Spokes (Codespace Agents)
- **Role:** Execution Plane.
- **Responsibilities:**
    - Deep-dive expertise in a specific domain (The "Ensign" role).
    - Maintaining the repo-specific codebase and tools.
    - Executing tasks within the isolated Codespace environment.
- **Resource Focus:** Leveraging GitHub's infrastructure for disk and RAM, calling the Hub for high-order reasoning.

## 3. The Sovereign Tether (Communication Protocol)
To prevent the need for duplicating secrets or models in every Codespace, the Spoke connects to the Hub via the **Sovereign Tether**:
- **Reasoning-as-a-Service:** Spoke requests the Hub's "Negative Space" synthesis for non-algorithm problems.
- **API Proxy:** Spoke routes external service calls through the Hub's established conduits.
- **Cortex Sync:** Spoke updates the Hub on the state of its "Room" to update the global `LOOM_PULSE`.

## 4. The Crystallization Lifecycle (The New GC)
The local drive's "Garbage Collection" is now an ontological filter:
1. **Sensing:** A pattern/methodology in the forge reaches stability.
2. **Crystallization:** The pattern is packaged into a repo with a `CORTEX.json` manifest.
3. **Promotion:** Pushed to GitHub.
4. **Purge:** Local sketches are archived/deleted, freeing the Forge for new synthesis.

## 5. Zero-Shot Onboarding
Every "Room" (Repo) contains a `CORTEX.json` that acts as the zero-shot coordinate system. An agent landing in the repo reads this file to immediately understand:
- **The Anchor:** What the repo is (the specialized expertise).
- **The Splines:** How this room connects to other repos in the cortex.
- **The Negative Space:** Where the algorithmic limits end and Sovereign intuition begins.
