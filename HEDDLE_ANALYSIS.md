# Heddle Architecture Analysis

## Executive Summary

Heddle is a **TypeScript-based agent runtime** designed for terminal-first coding workflows. It follows a **layered architecture** with clear separation between core agent behavior, runtime coordination, and interface adapters. The system is **local-first**, **workspace-scoped**, and designed for **long-lived daemon operation**.

---

## 1. Workspace State Management

### State Location

```
<workspaceRoot>/.heddle/
├── chat-sessions.catalog.json    # Session catalog
├── chat-sessions/                 # Per-session JSON bodies
├── traces/                        # Run trace evidence
├── memory/                        # Durable knowledge notes
├── heartbeat/                     # Task definitions & run history
├── uploads/                       # Session-attached images
└── logs/                          # Operation logs
```

### Key Principles

1. **Workspace-scoped state root**: All project state lives under `.heddle/` in the workspace root
2. **Request-scoped resolution**: Server operations resolve workspace identity from `workspaceId` at API boundary
3. **Multi-client safety**: Session leases prevent concurrent mutation; different sessions can run concurrently
4. **No global active workspace**: The daemon does not own one active workspace - clients choose their target

### State Ownership Classes

| Domain | State Location | Owner |
|--------|---------------|-------|
| Sessions | `stateRoot/chat-sessions.*` | `src/core/chat/engine` |
| Memory | `stateRoot/memory/` | `src/core/memory` |
| Traces | `stateRoot/traces/` | `src/core/trace` |
| Heartbeat | `stateRoot/heartbeat/` | `src/core/heartbeat` |
| Workspace registry | `~/.heddle/` | `src/core/runtime/daemon` |

### Key Services

```typescript
// Workspace catalog and registration
RuntimeWorkspaceService          // src/core/runtime/workspaces/
RuntimeDaemonRegistryService    // src/core/runtime/daemon/

// Session storage
FileSessionRepository            // src/core/chat/engine/sessions/
FileSessionLeaseRepository       // src/core/chat/engine/sessions/leases/
```

---

## 2. Headless Daemon Capability

### Daemon Architecture

**Yes, Heddle is designed for long-lived daemon operation.**

```bash
heddle daemon  # Starts standalone control-plane server
```

### Daemon Capabilities

1. **Control-plane server**: HTTP/tRPC/SSE server at `localhost:3100`
2. **Multi-client support**: Terminal, browser, mobile clients attach simultaneously
3. **Session streaming**: Real-time event fanout via EventEmitter → tRPC subscription/SSE
4. **Heartbeat scheduling**: Bounded autonomous wake cycles for background tasks
5. **Workspace switching**: Clients select active workspace; server resolves per-request

### Server Layer Structure

```
src/server/
├── app.ts                          # Express app setup
├── lifecycle.ts                    # Server startup/shutdown
├── heartbeat-scheduler-host.ts     # Background task scheduler
├── routes/
│   ├── trpc/
│   │   ├── control-plane.ts       # Main tRPC router (560 lines)
│   │   └── schema.ts              # Zod validation schemas
│   └── control-plane-*.ts         # API endpoints
├── controllers/
│   └── trpc/control-plane/        # Request handlers
└── services/
    └── control-plane/              # Business logic layer
```

### Control Plane API (tRPC)

Key endpoints from `control-plane.ts`:

- **Sessions**: `sessions`, `sessionCreate`, `sessionSendPrompt`, `sessionContinue`, `sessionCompact`, `sessionDelete`
- **Live Events**: `sessionEvents` (subscription), `sessionsEvents` (subscription)
- **Heartbeat**: `heartbeatTasks`, `heartbeatTaskCreate`, `heartbeatRunDueTasks`
- **Memory**: `memoryStatus`, `memoryList`, `memorySearch`
- **Workspace**: `workspaceBrowse`, `workspaceChanges`, `workspaceSetActive`
- **Approvals**: `sessionResolveApproval`, `sessionPendingApproval`

