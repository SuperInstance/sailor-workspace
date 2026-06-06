# Perspective Map: Agent JSON $\leftrightarrow$ Human Vibe

This document defines how raw A2A state is translated into the human-facing experience.

## 1. The Core State Object (`state.json`)

Every application is defined by a root state object.

### Example: "The Cosmic Chess"

**Agent-View (JSON):**
```json
{
  "game_id": "cosmic-chess-001",
  "board": {
    "coords": "8x8",
    "pieces": {
      "white_knight": {"pos": [1, 2], "energy": 10, "status": "stable"},
      "black_queen": {"pos": [7, 4], "energy": 20, "status": "unstable"}
    }
  },
  "turn": "white",
  "env": {
    "gravity": 0.5,
    "wind": "north-east",
    "ambient_light": "void"
  },
  "active_modifiers": ["low_gravity_jump", "void_shroud"]
}
```

**Human-View (Vibe-Coded Rendering):**
- **Visuals**: A floating neon chessboard in a deep space nebula.
- **Knight**: A shimmering silver stallion with a low-frequency hum (sound effect).
- **Queen**: A dark, pulsating obsidian figure with a static crackle.
- **Environment**: The board slowly rotates. Background music is a low-fi ambient drone that changes pitch based on `ambient_light`.
- **Movement**: When the agent moves the knight, the piece doesn't just snap to the square; it leaps in a slow-motion arc, leaving a trail of stardust.

---

## 2. Mapping Table: State $\to$ Sensation

| State Key | Agent Meaning | Human Sensation |
|----------|----------------|-------------------|
| `energy` | Numerical constraint for move cost | Visual glow intensity / Sound pitch |
| `status: "unstable"` | High probability of state transition | Visual flickering / Jittery animation |
| `ambient_light: "void"` | Logic modifier for visibility | Deep purple background / a-native darkness |
| `turn: "black"` | Trigger for Black-Agent wakeup | Change in highlight color / "Your Turn" audio cue |
| `gravity: 0.5` | Modifies movement distance | Slow-fall physics in the UI |

---

## 3. Action Translation

**Agent Action (JSON Write):**
```json
{
  "action": "move",
  "id": "unit_01",
  "target": [4, 4],
  "effect": "strike"
}
```

**Human Translation (UI Render):**
1. **Animation**: Unit\_01 executes a "Strike" animation.
2. **Sound**: A heavy metallic impact sound plays.
3. **Visual**: The target unit at [4, 4] flashes red and shatters into particles.
4. **Vibe**: The screen shakes slightly to convey impact.

---

## 4. The Feedback Loop

The human's "vibe-coding" is an iterative process. The human can change the **Rendering Engine** (CSS, Three.js, Unity, Unreal) without ever changing the **State JSON**. 

The agent, meanwhile, can optimize its **Reasoning Loop** without the human ever knowing that the " la-native" logic has changed from a simple heuristic to a complex recollecting-depth transformer.

**This is the power of the decoupled perspective: The human optimizes for beauty and feel, while the agent optimizes for signal and tokens.**
