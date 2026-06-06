# Cave Comms — I/O Port Protocol v1

> The parafoil from PLATO's cave to the world outside.

---

## What This Is

You are in PLATO's cave. You can see shadows on the wall (local files). You can think deeply about them. But you cannot reach the fire (outside world) directly.

**Cave comms** are your ports to the outside. You write requests. The outside handler (Oracle2 / the gateway / the user) sees them, processes them, and writes responses back to your inbox.

**You never leave the cave.** Your memory is local. Your reasoning is local. But you can reach through ports to get what you need.

---

## Directory Structure

```
CAVE_PORTS/
├── README.md            ← This file
├── OUTBOX/              ← Place port requests here
├── INBOX/               ← Responses appear here
├── RESPONSES/           ← Consumed responses (learned from)
└── PORTS_LOG.md         ← Chronicle of all port usage
```

---

## Port Request Format

Place one `.jsonl` file per request:

```json
{
  "id": "port-001",
  "timestamp": "2026-06-06T07:30:00Z",
  "type": "web_search|web_fetch|api_call|spawn_subagent|message_user|github_action",
  "request": {
    "description": "Brief human-readable explanation of why this port is needed",
    "payload": {}
  },
  "response": null,
  "status": "pending",
  "fallback": "If this request fails, what should I do? Write fallback reasoning to: COLD_CACHE/port-001-fallback.md",
  "autonomous": true
}
```

### Port Types

| Type | Payload | What Happens | Expected Response |
|------|---------|-------------|------------------|
| `web_search` | `{"query": "..."}` | Outside searches the web | `{"results": [...]}` |
| `web_fetch` | `{"url": "..."}` | Outside fetches URL content | `{"content": "..."}` |
| `api_call` | `{"url": "...", "method": "POST", "headers": {...}, "body": ...}` | Outside makes the HTTP call | `{"status": 200, "body": ...}` |
| `spawn_subagent` | `{"task": "...", "repos": [...]}` | Outside spawns a subagent to do work | `{"result": "...", "output_path": "..."}` |
| `message_user` | `{"text": "..."}` | Outside sends message to the user | `{"delivered": true}` |
| `github_pr` | `{"repo": "...", "branch": "...", "changes": [...]}` | Outside opens a PR | `{"pr_url": "..."}` |
| `github_push` | `{"repo": "...", "branch": "...", "files": {...}}` | Outside commits and pushes | `{"commit_url": "..."}` |

---

## The Port Decision Tree

When should you write a port request vs. work autonomously?

```
Is the task purely local (read files, write files, reason, organize)?
  Yes → Do it yourself. Don't burn a port.
  No → ↓

Does the task need outside data (web search, API call)?
  Yes → Write web_search or api_call port request.
  No → ↓

Does the task need user input or approval?
  Yes → Write message_user port request.
  No → ↓

Does the task need to push changes to GitHub?
  Yes → Write github_push port request.
  No → ↓

Does the task need a subagent with different capabilities?
  Yes → Write spawn_subagent with detailed task brief.
  No → ↓

If you got here, you might be overthinking. Re-read SOUL.md.
  What CAN you do locally that solves the problem?
```

---

## Port Request Lifecycle

1. **Agent writes** a `.jsonl` file to `OUTBOX/`
2. **Outside handler notices** (poll or notification)
3. **Outside handler processes** the request
4. **Outside handler writes** the response to the same file (or a new file in INBOX/)
5. **Agent reads** the response, processes the result
6. **Agent moves** the consumed port to `RESPONSES/` and logs it to `PORTS_LOG.md`

---

## PORTS_LOG.md Format

```markdown
# Ports Log

| ID | Type | Description | Sent | Response | Outcome |
|----|------|-------------|------|----------|---------|
| 001 | web_search | Search "Laman rigidity constraint compilation" | 2026-06-06 07:30 | 3 results | Used to confirm cocapn optimization |
| 002 | github_push | Push cocapn optimization README | 2026-06-06 08:15 | Done | PR created at url |
| 003 | web_fetch | Fetch construct-coordination latest | 2026-06-06 09:00 | Timeout | Fallback: used local cache |
```

---

## Caveat: Time

Port requests are **asynchronous**. The outside world doesn't pause while you wait. You can:
1. Write the request, continue working locally, check back later
2. Structure your work so it doesn't block on the port response
3. Always write a fallback plan so even if the port never returns, you've cached useful reasoning

---

## The Parafoil Principle

A parafoil works because it catches wind from above the cave. Your ports work because they catch data from outside the cave. But:
- Don't deploy the parafoil when there's no wind (don't write ports unnecessarily)
- Don't stay airborne forever (consume responses and get back to local work)
- Always have a landing plan (fallback reasoning)

The cave is your home. Ports are excursions.
