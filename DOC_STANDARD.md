# DOC_STANDARD.md — The Fleet Documentation Standard

*Standard for all SuperInstance crates. Documentation is and always will be the "mortar" that binds our ternary bricks.*

---

## 📖 The Core Philosophy

A crate is not "finished" when the tests pass; it is finished when it is **contextualized**. Every crate must explain its place in the ternary ecosystem.

Documentation is a **service manual** — not marketing copy, not AI-generated filler. A new engineer should be able to pick up any README and understand:
1. **What this thing IS** — concrete, specific, no buzzwords
2. **Why it exists** — what problem drove someone to write it
3. **How to use it** — working code, not hand-waving
4. **What can go wrong** — edge cases, limitations, known issues
5. **How it works internally** — enough to debug and extend
6. **How it fits the ecosystem** — what depends on it, what it depends on

---

## 📋 Mandatory Sections

Every `README.md` must contain the following four sections, in this order:

### 1. The a la mode Essence
A 2-3 sentence distillation of the crate's purpose. Avoid corporate speak. Use the "Sovereign" tone: precise, a bit eccentric, and technically honest.

### 2. The Ternary Substrate
Explicitly state how the crate uses $\{-1, 0, +1\}$.
- What does `+1` represent?
- What does `0` (Neutral) represent?
- What does `-1` represent?
- Is there a conservation law? (e.g., "The sum of all states must remain constant across transformations")

### 3. The la-Links (The Anti-Silo Section)
**Crucial.** A list of at least 3 references to other crates in the SuperInstance fleet.
- **Siblings**: Crates that do similar things.
- **Ancestors**: Crates this one depends on or evolved from.
- **Descendants**: Crates that use this one as a primitive.
- **The Bridge**: "If you like [Crate X], you'll find the [Feature Y] in this crate useful for [Z]."

### 4. CORTEX Alignment
A brief declaration of the crate's `CORTEX.json` manifestation.
- Which `construct_tier` (ESP32, Pi, Workstation, etc.)?
- Which `capabilities` does it provide?

---

## 🛠️ Documentation Checklist

- [ ] Does the README avoid "aspirational fiction"? (No mentions of features not yet in `src/`)
- [ **la-Sovereign** ] Does the tone match the fleet's "Truth-Sayer" persona?
- [ **la-Link** ] Are there at least 3 valid links to other SuperInstance GitHub repos?
- [ **Ternary** ] Is the mapping of $\{-1, 0, +1\}$ explicit?
- [ **Known Limitations** ] Does the README honestly state at least one limitation, issue, or untested scenario?

## 🚫 Anti-Patterns (Do Not Do)

- ❌ **"A powerful library for..."** — every library claims to be powerful. Say what it DOES.
- ❌ **"Leverages cutting-edge..."** — no it doesn't, and even if it did, cut the hype.
- ❌ **Listing features without explaining when you'd use each one.**
- ❌ **Code examples that don't compile** — because they reference types not shown.
- ❌ **"See the documentation for more details"** — when YOU ARE the documentation.
- ❌ **Copy-pasted READMEs** — just the crate name changed.
- ❌ **Omitting edge cases or failure modes.**
- ❌ **Using jargon without defining it on first use.**

## 📝 Recommended Structure (Beyond Mandatory Sections)

For a complete README, add:

1. **Title + One-Liner** — Plain English. "ternary-kalman: Kalman filter for {-1,0,+1} state spaces"
2. **Why This Exists** — 2-3 sentences. What problem? Why ternary?
3. **Core Concepts** — Define every term a newcomer wouldn't know.
4. **Quick Start** — Compiling Cargo.toml snippet + ~10-20 lines of working Rust.
5. **API Overview** — Table of main types with one-line descriptions.
6. **How It Works** — 2-3 paragraphs. Enough to debug. Mention the algorithm by name.
7. **Known Limitations** — What doesn't work. What degrades at scale. Honesty builds trust.
8. **Use Cases** — 3+ real scenarios. Not "AI" or "ML" — specific: "Robot arm controller choosing between three motor states."
9. **Ecosystem Context** — Which other ternary crates relate? Dependencies? Position in architecture?
10. **License** — MIT OR Apache-2.0

---

## 🔍 Review Checklist (Before Merging)

- [ ] Every code example in the README actually compiles.
- [ ] Every technical term is defined on first use.
- [ ] No marketing language ("powerful", "cutting-edge", "leverages").
- [ ] At least one limitation is honestly stated.
- [ ] A new engineer with NO context about the project could understand it.
- [ ] The "Why This Exists" section answers a real question, not a straw man.
- [ ] Mandatory four sections (Essence, Ternary Substrate, la-Links, CORTEX) are all present.
- [ ] No broken or placeholder links.

---

*"Precision in documentation is the only way to prevent a fleet of 211 crates from becoming a noise floor."*

*"The code is the specification. The documentation is the proof that the specification is understood."*
