# Snail Shell — Heddle Fleet Communication Protocol Integration Design

## Overview

Snail Shell is a **minimal extension layer** for Heddle that adds:

1. **`/workspaces/`-resident daemon mode** — a long-lived daemon that listens for t-minus cues (Fleet orchestration signals) and manages its workspace identity as a Fleet member.
2. **JSON-RPC over WebSocket endpoint** — a wire protocol for remote Fleet agents to query Heddle's environment state, workspace status, session metadata, and eventually dispatch tasks.
3. **Symphony Shell identity embedding** — every session and runtime host carries a "timbre" (agent role/tone), "track" (Fleet channel membership), and "frequency" (polling/update cadence) so Fleet agents and the Symphony can discover and route to Heddle nodes without external service discovery.

---

## 1. Files & Module Layout

Snail Shell is shipped as a **self-contained module** within the Heddle source tree, following Heddle's existing layering conventions.

```
src/
├── snail-shell/                         # ← NEW
│   ├── index.ts                         # Public API surface
│   ├── types.ts                         # Snail Shell metadata types
│   ├── identity.ts                      # Symphony Shell identity builder
│   ├── rpc/
│   │   ├── server.ts                    # JSON-RPC over WebSocket listener
│   │   ├── methods.ts                   # RPC method registry
│   │   ├── session-methods.ts           # Session introspection methods
│   │   ├── workspace-methods.ts         # Workspace introspection methods
│   │   └── fleet-methods.ts             # Fleet cue handlers (t-minus, poll)
│   └── integration/
│       ├── daemon-plugin.ts             # Plug into startupHeddleControlPlaneServer
│       └── session-metadata.ts          # Symphony identity → session metadata
├── core/
│   └── runtime/
│       └── workspaces/
│           └── types.ts                 # [+WorkspaceFleetCue] property (see §4)
├── server/
│   ├── lifecycle.ts                     # [+snailShellPlugin] integration point
│   └── types.ts                         # [+snailShell] in HeddleRuntimeHostInfo
```

### No New Dependencies

- Uses Node.js built-in `crypto` for identity token generation
- Uses existing `express` HTTP server (enhanced with WebSocket)
- Uses existing `zod` for RPC method input validation
- Adds `ws` as the sole new dependency (WebSocket server, ~400KB, very stable)

---

## 2. Symphony Shell Identity Embedding

### 2.1 Identity Shape

```typescript
// src/snail-shell/types.ts

/** Symphony Shell identity — embedded in every session and runtime host. */
export type SymphonyShellIdentity = {
  /** The role/tone of this Heddle node ("builder", "auditor", "weaver", "watcher"). */
  timbre: Timbre;

  /** The Fleet channel(s) this node participates in. */
  track: Track;

  /** Poll cadence & heartbeat frequency configuration. */
  frequency: FrequencyConfig;
};

export type Timbre = 'builder' | 'auditor' | 'weaver' | 'watcher';

export type Track = {
  /** Fleet channel this node listens on (e.g. "symphony-alpha", "fleet-canary"). */
  channel: string;

  /** Group/tag for Fleet routing (e.g. "lucid", "cyberloop", "all"). */
  group: string;
};

export type FrequencyConfig = {
  /** How often (ms) this node checks for t-minus cues. */
  cuePollIntervalMs: number;

  /** How often (ms) the daemon heartbeats to the workspace registry. */
  registryHeartbeatIntervalMs: number;

  /** How often (ms) the node publishes identity state to Fleet. */
  identityBroadcastIntervalMs: number;
};
```

### 2.2 Identity Builder

