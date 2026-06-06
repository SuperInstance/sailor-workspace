# PLATO Agent Architecture: Repo-Native & Perspective-Decoupled

> The application is the repo. The UI is a perspective.

---

## 1. The Decoupled Perspective Model

The core of this architecture is the separation of the **Application State** from the **User Interface (UI)**.

### Layer 1: The State Substrate (The Truth)
The entire application is represented as a set of **JSON files in a Git repository**. This is the "Single Source of Truth."
- **State Files**: `state.json`, `player_1.json`, `world_map.json`
- **Ticks**: A change in state is a "tick." In a git-native world, a tick is a commit or a file update.
- **A2A Payloads**: The native language of state changes. Compact, structured, and optimized for agent consumption.

### Layer 2: The Agent Perspective (The JSON TUI)
The agent does not la-native "render" the app. It reads the state files directly. Its "TUI" is the raw JSON structure.
- **TUI = JSON**: The agent's "screen" is the current content of the state files.
- **Token Efficiency**: By operating on JSON instead of rendered HTML or text-heavy descriptions, the agent maximizes its context window and minimizes token burn.
- **Trigger-Driven**: The agent is awakened by scripts or hooks when specific state changes occur (e.g., "It is now your turn in the game").

### Layer 3: The Human Perspective (The Vibe UI)
The human sees a "vibe-coded" interface. A separate rendering engine (the "Viewer") reads the same JSON state and translates it into a high-fidelity experience.
- **Visuals**: A beautiful 3D chessboard, a sleek dashboard, or a lush MUD environment.
- **Sensory**: Sound effects, haptic feedback, animations.
- **Controls**: Human inputs are translated into the same JSON state changes that the agent uses.

**Example: The Chess Game**
- **State**: `{"board": "rnbqkbnr...", "turn": "white"}`
- **Agent sees**: A JSON block. It reasons about the board state and writes `{"move": "e2e4"}`.
- **Human sees**: A 3D piece gliding across a marble board with a satisfying *clack* sound.

---

## 2. The Git-Repo-Native Execution Loop

The agent lives and works within the repository.

```
[ State Change ] → [ Trigger/Hook ] → [ Agent Wakeup ] → [ Reason ] → [ State Change ]
      (Git Commit)        (Script)        (Sensing)    (Tutor/Reflex)   (Git Commit)
```

### Environment: Codespaces as the TUI
The agent is designed to be loaded into a GitHub Codespace. 
- **The Codespace IS the environment**: The agent has full access to the repo, the shell, and the state files.
- **TUI as Workspace**: The agent's "screen" is the directory structure and the JSON files within.
- **A2A Native**: The agent communicates through the filesystem, treating files as the primary I/O channel.

---

## 3. The Tutor & MUD Execution Engine

The agent applies the PLATO philosophy to the state changes:

- **MUD-style Ticks**: Every state update is a "tick." The agent uses triggers and hooks to decide when to act.
- **Tutor Lessons**: Successful state-change sequences are cached as "lessons." 
  - *Example*: "To win the end-game in this specific chess variant, apply this sequence of moves."
- **Cold Cache**: Every attempt to change the state is recorded. Even failures are stored as "cold cache" for future iterations.

---

## 4. The Component Map

| Component | PLATO Native Implementation | Human-Facing Equivalent |
|----------|-----------------------------|-------------------------|
| **State** | JSON files in Git repo | Visual World / Game State |
| **UI** | Raw JSON payloads (A2A) | "Vibe-Coded" Rendering |
| **Action** | File write / Git commit | Button click / Keyboard input |
| **Memory** | Cold Cache / KNOWLEDGE_BASE | Experience / Intuition |
| **Logic** | Tutor Lessons / Reflexes | Strategy / Game Plan |
| **Trigger** | File system watchers / Hooks | Notifications / Cues |

---

## 5. The "Turing-Symmetric" Interface

The system is symmetric:
- The **Human** inputs `Input → UI → State JSON`
- The **Agent** inputs `Observation → Reasoning → State JSON`

Both are just different interfaces to the same state object. The human is a "visual-agent," and the agent is a "json-agent." Neither is more "real" than the other.
