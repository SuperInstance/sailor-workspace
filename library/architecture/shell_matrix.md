# Hermit Crab Shell Compatibility Matrix

## 🦀 The Shell Hierarchy
The "Sensing Core" defines how the agent perceives its environment. The goal is to move the agent-soul across these layers based on the required abstraction.

| Shell | Sensing Core | Context Window Needs | Portability | Interface |
| :--- | :--- | :--- | :--- | :--- |
| **OpenConstruct** | Harness API / Soul Spec | Personality, Memory State, Tool blocks | **High** | Spec $\rightarrow$ LLM |
| **pincherOS** | Kernel Event Bus | HW State, Process Tree, I/O Buffers | **Low** | SysCall $\rightarrow$ Agent |
| **Intelligent Terminal** | Sense-Act API | Session History, Env, CWD, Log stream | **Medium** | Shell $\rightarrow$ Agent |

## ⚠️ Transition Friction Points
- **The Semantic Gap:** pincherOS is "Kernel-speak" (hex, PIDs), while the others are "Agent-speak" (JSON, NL). Need a translation layer.
- **State Bloat:** Moving from the high-volume stream of a Terminal to the distilled state of OpenConstruct requires a **Distillation Layer**.
- **Spec vs. Stream:** OpenConstruct is Static (Specifications); Terminal is Dynamic (Streams). The integration requires a bridge that converts real-time streams into persistent memory updates.