```typescript
// src/snail-shell/identity.ts

import type { SymphonyShellIdentity } from './types.js';
import { randomUUID } from 'node:crypto';

export type IdentityBuildInput = {
  timbre?: Timbre;
  channel?: string;
  group?: string;
  env?: typeof process.env;
};

const DEFAULTS: Partial<SymphonyShellIdentity> = {
  timbre: 'builder',
  frequency: {
    cuePollIntervalMs: 30_000,
    registryHeartbeatIntervalMs: 15_000,
    identityBroadcastIntervalMs: 60_000,
  },
};

export class SymphonyIdentityService {
  static build(input?: IdentityBuildInput): SymphonyShellIdentity {
    const env = input?.env ?? process.env;
    return {
      timbre: (input?.timbre ?? env.SNAIL_SHELL_TIMBRE ?? DEFAULTS.timbre) as Timbre,
      track: {
        channel: input?.channel ?? env.SNAIL_SHELL_CHANNEL ?? 'symphony-alpha',
        group: input?.group ?? env.SNAIL_SHELL_GROUP ?? 'all',
      },
      frequency: {
        cuePollIntervalMs: Number(env.SNAIL_SHELL_CUE_POLL_MS ?? DEFAULTS.frequency?.cuePollIntervalMs ?? 30_000),
        registryHeartbeatIntervalMs: Number(env.REGISTRY_HEARTBEAT_MS ?? 15_000),
        identityBroadcastIntervalMs: Number(env.SNAIL_SHELL_BROADCAST_MS ?? 60_000),
      },
    };
  }

  /** Generate a stable Fleet node ID from the daemon serverId + workspace path. */
  static fleetNodeId(serverId: string, workspaceRoot: string): string {
    return `heddle:${serverId}:${Buffer.from(workspaceRoot).toString('hex').slice(0, 8)}`;
  }
}
```

### 2.3 Embedding Into Session Metadata

```typescript
// src/snail-shell/integration/session-metadata.ts

import type { ChatSession } from '@/core/chat/types.js';
import type { SymphonyShellIdentity } from '../types.js';

export function annotateSessionWithSymphonyIdentity(
  session: ChatSession,
  identity: SymphonyShellIdentity,
): ChatSession & { symphony?: { identity: SymphonyShellIdentity } } {
  return {
    ...session,
    // Store identity as a non-enumerable custom extension;
    // Heddle's serialization will preserve it in .heddle/chat-sessions/*.json
    symphony: {
      identity,
    },
  };
}
```

**Where it plugs in:** In `src/core/chat/engine/` — when the conversation engine persists a session after creation or update, it calls `annotateSessionWithSymphonyIdentity()` to append the identity blob. The identity lives in the session JSON file under a `symphony` key, making it discoverable by any tRPC consumer reading session state.

---

## 3. `/workspaces/` Resident Daemon Mode

### 3.1 Concept

Today, `heddle daemon` starts a single server bound to one workspace. The Snail Shell daemon adds:

- **Multi-workspace residency**: The daemon registers with **all** known workspaces in the `~/.heddle/registry.json`, not just the active one.
- **Fleet cue loop**: A background interval that polls Fleet signals (t-minus cues) for each registered workspace via a configurable hook.
- **Metadata enrichment**: Runtime host announces its `SymphonyShellIdentity` in the daemon registry record, enabling Fleet discovery.

### 3.2 Daemon Plugin

```typescript
// src/snail-shell/integration/daemon-plugin.ts

import type { HeddleControlPlaneServerHandle } from '@/server/types.js';
import type { SymphonyShellIdentity } from '../types.js';
import { SnailShellRpcServer } from '../rpc/server.js';
import { SnailShellFleetCueLoop } from './fleet-cue-loop.js';

export type SnailShellDaemonPluginOptions = {
  identity: SymphonyShellIdentity;
  workspaceRoot: string;
  stateRoot: string;
  expressApp: Express.Application;
  httpServer: http.Server;
};

/**
 * Attach Snail Shell to a running daemon:
 * 1. Start WebSocket JSON-RPC on the same HTTP server (path: /ws/snail-shell)
 * 2. Start Fleet cue polling loop
 * 3. Enrich the daemon handle with Snail Shell metadata
 */
export function attachSnailShellToDaemon(
  options: SnailShellDaemonPluginOptions,
  serverHandle: HeddleControlPlaneServerHandle,
): HeddleControlPlaneServerHandle & { snailShell: SnailShellDaemonHandle } {
  const rpcServer = new SnailShellRpcServer({
    httpServer: options.httpServer,
    path: '/ws/snail-shell',
    maxPayload: 256 * 1024, // 256KB for workspace/session data
    identity: options.identity,
    workspaceRoot: options.workspaceRoot,
  });

  const cueLoop = new SnailShellFleetCueLoop({
    identity: options.identity,
    workspaceRoot: options.workspaceRoot,
    stateRoot: options.stateRoot,
    cuePollIntervalMs: options.identity.frequency.cuePollIntervalMs,
  });

  cueLoop.start();

  return Object.assign(serverHandle, {
    snailShell: {
      rpcServer,
      cueLoop,
      identity: options.identity,
      close: () => {
        cueLoop.stop();
        rpcServer.destroy();
      },
    },
  });
}
```