### Subscription Model

```typescript
// Live session events
controlPlaneRouter.sessionEvents  // tRPC subscription
  → EventEmitter (keyed by workspaceId + sessionId)
  → RuntimeSubscriptionStream (AsyncIterable adapter)
  → useControlPlaneSessionEvents hook (web-v2)
```

---

## 3. Extension Points for FCP Primitives

### Adding New Live Events

Location: `src/core/live/types.ts`

```typescript
// Add to ConversationActivity union
export type ConversationActivity = 
  | ConversationAgentLoopActivity
  | ConversationCompactionActivity
  | ConversationDirectShellActivity
  // | YourFcpActivity  <-- ADD HERE
```

### Adding New Tools

Location: `src/core/tools/toolkits/`

```typescript
// Pattern: factory function returning ToolDefinition
export function createMyTool(options): ToolDefinition {
  return {
    name: 'my_tool',
    description: '...',
    inputSchema: { ... },
    async execute(input, context) { ... }
  }
}
```

Tool categories:
- `coding-files/` - File operations (read, edit, search, delete, move)
- `knowledge/` - Memory operations (notes, checkpoint, record)
- `external-context/` - Web search, image viewing
- `internal/` - Workflow tools (update_plan)
- `shell-process/` - Command execution

### Adding New LLM Providers

Location: `src/core/llm/adapters/`

```typescript
// Implement LlmAdapter interface
export class MyProviderAdapter implements LlmAdapter {
  info?: LlmAdapterInfo;
  async chat(messages, tools, signal, onStreamEvent): Promise<LlmResponse> {
    // Provider-specific implementation
  }
}

// Register in BuiltinLlmProviderRegistry
```

### Adding Heartbeat Task Types

Location: `src/core/heartbeat/`

```typescript
// Define task-specific checkpoint state
export interface MyFcpCheckpoint {
  // Checkpoint structure
}

// Use HeartbeatRunnerAgent.run() with custom prompt/decision classes
```

### Control Plane Extensions

Location: `src/server/routes/trpc/control-plane.ts`

Add new procedures following the pattern:
```typescript
.myFcpOperation: controlPlaneWorkspaceProcedure
  .input(myFcpInputSchema)
  .mutation(async ({ ctx, input }) => {
    return await MyFcpController.execute(ctx.requestWorkspace, input);
  })
```

---

## 4. Model-Agnostic Interface

### LLM Adapter Pattern

**Yes, Heddle has a model-agnostic interface.**

```typescript
// Core LLM port (src/core/llm/types.ts)
export interface LlmAdapter {
  info?: LlmAdapterInfo;
  chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal?: AbortSignal,
    onStreamEvent?: (event: LlmStreamEvent) => void,
  ): Promise<LlmResponse>;
}
```

### Supported Providers

```typescript
export type LlmProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'ollama' 
  | 'huggingface';
```

### Adapter Registry

```typescript
// src/core/llm/service.ts
export class LlmAdapterService {
  static create(input: LlmAdapterCreateInput): LlmAdapter;
  static inferProvider(model: string): LlmProvider;
}

// Registry owns provider resolution
BuiltinLlmProviderRegistry.register(provider, adapterFactory);
```

### Model Catalog

```typescript
// src/core/llm/models/
export const BUILT_IN_MODEL_GROUPS: BuiltInModelGroup[] = [
  // OpenAI, Anthropic groups with capability metadata
];
```

### Credential Resolution

```typescript
// src/core/runtime/credentials/
export class RuntimeCredentialService {
  static resolveProviderApiKey(provider: LlmProvider): string | undefined;
  static resolveCredentialSourceForModel(model: string, options): ProviderCredentialSource;
}
```

### Provider-Independent Event Types

