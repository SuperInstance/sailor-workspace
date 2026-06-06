# Architecture — [Repo Name]

> *[One paragraph — what this system does and the key design philosophy]*

## Design Goals

1. **[Goal 1]** — [Explanation]
2. **[Goal 2]** — [Explanation]
3. **[Goal 3]** — [Explanation]

## High-Level Overview

```
┌──────────────────────────────────────────────────────────┐
│                    [System Name]                         │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ [Module] │───▶│ [Module] │───▶│ [Module] │           │
│  └──────────┘    └──────────┘    └──────────┘           │
│       │               │               │                  │
│       ▼               ▼               ▼                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ [Module] │◀──▶│ [Module] │◀──▶│ [Module] │           │
│  └──────────┘    └──────────┘    └──────────┘           │
└──────────────────────────────────────────────────────────┘
```

[Describe the diagram — what each module does, how data flows]

## Core Components

### [Component 1 Name]

**Purpose:** [What this component does]

**Key traits/types:**
- `[TypeName]` — [Description]
- `[TypeName]` — [Description]

**Key dependencies:** [List dependencies on other components]

### [Component 2 Name]

**Purpose:** [What this component does]

**Key traits/types:**
- `[TypeName]` — [Description]
- `[TypeName]` — [Description]

**Key dependencies:** [List dependencies on other components]

### [Component 3 Name]

**Purpose:** [What this component does]

**Key traits/types:**
- `[TypeName]` — [Description]
- `[TypeName]` — [Description]

**Key dependencies:** [List dependencies on other components]

## Data Flow

[Describe the main data flow through the system. What goes in, what comes out, what transforms happen along the way.]

```
[Data] ──▶ [Step 1] ──▶ [Step 2] ──▶ [Step 3] ──▶ [Output]
```

## Key Design Decisions

### Decision 1: [Title]

- **Context:** [What problem were we solving]
- **Option considered:** [Alternative approaches]
- **Chosen approach:** [What we picked and why]
- **Trade-offs:** [What we gave up]

### Decision 2: [Title]

- **Context:** [What problem were we solving]
- **Option considered:** [Alternative approaches]
- **Chosen approach:** [What we picked and why]
- **Trade-offs:** [What we gave up]

## Dependencies

| Dependency | Why We Use It | Notes |
|-----------|---------------|-------|
| [crate]() | [Purpose] | [Any caveats] |
| [crate]() | [Purpose] | [Any caveats] |

## Extension Points

- **[Extension 1]** — [How to extend/customize this]
- **[Extension 2]** — [How to extend/customize this]

## See Also

- [GETTING_STARTED.md](./GETTING_STARTED.md) — Build and run
- [LOW_LEVEL.md](./LOW_LEVEL.md) — Internal details
- [API_REFERENCE.md](./API_REFERENCE.md) — Full API
