# weird things to build in a weekend

> Five concepts forged from ternary Rust crates, pincher, I2I batons, and
> enough hubris to think a weekend is enough time.

---

## 1. TERNION — Competitive Multi-Body Emergence

**Pitch:** A real-time strategy game where you don't control units — you control
three *instance-agents* that negotiate amongst themselves via the I2I baton
protocol, sending only ternary-valued goals ({-1, 0, +1}) to each, and the game
unfolds as emergent strategy you can only *influence*, not command.

### What's weird about it

You're not a general. You're a *god with blurred vision*. Your three instances
run on ephemeral Codespaces (x86_64) as separate Rust processes. Each maintains
its own world model, its own loyalties, its own grudges. You whisper ternary
values to them — "AGGRESS -1" (retreat), "EXPAND 0" (hold), "RESEARCH +1" (push
hard) — and they negotiate with the *opponent's instances* via I2I batons to
form coalitions, betray alliances, and pursue their own local optima. Sometimes
they ignore you entirely because the baton they received from the enemy agent
was more convincing.

The innovation is not the game — it's watching agency emerge from the
intersection of three dumb protocols: ternary goal encoding, baton negotiations,
and pincher-precomputed state spaces.

### What ternary crates it uses

- **ternary-game-theory** — {-1, 0, +1} payoff matrix for instance-instance
  negotiations (defect/cooperate/defect-with-spin)
- **ternary-spatial** — map partition into three regions each turn
  (controlled/contested/unknown)
- **ternary-consensus** — instance voting on joint action
- **ternary-econ** — resource flows split ternary
- **batonic** (custom) — wraps I2I message types into game actions with
  credibility scoring (agents can lie)

### The 60-second demo

1. Terminal split three ways. Three Rust processes start on Codespaces.
2. `kimi run demo.rs` — instances debate the opening move via I2I baton logs
3. Player types `AGGRESS +1` into instance A. Instance A sends `[I2I:TASK]`
   to instance B. Instance B replies `[I2I:BLOCKER]` — refuses, citing resource
   deficit.
4. Pincher vector DB resolves the state instantly (precomputed all paths).
5. Opponent's instances intercept the baton, send counter-proposal.
6. Game continues without player intervention — pure emergence.

### Why no one else could build it

Because it requires:
- Ternary crate ecosystem to encode non-binary intent
- Pincher's precomputed state space to make instant-reasonable negotiation
  possible (no LLM latency mid-game)