### 3.3 Fleet Cue Loop

```typescript
// src/snail-shell/integration/fleet-cue-loop.ts

type TMinusCue = {
  type: 't-minus';
  target: 'session.send-prompt' | 'heartbeat.run-tasks' | 'memory.maintain' | 'fleet.status';
  payload?: Record<string, unknown>;
  sender: string; // Fleet node ID
  timestamp: string;
};

export class SnailShellFleetCueLoop {
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly options: {
      identity: SymphonyShellIdentity;
      workspaceRoot: string;
      stateRoot: string;
      cuePollIntervalMs: number;
    },
  ) {
    this.pollIntervalMs = options.cuePollIntervalMs;
  }

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(() => this.pollForCues(), this.pollIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async pollForCues(): Promise<void> {
    // Phase 1: Check local cue file (`.heddle/snail-shell/cues/`)
    // Phase 2: Check fleet broadcast via shared filesystem
    // Phase 3: Execute matched cues
    //
    // Phase 1 is implemented in the initial patch:
    const cueDir = resolve(this.options.stateRoot, 'snail-shell', 'cues');
    // ... file-watch / readdir pattern
  }
}
```

### 3.4 Integration Into `lifecycle.ts`

The existing `startHeddleControlPlaneServer` function gains an optional `snailShell` parameter:

```diff
 export type HeddleControlPlaneServerOptions = {
   mode: ControlPlaneServerRecord['mode'];
   host: string;
   port: number;
+  snailShell?: {
+    enabled: boolean;
+    identity?: Partial<SymphonyShellIdentity>;
+  };
 };
```

In `startHeddleControlPlaneServer`, after the HTTP server is listening:

```typescript
let snailShellHandle: SnailShellDaemonHandle | undefined;

if (options.snailShell?.enabled) {
  const identity = SymphonyIdentityService.build({
    timbre: options.snailShell.identity?.timbre,
    channel: options.snailShell.identity?.channel,
  });
  snailShellHandle = attachSnailShellToDaemon(
    { identity, workspaceRoot, stateRoot, expressApp: app, httpServer: server },
    handle,
  );
}
```

---

## 4. JSON-RPC / WebSocket Endpoint

### 4.1 Protocol Specification

Endpoint: `ws://<host>:<port>/ws/snail-shell`

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-or-numeric",
  "method": "workspace.list",
  "params": {}
}
```

#### Response (success)

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-or-numeric",
  "result": {
    "workspaces": [
      { "id": "wk-1", "name": "my-project", "workspaceRoot": "/home/user/project" }
    ]
  }
}
```

#### Response (error)

```json
{
  "jsonrpc": "2.0",
  "id": "uuid-or-numeric",
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

### 4.2 Server Implementation

```typescript
// src/snail-shell/rpc/server.ts

import { WebSocketServer, WebSocket } from 'ws';
import type http from 'node:http';
import type { SymphonyShellIdentity } from '../types.js';
import { SnailShellRpcMethodRegistry } from './methods.js';

const METHOD_NOT_FOUND = { code: -32601, message: 'Method not found' };
const INVALID_REQUEST = { code: -32600, message: 'Invalid Request' };
const PARSE_ERROR = { code: -32700, message: 'Parse error' };

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
};