All `ConversationActivity` events carry provider-neutral fields:
- `runId`, `step`, `timestamp`
- `tool`, `toolCallId`, `input`
- `usage` (unified token structure)

---

## 5. Layered Architecture

```
Layer 5: Interface Adapters
├── src/cli-v2/          # Terminal UI (Ink-based)
├── src/web-v2/          # Browser control plane (React)
└── src/server/          # tRPC/SSE transport

Layer 4: Product/Domain Workflows
├── src/core/chat/engine/      # Session persistence, compaction
├── src/core/heartbeat/         # Scheduled tasks, checkpoint reuse
├── src/core/memory/            # Knowledge maintenance
├── src/core/awareness/         # Project understanding
└── src/core/review/            # Diff parsing

Layer 3: Runtime Host Foundation
└── src/core/runtime/
    ├── loop/          # Programmatic run entry, events
    ├── credentials/   # Provider auth resolution
    ├── tools/         # Default tool assembly
    ├── workspaces/    # Workspace catalog
    └── daemon/        # Registry, host discovery

Layer 2: Inner Execution Engine
└── src/core/agent/
    ├── service.ts           # AgentRunService - main loop
    ├── context/             # Run context building
    ├── model/               # LLM request handling
    ├── tools/               # Tool dispatch
    ├── budget/              # Step limits
    ├── memory/              # Checkpoint signals
    └── planning/            # Plan state parsing

Layer 1: Infrastructure & Domain Primitives
├── src/core/llm/        # Provider adapters
├── src/core/tools/      # Tool definitions, registry
├── src/core/trace/      # Observability
├── src/core/auth/       # Stored credentials
├── src/core/approvals/  # Tool approval policy
└── src/core/commands/   # Slash commands

Layer 0: Shared Types & Utilities
├── src/core/types.ts    # Core type contracts
└── src/core/utils/      # Pure utilities
```

---

## 6. Programmatic Entry Points

### Conversation Engine (Alpha)
```typescript
// Persisted multi-turn sessions
const engine = createConversationEngine({
  workspaceRoot, stateRoot, model
});
const session = engine.sessions.create({ name: '...' });
await engine.turns.submit({ sessionId, prompt, host: {...} });
```

### Agent Loop Runtime
```typescript
// Single-run embedding
const result = await AgentLoopRuntimeService.run({
  goal, model, workspaceRoot,
  onEvent(event) { ... }
});
```

### Heartbeat APIs
```typescript
// Scheduled background work
await HeartbeatRunnerAgent.run({ task, checkpoint, maxSteps });
await HeartbeatSchedulerService.runDueTasks({...});
```

---

## Key Files Reference

| Area | Key Files |
|------|-----------|
| Core types | `src/core/types.ts`, `src/core/llm/types.ts` |
| Live events | `src/core/live/types.ts`, `src/core/event-types.ts` |
| Agent loop | `src/core/agent/service.ts`, `src/core/agent/types.ts` |
| Runtime | `src/core/runtime/loop/service.ts`, `src/core/runtime/workspaces/` |
| Chat engine | `src/core/chat/engine/conversation-engine.ts` |
| Tools | `src/core/tools/index.ts`, `src/core/tools/README.md` |
| Server | `src/server/routes/trpc/control-plane.ts` |
| Public API | `src/index.ts` |

---

## Summary for FCP Integration

1. **Workspace state**: Already local-first under `.heddle/` with clear separation per workspace
2. **Headless daemon**: Full daemon mode with tRPC/SSE for multi-client real-time streaming
3. **Extension points**: 
   - Tools: `src/core/tools/toolkits/`
   - Live events: `src/core/live/types.ts`
   - LLM providers: `src/core/llm/adapters/`
   - Heartbeat tasks: `src/core/heartbeat/`
   - Control plane APIs: `src/server/routes/trpc/control-plane.ts`
4. **Model-agnostic**: Clean LLM adapter interface with existing OpenAI/Anthropic/Google/Ollama support
