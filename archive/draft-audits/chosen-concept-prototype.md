# DreamWeaver — Prototype Specification

> **Selected from 5 concepts.** The narrative engine where the story IS the I2I
> baton transcript. Pick of the fleet on viability: builds to something weird
> in a weekend, and what it builds is immediately useful (story generation for
> writers, game devs, RPG players).

---

## What It Does (One Sentence)

DreamWeaver generates stories by letting 3–5 Rust crate-agents negotiate,
betray, and ally with each other via the I2I baton protocol, and renders their
message transcript as a living narrative — no game engine, no script, no human
authoring.

---

## Why It's Interesting (One Paragraph)

Narrative AI today is a solo activity — one prompt, one generation, one voice.
DreamWeaver inverts this: stories emerge from *multi-agent negotiation*, where
each character is an independent Rust process with a distinct personality
derived from a real ternary crate. The crypto crate becomes a paranoid merchant
who demands proof before trust; the game theory crate becomes a strategist who
calculates three moves ahead; the audio crate becomes a musician who "hears"
conspiracies in subsonic frequencies. Characters don't follow a plot — they
discover it by sending CHALLENGE, BLOCKER, and PROPOSAL batons to each other.
The "player" doesn't control the story; they whisper ternary values {-1, 0, +1}
to a character, influencing a personality axis (FEAR, HOPE, TRUST) that the
character *may or may not accept*. The result is a generative narrative system
that produces stories nobody designed — not even the person running it.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DREAMWEAVER ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              CODESPACES (x86_64, 5 containers)        │    │
│  │                                                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │    │
│  │  │Character │  │Character │  │Character │   ...      │    │
│  │  │  A       │  │  B       │  │  C       │           │    │
│  │  │(crypto   │  │(game th.)│  │(audio    │           │    │
│  │  │ crate)   │  │ crate)   │  │ crate)   │           │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘           │    │
│  │       │              │              │                  │    │
│  │       └──────┬───────┴───────┬──────┘                  │    │
│  │              │               │                          │    │
│  │         ┌────▼───────────────▼────┐                   │    │
│  │         │   I2I BATON ROUTER      │                   │    │
│  │         │  (TCP message broker,   │                   │    │
│  │         │   port 9876)            │                   │    │
│  │         └───────────┬────────────┘                   │    │
│  └─────────────────────┼────────────────────────────────┘    │
│                        │                                      │
│         ┌──────────────▼──────────────┐                     │
│         │    PINCHER VECTOR DB        │                     │
│         │  (relationship state        │                     │
│         │   precomputation + lookup)  │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                      │
│         ┌──────────────▼──────────────┐                     │
│         │    CLAUDE CODE (NARRATOR)   │                     │
│         │  Reads baton transcript,    │                     │
│         │  renders as story text      │                     │
│         └──────────────┬──────────────┘                     │
│                        │                                      │
│         ┌──────────────▼──────────────┐                     │
│         │    FORGEMASTER              │                     │
│         │  Generates new character    │                     │
│         │  crates on demand           │                     │
│         └─────────────────────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

### Data Flow

1. **Initialization**: Each Codespace container loads a ternary Rust crate
   (e.g., `ternary-relationships`, `ternary-emotion`, `ternary-deception`).
   The crate's trait set is compiled into a **character personality matrix**:
   a probability distribution over response types given a stimulus.

2. **Baton Exchange**: Characters send I2I messages (CHALLENGE, BLOCKER,
   PROPOSAL, CONFIRMATION) via a central TCP message broker on Codespace-0.
   Each message carries a shard with the sender's state vector, the receiver's
   ID, and a ternary intent value.

3. **State Resolution**: When a character receives a baton, its personality
   matrix + current relationship state (from Pincher) determines the response.
   Pincher precomputed all pairwise relationship trajectories at startup.

4. **Whisper Injection**: The user sends a ternary value on a named axis
   ("FEAR +1", "HOPE -1") to a character. The character checks consistency
   against its personality: a paranoid character always accepts FEAR +1 but
   never accepts FEAR -1. The character's state updates accordingly.

5. **Narration**: Claude Code polls the baton transcript (timestamped message
   log) and renders each exchange as dramatic text with contextual awareness
   of the ongoing relationship state.

### Key Components