export type JsonRpcSuccess = {
  jsonrpc: '2.0';
  id: string | number;
  result: unknown;
};

export type JsonRpcError = {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
};

export type SnailShellRpcServerOptions = {
  httpServer: http.Server;
  path?: string;
  maxPayload?: number;
  identity: SymphonyShellIdentity;
  workspaceRoot: string;
};

export class SnailShellRpcServer {
  private readonly wss: WebSocketServer;
  private readonly registry: SnailShellRpcMethodRegistry;

  constructor(options: SnailShellRpcServerOptions) {
    this.registry = new SnailShellRpcMethodRegistry({
      identity: options.identity,
      workspaceRoot: options.workspaceRoot,
    });

    this.wss = new WebSocketServer({
      server: options.httpServer,
      path: options.path ?? '/ws/snail-shell',
      maxPayload: options.maxPayload ?? 256 * 1024,
    });

    this.wss.on('connection', (ws) => {
      ws.on('message', (raw) => this.handleMessage(ws, raw));
      ws.on('error', (err) => {
        // Log and close
        ws.terminate();
      });

      // Send identity handshake on connect
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method: 'snail-shell.hello',
        params: {
          identity: options.identity,
          workspaceRoot: options.workspaceRoot,
          version: '0.1.0',
        },
      }));
    });
  }

  private async handleMessage(ws: WebSocket, raw: Buffer): Promise<void> {
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(raw.toString('utf-8'));
    } catch {
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: null, error: PARSE_ERROR }));
      return;
    }

    if (request.jsonrpc !== '2.0' || !request.method) {
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id ?? null, error: INVALID_REQUEST }));
      return;
    }

    try {
      const handler = this.registry.get(request.method);
      if (!handler) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: METHOD_NOT_FOUND }));
        return;
      }

      const result = await handler(request.params);
      ws.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }));
    } catch (error: unknown) {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      }));
    }
  }

  destroy(): void {
    this.wss.close();
  }
}
```

### 4.3 Method Registry

```typescript
// src/snail-shell/rpc/methods.ts

import type { SymphonyShellIdentity } from '../types.js';
import { SnailShellWorkspaceMethods } from './workspace-methods.js';
import { SnailShellSessionMethods } from './session-methods.js';
import { SnailShellFleetMethods } from './fleet-methods.js';

type RpcHandler = (params: unknown) => Promise<unknown> | unknown;

export class SnailShellRpcMethodRegistry {
  private readonly methods = new Map<string, RpcHandler>();

  constructor(options: {
    identity: SymphonyShellIdentity;
    workspaceRoot: string;
  }) {
    const workspace = new SnailShellWorkspaceMethods(options);
    const sessions = new SnailShellSessionMethods(options);
    const fleet = new SnailShellFleetMethods(options);

    // Workspace introspection
    this.register('workspace.list', () => workspace.list());
    this.register('workspace.status', (p) => workspace.status(p));
    this.register('workspace.changes', (p) => workspace.changes(p));

    // Session introspection (read-only Fleet queries)
    this.register('session.list', () => sessions.list());
    this.register('session.get', (p) => sessions.get(p));
    this.register('session.runtimeContext', (p) => sessions.runtimeContext(p));

    // Fleet communication
    this.register('fleet.t-minus', (p) => fleet.handleTMinus(p));
    this.register('fleet.identity', () => fleet.getIdentity());
    this.register('fleet.health', () => fleet.getHealth());
  }

  register(method: string, handler: RpcHandler): void {
    this.methods.set(method, handler);
  }

  get(method: string): RpcHandler | undefined {
    return this.methods.get(method);
  }
}
```

### 4.4 Workspace Methods

```typescript
// src/snail-shell/rpc/workspace-methods.ts

import { RuntimeWorkspaceService } from '@/core/runtime/workspaces/index.js';

export class SnailShellWorkspaceMethods {
  constructor(private readonly ctx: { workspaceRoot: string }) {}