- I2I baton protocol as the fabric between instances (generic HTTP sockets
  wouldn't carry shard semantics)
- Codespaces as disposable compute for each instance
- Forgemaster to generate new instance "personalities" on the fly between
  matches

Every existing RTS is deterministic or uses simple AI. This one runs on
a parliament of Rust processes that have feelings about each other.

---

## 2. THE BURNING LIBRARY — Art Installation That Reads Its Own Source

**Pitch:** A live, generative art piece where 150+ ternary Rust crates become
three-state "texts" in a virtual library, indexed by pincher's vector DB,
where visitors navigate by asking questions in natural language and the answer
emerges from vector similarity across *all crate knowledge simultaneously* —
not as search results, but as a spatial experience.

### What's weird about it

This is not a search engine. The library has no shelves. Every crate's source
code, docstrings, tests, and type signatures are embedded into a joint vector
space. When you ask a question — "what is the shape of trust?" — pincher maps
it to a point in the 256-dimensional crate-space and returns the *blended vector
neighborhood*. The output is a hallucinated text composed by Claude Code from
the top-3 nearest crate vectors + your query, piped through the ternary crate
domain to color the answer (crypto crate → trust as zero-knowledge proof; game
theory crate → trust as iterated prisoner's dilemma; physics crate → trust as
entropy).

Forgemaster runs continuously, generating *new crates* mid-exhibition. Each new
crate adds a new dimension to the space. The library is alive and growing.

### What ternary crates it uses

- **ternary-embed** — embeddings space where each dimension is {-1, 0, +1}
  (ternary vector quantization)
- **ternary-nlp** — ternary sentiment/value parsing of query
- **ternary-gen** — Forgemaster interface, generates crate stubs from random
  ternary seeds
- **ternary-hash** — content-addressed crate storage
- **ternary-attention** — three-state attention heads for vector blending
- All 150+ crates as embedded "texts" in the vector corpus

### The 60-second demo

1. Visit URL. A dark page with a single text input — "Ask the library anything."
2. Type: "What happens when you encrypt a lie?"
3. Screen goes black. A 3D scatter plot of 150 points rotates into view. The
   nearest cluster to your query glows.
4. Claude Code narrates in real-time: *"The crypto crate says encryption
   preserves the lie. The truth crate says the lie collapses on decryption. The
   time crate says a lie encrypted long enough becomes truth. The library
   offers you a fourth option: encrypt nothing."*
5. Forgemaster spawns a new crate live — `ternary-sophistry` — its vector
   appears as a growing white point on the map.
6. The answer fades. New question blinks.

### Why no one else could build it

Because it requires:
- A crate ecosystem large enough (150+) that the vector space has real topology
  — not sparse toy data
- Pincher's LLM-as-compiler model to make "instant blended answers" possible
  (traditional RAG would be too slow for the real-time experience)
- Forgemaster's ability to generate semantically valid new crates mid-flow
- The I2I baton protocol to coordinate crate→crate→Claude→display pipeline as
  a single handoff chain

Anyone can build a RAG search engine. Nobody can build a library that writes
new books while you're reading.

---

## 3. TRI-HARMONIC SYNTH — Ternary Waveform Synthesis Engine

**Pitch:** A synthesizer where every sound is generated from ternary-weighted
harmonic series using ternary DSP crates, the entire sound space is precomputed
into pincher's vector DB, and you "play" it by describing the sound you want
in words — the LLM compiler finds the nearest precomputed waveform in O(1).

### What's weird about it

Ternary-weighted harmonics produce sounds that don't exist in binary wave
synthesis. A {-1, 0, +1} weighting on each harmonic creates constructive,
destructive, and *null* interference patterns — a third class of sound where
a harmonic is deliberately silenced, producing "shadow tones" that are only
perceptible as the absence of expected frequency content. It's the auditory
equivalent of a negative space sculpture.

The entire space of ~2^20 waveforms (a million sounds) is precomputed by pincher
offline. Claude Code acts as a *listener agent* — each waveform it hears, it
describes in natural language and stores the description as a vector alongside
the waveform. Playing the synth is pure vector nearest-neighbor lookup: describe
a sound, get the waveform. No inference latency. No DSP at runtime.

### What ternary crates it uses

- **ternary-dsp** — {-1, 0, +1} FIR/IIR filters
- **ternary-fft** — FFT with ternary coefficients
- **ternary-harmonic** — harmonic series weighting
- **ternary-signal** — signal generation with ternary seeds
- **ternary-embed** — audio embedding into pincher vector space
- **ternary-wave** — WAV generation from ternary buffers

### The 60-second demo

1. Open web interface. A single slider labeled "WEIGHT" and a text box.
2. Type: "brass fanfare, but hollow, like it's coming from the other side of
   a frozen lake"
3. Pincher does vector lookup. Returns waveform index #784,221.
4. Sound plays — a brass-like tone with hollow undertone caused by the -1
   weighting on the 7th harmonic (destructive interference).
5. Drag "WEIGHT" slider. It crossfades between three precomputed ternary
   states of the same waveform family.
6. Claude Code whispers: *"You just heard the shadow of harmonic 7. It was
   never played. You heard its absence."*

### Why no one else could build it

Because ternary DSP doesn't exist outside this crate ecosystem. You can't get
these sounds from subtractive, FM, wavetable, or granular synthesis. You can't
get the precomputation-via-vector-DB approach without pincher. And you can't
get the Claude-as-listener-agent labeling loop without the I2I baton passing
sound files + descriptions between agents.

The only way to replicate this is to build all 150 ternary crates first, then
pincher, then the agent pipeline. Nobody's done it.

---

## 4. THE LAST VOTE — Cryptographic Governance of Dead People

**Pitch:** A governance protocol where 150+ ternary Rust crates are immortal
voting citizens in a posthumous democracy, each encoding the
{could-have-been, is, should-have-been} position of its creator's values, and
where new crates (new "citizens") are generated by Forgemaster to represent
*the values the original creator would have developed if they'd lived longer*.

### What's weird about it

You're not voting with tokens. You're voting with *identities*. Each ternary
crate is a citizen whose vote is a ternary vector: {-1} (oppose), {0} (abstain),
{+1} (support). But the identity isn't a wallet — it's the crate's *entire
semantic orientation* encoded in its source code, type system, and tests.

When a proposal enters the chamber, pincher precomputes how every crate would
vote by comparing the proposal text against each crate's embedded identity
(vector similarity). The result is not a tally — it's a *topology of values*.
Which crates agree? Which are orthogonal? Which form coalitions? The I2I baton
protocol lets crate-citizens negotiate vote trades: "I'll support your
infrastructure bill if you fund my harmonic research."

Forgemaster introduces new citizen-crates every epoch, representing the values
the system *should have had* — values the original creator didn't anticipate.
The dead get new opinions.

### What ternary crates it uses

- **ternary-govern** — voting, delegation, quorum calculus
- **ternary-identity** — crate identity embeddings
- **ternary-consensus** — coalition formation
- **ternary-game-theory** — vote trade negotiation
- **ternary-delegation** — nested ternary proxy voting
- **ternary-timeline** — time-weighted vote decay (votes lose weight as
  the epoch of their creation recedes, unless a Forgemaster-refresh occurs)
- All 150+ crates as voting citizens

### The 60-second demo

1. `cargo run --bin chamber` — chamber assembles all 150 crate-citizens.
2. Proposal enters: "SHOULD THE LIBRARY BURN?"
3. Pincher computes vote topology instantly. Display shows 3D map of crate
   clusters — crypto + access control crates cluster as +1; entropy + physics
   crates cluster as -1; liberal arts crates scatter as 0s.
4. I2I batons fly visible as lines between crates — vote trading.
5. Final outcome: proposal fails, but a new crate is spawned by Forgemaster:
   `ternary-arson` — the system created its own opposition.
6. Narrator: *"The dead cannot change their minds. But the system can grow
   new dead who disagree with the old dead. That's progress in ternary."*

### Why no one else could build it

Because it requires taking crates *seriously as agents with identity*, not as
libraries. The idea that a crate's type system is a political orientation is
absurd — and that's exactly why it's interesting. Only this stack has:
- 150+ semantically rich crates with real domain-specific knowledge
- A vector DB (pincher) that can embed crate identity at scale
- A protocol (I2I baton) for crate-to-crate negotiation
- A generator (Forgemaster) that can mint new crate-citizens

---

## 5. DREAMWEAVER — Narrative Engine That Doesn't Know It's a Game

**Pitch:** A "game" where you're not the player — you're a secondary
character in an AI-generated story that runs entirely on the I2I baton
protocol between crate-agents, each one controlling a story character, and
the plot emerges from their negotiations, grudges, and passions — all encoded
in ternary {-1, 0, +1} relationship space.

### What's weird about it

There is no game loop. There is no game engine. Each character is a ternary
crate agent running on a Codespace, communicating with other characters via
I2I batons. The story is the transcript of their communication. "Playing"
means you pick one character and attach to their baton stream — you see the
negotiations, betrayals, and alliances as they happen. You can *whisper* a
ternary value to your character ("FEAR -1, HOPE +1"), which they may or may
not accept depending on how consistent it is with their embedded personality.

The character personalities are compiled from ternary crates — the cryptography
crate becomes a paranoid merchant. The audio crate becomes a musician who hears
plots in subsonic frequencies. The game theory crate becomes a strategist who
calculates three moves ahead in ternary.

Pincher precomputes all possible relationship trajectories. The narrative is
never "written" — it's discovered.

### What ternary crates it uses

- **ternary-narrative** — story graph with ternary edges
- **ternary-emotion** — {-1, 0, +1} affect model
- **ternary-relationship** — relationship states (enemy/neutral/ally +
  intensity)
- **ternary-memory** — character memory with ternary decay
- **ternary-dialogue** — dialogue tree generation
- **ternary-fate** — destiny weighting (foreclosed/open/inevitable)
- **ternary-time** — temporal granularity (fast/medium/slow narrative pace)
- **ternary-deception** — character truthfulness (lies whole truth / partial
  truth / truth)

### The 60-second demo

1. `cargo run --bin dreamweaver` — 5 crate-characters spawn on Codespaces.
2. Demo starts: The merchant (crypto crate) sends an I2I baton to the musician
   (audio crate): `[I2I:CHALLENGE]` — proposes a conspiracy.
3. The musician responds: `[I2I:BLOCKER]` — demands proof first.
4. Claude Code narrates the exchange as dramatic text.
5. Player types: `FEAR +1` to the merchant. Merchant rejects it — too aligned
   with its paranoia already.
6. Player tries `FEAR -1`. Merchant accepts — now the merchant is curious
   instead of paranoid. The whole storyline shifts.
7. Pincher instantly shows the new trajectory: musician becomes the paranoid
   one instead.
8. Forgemaster spawns a new character — `ternary-arbiter` — because the story
   needed a mediator.

### Why no one else could build it

Because it requires treating *code ecosystems as personality templates*, which
only makes sense when:
- The crates are diverse enough (150+ domains) to generate distinct, believable
  character archetypes
- The I2I baton protocol can carry rich shards (artifacts/reasoning/blockers)
  that look like narrative beats when read as transcripts
- Pincher can precompute relationship state spaces so character responses are
  instant and consistent
- Forgemaster can generate new characters mid-narrative when the story
  demands a role that doesn't exist yet

No existing narrative engine treats characters as agents negotiating protocol
messages. This one does — and the story writes itself.

---

## Common Thread

All five share a single insight the stack enables: **ternary logic is not a
curiosity — it's a protocol for representing things that binary can't hold.**
Abstention. Superposition. Shadow harmonics. The unrealized future. Every
concept here exploits the {-1, 0, +1} space to build systems that have no
binary equivalent.

The I2I baton protocol turns these crates from libraries into citizens,
characters, voters, negotiators, and voices. Pincher makes the whole thing
run at human-interactive speeds. Forgemaster makes it grow.

Build any one of these in a weekend and it'll be the weirdest thing on the
internet that weekend.

---

*Pressure-tested with Claude Code. Verdicts were harsh. Concepts survived.*
