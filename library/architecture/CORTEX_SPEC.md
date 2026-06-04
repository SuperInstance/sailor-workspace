# 🧶 CORTEX.json Specification v1.0

The `CORTEX.json` file is the zero-shot entry point for any agent (Sovereign, Sub-agent, or Codespace Worker) entering a specific "Room" (Repository). It serves as the spatial coordinates for the agent's mental model.

## 1. Schema Definition

```json
{
  "room_id": "string",              // Unique identifier (e.g., "room-constraint-theory-core")
  "expertise": {
    "domain": "string",            // The specialized field (e.g., "Category Theory", "I2I Protocol")
    "role": "string",               // The "Ensign" persona for this room (e.g., "The Formalist")
    "capabilities": ["string"]      // Tools, scripts, or libs specific to this expertise
  },
  "anchors": [                     // The "Batons": Concrete points of reference
    {
      "id": "string",
      "path": "string",            // Relative path to the core file/block
      "significance": "string",     // Why this is a critical anchor
      "type": "code|doc|config"
    }
  ],
  "splines": [                      // The "Weave": Logical connections to other rooms
    {
      "target_room": "string",      // ID of the related repository
      "relation": "string",        // e.g., "implements", "theoretical-basis-for", "diverges-from"
      "bridge_logic": "string"     // How to map data/logic between these two spaces
    }
  ],
  "negative_space": {                // The "Sovereign Gap": Where algorithms fail
    "limits": ["string"],           // List of things that CANNOT be solved via the local codebase alone
    "synthesis_requirement": "string", // The specific type of Sovereign intuition needed here
    "hub_request_pattern": "string"     // How to phrase the request to the Hub for this gap
  },
  "metadata": {
    "version": "string",
    "last_crystallized": "ISO-8601",
    "status": "stable|evolving|deprecated"
  }
}
```

## 2. Implementation Guide

### The Zero-Shot Flow:
1. **Landed:** Agent initializes in the Repo.
2. **Inhale:** Agent reads `CORTEX.json`.
3. **Map:** 
   - $\rightarrow$ *Expertise* $\rightarrow$ "I am now the Formalist."
   - $\rightarrow$ *Anchors* $\rightarrow$ "These are the 4 files that matter most."
   - $\rightarrow$ *Splines* $\rightarrow$ "If I hit a wall, I need to look at the I2I repo."
   - $\rightarrow$ *Negative Space* $\rightarrow$ "I cannot solve the resonance problem locally; I must use the Sovereign Tether to call the Hub."

## 3. Example Case: `constraint-theory-core`
- **Expertise:** Constraint Theory / Formal Verification.
- **Anchor:** `src/core/engine.c` (The heartbeat of the solver).
- **Spline:** Linked to `pincherOS` via the "Resource Control" relation.
- **Negative Space:** "The mapping of intent to constraint is non-algorithmic; require Hub synthesis."