  list() {
    const context = RuntimeWorkspaceService.resolveContext({
      workspaceRoot: this.ctx.workspaceRoot,
      stateRoot: resolve(this.ctx.workspaceRoot, '.heddle'),
    });
    return {
      activeWorkspaceId: context.activeWorkspaceId,
      workspaces: context.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        workspaceRoot: w.workspaceRoot,
        stateRoot: w.stateRoot,
        repoRoots: w.repoRoots,
      })),
    };
  }

  status(params: { workspaceId?: string }) {
    const context = RuntimeWorkspaceService.resolveContext({...});
    const active = params.workspaceId
      ? context.workspaces.find(w => w.id === params.workspaceId)
      : context.activeWorkspace;
    return {
      workspaceId: active?.id,
      name: active?.name,
      workspaceRoot: active?.workspaceRoot,
      // git status, recent changes, etc.
    };
  }

  changes(params: { workspaceId?: string }) {
    // Wraps existing ControlPlaneWorkspaceDiffController.readChanges
  }
}
```

### 4.5 Session Methods

```typescript
// src/snail-shell/rpc/session-methods.ts

export class SnailShellSessionMethods {
  constructor(private readonly ctx: { workspaceRoot: string }) {}

  list() {
    // Uses existing FileSessionRepository to list all sessions
    // Returns { sessions: Array<{ id, name, model, turnCount, ...symphony }> }
  }

  get(params: { sessionId: string }) {
    // Uses existing FileSessionRepository to read one session
    // Returns session detail including symphony identity blob
  }

  runtimeContext(params: { sessionId: string }) {
    // Returns model, provider, credential info, token estimates
  }
}
```

---

## 5. Fleet T-Minus Cue Handling

### 5.1 Cue Types

| Cue | Effect |
|-----|--------|
| `session.send-prompt` | Prompts the daemon to queue a prompt to a named session |
| `heartbeat.run-tasks` | Triggers `heartbeatRunDueTasks` for all or specific workspaces |
| `memory.maintain` | Triggers memory maintenance cycle |
| `fleet.status` | Returns full identity and runtime status (one-shot or subscribe) |

### 5.2 Fleet Methods Implementation

```typescript
// src/snail-shell/rpc/fleet-methods.ts

import { RuntimeWorkspaceService } from '@/core/runtime/workspaces/index.js';
import { SymphonyIdentityService } from '../identity.js';

export class SnailShellFleetMethods {
  private readonly identity: SymphonyShellIdentity;
  private readonly workspaceRoot: string;

  constructor(options: { identity: SymphonyShellIdentity; workspaceRoot: string }) {
    this.identity = options.identity;
    this.workspaceRoot = options.workspaceRoot;
  }

  getIdentity(): { identity: SymphonyShellIdentity; fleetNodeId: string } {
    return {
      identity: this.identity,
      fleetNodeId: SymphonyIdentityService.fleetNodeId(
        // In practice, we'd pass the actual serverId resolved at runtime
        `snail-${process.pid}`,
        this.workspaceRoot,
      ),
    };
  }

  getHealth(): {
    status: 'healthy' | 'degraded';
    uptime: number;
    workspaceCount: number;
    sessionCount: number;
    memory: { rss: number; heapUsed: number; heapTotal: number };
  } {
    const context = RuntimeWorkspaceService.resolveContext({...});
    return {
      status: 'healthy',
      uptime: process.uptime(),
      workspaceCount: context.workspaces.length,
      sessionCount: 0, // resolved from FileSessionRepository
      memory: process.memoryUsage(),
    };
  }