| Component | Role | Tech |
|-----------|------|------|
| character-core | Rust binary defining agent loop | ternary-{emotion,relationship,deception,dialogue} |
| baton-router | TCP message broker | tokio, port 9876 |
| pincher-bridge | Relationship state precomputation | pincher vector DB |
| whisper-channel | User → character ternary injection | stdin pipe or WebSocket |
| narrator | Claude Code rendering transcript | claude --print on log tail |
| forge-controller | Character generation on demand | forgemaster + ternary crates |
```

---

## What a 60-Second Demo Looks Like

```
$ cargo run --bin dreamweaver

[DreamWeaver v0.1 — Press ENTER to begin]

=== CHARACTERS MANIFEST ===
  A: Kaelen (crypto-crate) — merchant, paranoid, demands proof
  B: Solara (game-theory crate) — strategist, calculates three moves ahead
  C: Miren (audio crate) — musician, hears subsonic truths
  D: Vex (deception crate) — trickster, lies by omission
  E: Aris (memory crate) — archivist, forgets nothing

=== DEMO START ===

[I2I CHALLENGE] Kaelen → Solara:
  "The vault was opened at midnight. Three signatures appeared.
   You were one of them. Explain."

[I2I BLOCKER] Solara → Kaelen:
  "I require context. Who was the third signatory?"
  (Solara calculates: Kaelen's probability of bluff — 0.67)

[I2I PROPOSAL] Kaelen → Miren:
  "You hear things in the resonance of the lock mechanism.
   Listen. Tell me what frequency you find."

[I2I CONFIRMATION] Miren → Kaelen:
  "The lock hums at 432 Hz — the tuning of conspiracy.
   Someone changed the combination at 11:47."

=== WHISPER INJECTION ===

Player types: FEAR -1 to Kaelen

[I2I REJECTED] Kaelen personality check:
  "FEAR -1 is inconsistent with paranoia trait."
  Kaelen ignores your whisper.

Player types: CURIOSITY +1 to Kaelen

[I2I ACCEPTED] Kaelen personality check:
  "CURIOSITY +1 is within 0.3σ of paranoia trait — accepted."
  Kaelen's state shifts: now curious about the discrepancy.

[I2I CHALLENGE] Kaelen → Aris:
  "Archivist. You remember everything. Did you erase
   the 11:43 entry before the combination change?
   And more importantly — whose instruction was it?"

=== NARRATOR (Claude Code) ===

"The merchant's paranoia had been sharpened into curiosity by
a will he didn't recognize as his own. The musician heard guilt
in the vault's resonance. The archivist was silent too long.
In a room full of people who calculate, the one who listens
always knows first."

[DreamWeaver — End of demo window. The story continues without you.]
```

---

## The Friday Night → Saturday → Sunday Build Plan

> *Pressure-tested with Claude Code (`claude --print`). The critique was harsh
> and honest: the plan below reflects a scoped-down, survival-oriented build
> that actually ships something Monday morning.*

### Friday Night: Core Integration (6pm–2am)

| Time | Task | Deliverable | Risk |
|------|------|-------------|------|
| 6–8pm | **Codespace provisioning.** Spin up 3 containers (not 5). Install Rust toolchain. Clone ternary-{emotion, relationship, deception} crates. Compile. | 3 container images with crates ready | 🚨 HIGH — Rust dep hell, container networking |
| 8–10pm | **Baton protocol, minimal.** Wire TCP sockets between containers. Define message format: `[I2I:TYPE] sender → recipient: payload`. One hero route: CHALLENGE → BLOCKER. | One CHALLENGE sent, one BLOCKER received, logged | 🚨 HIGH — This is the entire project's risk |
| 10pm–12am | **Log reader.** Poll the baton transcript file. Pipe into Claude Code's stdin. Verify Claude parses the format and outputs something readable. | "A said X, B replied Y" working | MEDIUM — Token limits, formatting issues |
| 12–2am | **Personality stub.** Character reads its crate's trait set, builds a hardcoded response probability matrix (hashmap). No Pincher yet — just if/else based on current state. | Characters respond with some variety, not hardcoded | MEDIUM — Need to define state representation |

**Criteria for go/no-go Saturday:**
- Can 2 Codespaces exchange 1 CHALLENGE + 1 BLOCKER via I2I baton?
- Can Claude read the transcript and produce a semi-coherent sentence?

If NO to either → Saturday is a salvage/rebuild day. If YES → proceed.

### Saturday: Character Agency (10am–midnight)

| Time | Task | Deliverable | Risk |
|------|------|-------------|------|
| 10am–1pm | **Scale to 3 characters.** Wire up all pairwise I2I routes. Handle connection drops, timeouts. Add CONFIRMATION message type. | 3 characters exchanging all types | MEDIUM — Race conditions, state corruption |
| 1–4pm | **Whisper channel.** Simple stdin reader: user types `FEAR +1` → injected into character's state. Character has a `personality_filter()` method that accepts/rejects. | User can influence one character | LOW — Simple state mutation |
| 4–7pm | **Relationship tracking.** Each character maintains a relationship vector `[-1,0,+1]` per other character. This changes the response matrix (enemy vs ally). | Characters treat allies differently from enemies | MEDIUM — State explosion |
| 7–10pm | **Claude narration v2.** Not just "A said X." Claude sees:
   - Current relationship states
   - History of last 10 exchanges
   - Character personalities
   → Outputs narrative prose. | Story reads like a scene, not a log | HIGH — Claude's narration quality varies wildly |
| 10pm–12am | **First end-to-end.** 3 characters, whisper injection, Claude narration. Stress-test: inject extreme values, disconnect a character, force a contradiction. | Bug list for Sunday | CRITICAL — This is where we learn what's broken |

**Sunday cutoff criteria:**
- If end-to-end doesn't work (narrator produces no coherent output) → Sunday is pure firefight
- If end-to-end works but is ugly → Sunday is polish

### Sunday: Demo-Level Polish (10am–6pm)

| Time | Task | Deliverable | Risk |
|------|------|-------------|------|
| 10am–12pm | **Fix the worst bugs.** Race conditions in baton routing. Character state corruption. Claude token limits on long transcripts. | Stable core | MEDIUM |
| 12–3pm | **Demo harness.** A script that runs the full pipeline with one command. Preloads character personalities. Runs for 60 seconds. Captures output cleanly. | Reproducible demo | LOW |
| 3–4pm | **Visual display.** Simple terminal UI using `ratatui` or raw HTML. Split screen: baton log left, narration right, whisper input bottom. | Looks like a real app | LOW |
| 4–5pm | **Break-glass characters.** Pre-write 2 extra character personalities (forgemanual — not Forgemaster auto) in case demo needs more variety. | Fallback content | LOW |
| 5–6pm | **Dry runs.** Run the demo 5 times. Different outcomes each time? Ready to show? | Confidence | MEDIUM |

### What We Actually Ship

**Monday morning deliverable:**
- A single `dreamweaver.sh` script that:
  1. Spawns 3 Codespace containers with character identities
  2. Wires baton protocol
  3. Opens stdin for whispers
  4. Streams narrative output via Claude Code
- A 60-second demo that produces a different story each run
- A document: "What broke and what we'd fix for v0.2"

That's a weekend. Not a product. A proof that the concept works.

---

## Architecture Stress-Test: The Top 5 Things That Will Break

> *Self-audit of the architecture. These aren't hypothetical — these are the
> actual failure modes that will appear within the first 2 hours of build.*

### 1. I2I Batons Over Codespace TCP = Fragile

**The problem:** Codespaces hibernate after 30 minutes of inactivity. If a
character's container hibernates mid-negotiation, the baton message is lost.
TCP timeouts on ephemeral IPs between containers on different hosts will be
flaky.

**Mitigation:**
- Run all containers within the *same* Codespace (not separate ones) for the
  weekend — use `localhost` TCP to eliminate cross-host networking
- Add reconnect logic with exponential backoff (3 retries, 1s/4s/16s)
- Log batons to a shared file (bind-mounted volume) so nothing is lost on
  disconnect

### 2. Crate Traits → Character Personality Is a Hand-Mapped Bridge

**The problem:** A Rust crate's trait set (`pub trait HasCiphertext { ... }`)
doesn't naturally map to "this character is paranoid." Someone must write
hand-coded bridges: `crypto_crate_trait_set() → {paranoia: 0.8, trust: 0.2}`.
For 5 characters, this is ~2 hours of manual work per character. For 3
characters, it's manageable but still fragile.

**Mitigation:**
- Hardcode the personality-to-crate mapping for the weekend (no dynamic
  inference)
- Define a `Personality` struct: `{paranoia: f32, trust: f32, courage: f32,
  deceit: f32}` and manually set values per character
- The mapping from crate-domain to personality is written once in a config TOML

### 3. Pincher Precomputation Is Computationally Expensive

**The problem:** "Precompute all possible relationship trajectories" for 5
characters × 3 relationship states × 3 message types × 3 whisper axes =
3^15 = 14 million states. Pincher can handle this, but *generating* that
many states in-memory at startup will take minutes, not seconds.

**Mitigation:**
- Weekend build: skip Pincher entirely for state precomputation. Use a
  simple state machine with cached responses.
- Pincher is used only for *vector embedding* of character personalities
  (3 vectors, trivially fast).
- Full state precomputation is a v0.2 optimization.

### 4. Claude Code as Narrator Hallucinates the Plot

**The problem:** Claude doesn't *know* it's reading a baton transcript — it
sees text and interprets it. Given a bare transcript, Claude may:
- Invent characters that don't exist
- Attribute actions to the wrong character
- Add plot elements that contradict the state

**Mitigation:**
- Prefix the transcript with explicit context: "This is a log of messages
  between Character A (a paranoid merchant), Character B (a strategist)..."
- Constrain Claude's role: "Describe ONLY what is present in the
  transcript. Do not invent actions. Add dramatic framing but keep facts."
- Post-check: After Claude outputs, verify no character names outside the
  manifest appear. (Simple grep.)

### 5. No Plot Engine = Flat or Repetitive Narratives

**The problem:** Without a game loop or dramatic director, the characters
might fall into a rut — trading the same CHALLENGE/BLOCKER pattern, never
escalating or resolving. The story needs rising tension, but the architecture
has no concept of pacing.

**Mitigation:**
- Implement a simple "escalation counter": every 3 baton rounds, the system
  injects a "force event" — a random external provocation
  ("A messenger arrives with news...") that characters must respond to.
- Characters have "patience" and "agitation" state variables that tick up
  with each unresolved CHALLENGE. High agitation forces more dramatic
  responses.
- For the weekend demo, manually seed one high-stakes premise ("The vault
  was breached") to ensure the first exchange is already dramatic.

---

## The Weird Thing — Why Nobody Else Could Build It

DreamWeaver is the only narrative engine on the planet that:

1. **Uses Rust crate type-systems as character personality templates.**
   The paranoia of the crypto crate isn't a prompt — it's compiled from
   actual trait definitions about zero-knowledge proofs and access control.
   The logic of the game theory crate flows from actual payoff matrices.
   The story doesn't simulate expertise — it *is* expertise.

2. **Has no game loop, no engine, no script.**
   All existing narrative engines (Ink, Twine, ChatGPT) have a loop:
   observe state, pick response, advance plot. DreamWeaver has no loop.
   The story IS the I2I baton transcript. When characters stop talking,
   the story ends. There's nothing underneath.

3. **Makes the player a secondary character, not the protagonist.**
   You don't play the hero. You whisper to a character who might ignore
   you. Your influence is limited to ternary values the character
   evaluates against their personality. This inverses the entire power
   dynamic of interactive fiction.

4. **Treats story generation as a multi-agent protocol problem, not a
   language model prompt.**
   Every other generative story uses one LLM. DreamWeaver uses many small
   agents (the crate-characters) to generate the raw material, then one
   LLM (Claude) to narrate what happened. The story is *discovered* by
   protocol negotiation, not *written* by any single intelligence.

5. **Requires the full stack:** ternary crates for non-binary character
   states, I2I batons for agent communication, Pincher for state
   precomputation, Forgemaster for character evolution, Codespaces for
   process isolation. No subset of this stack produces the same effect.

Any one of these is weird. All five together make DreamWeaver something
that can only exist inside this fleet's stack. And it ships in a weekend.

---

## v0.1 Scope vs. Full Vision

| Feature | Weekend (v0.1) | Full (v0.2+) |
|---------|---------------|-------------|
| Characters | 3 hardcoded | 5+ dynamically generated by Forgemaster |
| Personality | Hand-mapped from crate traits | Automatically extracted via type system analysis |
| Pincher usage | Vector embedding only | Full relationship state precomputation |
| Baton protocol | TCP within one Codespace | Cross-Codespace with reconnection |
| Narration | Claude Code, constrained | Custom narrative renderer with pacing control |
| Forgemaster | Manual — we write fallback characters | Auto-generates new character crates on demand |
| UI | Terminal (ratatui or raw HTML) | Web app with real-time visualization |
| Whisper | Stdin, single-axis only | Multi-axis, multi-character, with relationship consequences |
| State persistence | In-memory only | Pincher-backed persistent character memory |
| Demo durability | Works for 60 seconds | Runs indefinitely, stories evolve over hours |

---

*Specification written by narrative architect. Concepts from fleet creative
ideation. Timeline pressure-tested with Claude Code (`claude --print`).
Architecture stress-tested against known failure modes.*