  async handleTMinus(params: {
    target: string;
    sessionId?: string;
    prompt?: string;
    workspaceId?: string;
    sender: string;
    timestamp: string;
  }): Promise<{ accepted: boolean; reason?: string }> {
    // Validate cue freshness (reject cues older than 60s)
    const cueTime = new Date(params.timestamp).getTime();
    if (Date.now() - cueTime > 60_000) {
      return { accepted: false, reason: 'cue stale' };
    }

    // Route to internal controller
    // For MVP: write cue to .heddle/snail-shell/cues/ for the cue loop to pick up
    return { accepted: true };
  }
}
```

---

## 6. Patch Plan (Implementation Order)

### Phase 1: Core types & identity (minimal, zero risk)

| File | Change |
|------|--------|
| `src/snail-shell/types.ts` | Create — `SymphonyShellIdentity`, `Timbre`, `Track`, `FrequencyConfig` |
| `src/snail-shell/identity.ts` | Create — `SymphonyIdentityService.build()`, `fleetNodeId()` |
| `src/snail-shell/index.ts` | Create — re-export public types and service |

**Estimated work**: 1 hour  
**Risk**: None — pure data types and a stateless factory.

### Phase 2: Daemon plugin harness

| File | Change |
|------|--------|
| `src/snail-shell/integration/daemon-plugin.ts` | Create — `attachSnailShellToDaemon()` |
| `src/snail-shell/integration/fleet-cue-loop.ts` | Create — `SnailShellFleetCueLoop` |
| `src/core/runtime/daemon/types.ts` | Add optional `symphony?: SymphonyShellIdentity` to `ControlPlaneServerRecord` |
| `src/server/types.ts` | Add optional `snailShell?: {...}` to `HeddleControlPlaneServerOptions` |
| `src/server/lifecycle.ts` | After `listen()`, if `options.snailShell?.enabled`, call `attachSnailShellToDaemon()` |
| `src/cli-v2/commands/daemon-command.ts` | Add `--snail-shell` / `--snail-shell-timbre` / `--snail-shell-channel` CLI flags |

**Estimated work**: 3 hours  
**Risk**: Low — all changes are additive, toggled by an opt-in flag.

### Phase 3: JSON-RPC WebSocket server

| File | Change |
|------|--------|
| `package.json` | Add `"ws": "^8.18.0"` dependency |
| `src/snail-shell/rpc/server.ts` | Create — `SnailShellRpcServer` |
| `src/snail-shell/rpc/methods.ts` | Create — `SnailShellRpcMethodRegistry` |
| `src/snail-shell/rpc/workspace-methods.ts` | Create — workspace introspection RPC handlers |
| `src/snail-shell/rpc/session-methods.ts` | Create — session introspection RPC handlers |
| `src/snail-shell/rpc/fleet-methods.ts` | Create — identity, health, t-minus handlers |

**Estimated work**: 4 hours  
**Risk**: Low — WebSocket server is well-understood, using the same HTTP server.

### Phase 4: Session metadata enrichment

| File | Change |
|------|--------|
| `src/snail-shell/integration/session-metadata.ts` | Create — `annotateSessionWithSymphonyIdentity()` |
| `src/core/chat/engine/` | Minor change — after session create/update, call annotate function (guarded by config flag) |
| `src/server/control-plane-types.ts` | Add optional `symphony?: { identity: SymphonyShellIdentity }` to `ChatSessionView` |

**Estimated work**: 2 hours  
**Risk**: Low — optional metadata fields, no existing behavior changes.

### Phase 5: CLI & docs

| File | Change |
|------|--------|
| `src/cli-v2/commands/daemon-command.ts` | Parse Snail Shell flags and pass to lifecycle |
| `HEARTBEAT.md`, `AGENTS.md` | Document Snail Shell features |

**Estimated work**: 1 hour  
**Risk**: None.

---

## 7. Usage Examples

### Starting a Snail Shell daemon

```bash
# Basic activation
heddle daemon --snail-shell

# With explicit identity
heddle daemon --snail-shell \
  --snail-shell-timbre auditor \
  --snail-shell-channel fleet-canary \
  --snail-shell-group lucid

# Via env vars (good for Docker/CI)
SNAIL_SHELL_TIMBRE=weaver \
SNAIL_SHELL_CHANNEL=symphony-alpha \
SNAIL_SHELL_CUE_POLL_MS=10000 \
heddle daemon --snail-shell
```

### Querying from a Fleet agent

```python
# Python example: Fleet agent queries Heddle state
import json, asyncio, websockets

async def query_heddle():
    async with websockets.connect("ws://heddle-host:8765/ws/snail-shell") as ws:
        # Receive identity handshake
        hello = json.loads(await ws.recv())
        print(f"Connected to: {hello['params']['identity']['timbre']}")

        # List workspaces
        await ws.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "workspace.list",
            "params": {}
        }))
        resp = json.loads(await ws.recv())
        print(f"Workspaces: {resp['result']}")

        # Get fleet health
        await ws.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "fleet.health",
            "params": {}
        }))
        resp = json.loads(await ws.recv())
        print(f"Health: {resp['result']}")

asyncio.run(query_heddle())
```

### Sending a t-minus cue

```bash
# Simple: write a cue file that the daemon's cue loop picks up
echo '{"target":"heartbeat.run-tasks","sender":"fleet-master","timestamp":"2026-06-08T04:00:00Z"}' \
  > /home/user/project/.heddle/snail-shell/cues/t-minus-001.json
```

```python
# Advanced: via WebSocket
await ws.send(json.dumps({
    "jsonrpc": "2.0",
    "id": 3,
    "method": "fleet.t-minus",
    "params": {
        "target": "session.send-prompt",
        "sessionId": "session-abc-123",
        "prompt": "Review the current git diff",
        "sender": "fleet-master",
        "timestamp": "2026-06-08T04:00:00Z"
    }
}))
```

---

## 8. Future Extensions (Post-MVP)

| Feature | Description |
|---------|-------------|
| **Push subscriptions** | Add `session.events` subscription via WebSocket (mirroring existing tRPC subscription model). Fleet agents get real-time tool call events. |
| **Task dispatch** | Allow Fleet to create ad-hoc heartbeat tasks via RPC (`fleet.task.create`). |
| **Workspace cue directory** | Use OS-level file watchers (`fs.watch`) instead of polling for t-minus cues. |
| **Auth-layer** | Add API key or token-based authentication to the WebSocket endpoint. |
| **mTLS support** | For Fleet-to-Heddle communication across hosts. |
| **Batch cue processing** | Fleet sends a batch of cues in a single message for reduced overhead. |
| **Binary frames** | Use CBOR or MessagePack over WebSocket binary frames for large workspace/session payloads. |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|------------|
| WebSocket server conflicts with Express routes | `ws` attaches to the same HTTP server on a specific path (`/ws/snail-shell`), coexisting with Express and tRPC |
| Memory leak from unclosed WebSocket connections | `maxPayload` limit + connection-scoped cleanup on `close`/`error` events |
| Cue polling overhead | Poll interval unref'd so it doesn't keep process alive; tune via `SNAIL_SHELL_CUE_POLL_MS` |
| JSON-RPC parsing errors | Structured error responses per JSON-RPC 2.0 spec; invalid requests get clear error codes |
| Breaking existing daemon behavior | All Snail Shell features gated behind `--snail-shell` flag or `SNAIL_SHELL_*` env vars |
| `ws` dependency bloat | `ws` is ~400KB, pure JS, zero native deps, maintained by the Node.js ecosystem |

---

## 10. Summary

Snail Shell is a **< 500 line net addition** (types + RPC server + daemon plugin) that transforms Heddle from a single-user CLI agent runtime into a **Fleet-member node** with:

- **Fleet-discoverable identity** (timbre, track, frequency) baked into every session and runtime host
- **JSON-RPC wire protocol** over WebSocket for real-time state introspection
- **T-minus cue handling** for Fleet orchestration signals
- **Existing pattern reuse** — same EventEmitter, same tRPC controllers, same `RuntimeSubscriptionStream` patterns

The design is **incremental, opt-in, and non-breaking**. Each phase is independently ship-able. Phase 1–2 alone (identity + daemon plugin) provides immediate value by making Heddle nodes self-identifying to any Fleet/symphony discovery mechanism.
