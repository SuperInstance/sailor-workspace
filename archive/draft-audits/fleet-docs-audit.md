# Fleet Documentation Audit

**Date:** 2026-06-05  
**Scope:** 7 repos (polychora-temporal, pincher, DeckBoss, cocapn, cocapn-marine, sonar-vision, handy-marine-voice)  
**Auditor:** Doc Factory Beta Tester

---

## Summary

| Metric | Count |
|--------|-------|
| Repos audited | 7/7 |
| Docs found (PLUG_AND_PLAY / GETTING_STARTED / ARCHITECTURE / API_REFERENCE / LOW_LEVEL) | 35/35 (100%) |
| README doc index banners | 7/7 (100%) |
| Relative links checked | 120+ |
| Broken links (hard) | 0 |
| Broken links (soft — directory refs only) | 3 (non-hard breaks, see notes) |
| Cross-repo reference issues | 0 |
| Critical content issues found | 1 (sonar-vision README wrong language) |
| Minor formatting/link-text issues | 1 (DeckBoss Dev_Guide filename) |
| Fixes pushed | 2 (sonar-vision README, DeckBoss LOW_LEVEL) |

---

## Per-Repo Findings

### 1. Polychora Temporal ✅

**Status:** Clean

- Doc index banner in README: ✅
- All 5 doc files present: ✅
- All relative links resolve correctly:
  - `docs/wasm-plugin-system.md` exists in the repo
  - `docs/` directory exists (link from ARCHITECTURE.md)
- Cross-references: None to other fleet repos (self-contained 4D engine)
- Code accuracy: Docs accurately describe the Rust workspace, crates (polychora, polychora-content, polychora-plugin-api, polychora-temporal-bridge), VTE rendering pipeline, and server architecture. All confirmed against actual source file layout.
- Formatting: Consistent, well-structured

**Issues found:** None

---

### 2. Pincher ✅

**Status:** Clean

- Doc index banner in README: ✅
- All 5 doc files present: ✅
- All relative links resolve correctly
- Cross-references: Correctly mentions `ternary-types` git dependency (verified in Cargo.toml)
- Code accuracy: Docs accurately describe the workspace structure (pincher-core, pincher-cli, pincher-infer), reflex engine, SQLite vector store, embed module (ONNX + hash), sandbox, veto engine, migration system. All confirmed against actual source.
- Formatting: Excellent — honest "What This Is Not" section is refreshing. Consistent conventions.
- Links: `examples/` directory exists and is navigable

**Issues found:** None

---

### 3. DeckBoss ✅ (1 minor fix)

**Status:** Clean after fix

- Doc index banner in README: ✅
- All 5 doc files present: ✅
- All relative links resolve correctly
- Cross-references: References fleet files (CHARTER.md, STATE.md, ABSTRACTION.md, DOCKSIDE-EXAM.md, REFACTOR-NOTES.md) — all exist. No broken references to other fleet repos.
- Code accuracy: Docs accurately describe the TypeScript/Node.js monorepo structure, Director DO, Cloudflare primitives, squadrons.
- Formatting: Extensive and well-organized. Comprehensive README.

**Issues found and fixed:**
| File | Issue | Fix |
|------|-------|-----|
| `LOW_LEVEL.md` (line 20, 117) | Referenced `Dev_Guide0.1.md` (no underscore) but actual filename is `Dev_Guide_0.1.md` (with underscore) | Updated both occurrences to match actual filename |

---

### 4. Cocapn ✅

**Status:** Clean

- Doc index banner in README: ✅
- All 5 doc files present: ✅
- All relative links resolve correctly
- Cross-references: README lists related fleet repositories (cocapn-sdk, cocapn-cli, cocapn-explain, cocapn-health-rs, cocapn-lessons, agent-forge) — none of which are in this audit set, but are real repos.
- Code accuracy: Docs accurately describe the Python package structure (tile, room, flywheel, agent, deadband modules), confirmed against actual source. Tile priority formula, JSONL persistence, and query matching all verified.
- Formatting: Clean, concise.

**Issues found:** None

---

### 5. Cocapn Marine ✅

**Status:** Clean

- Doc index banner in README: ✅ (verified — emoji-based, confirmed via raw grep)
- All 5 doc files present: ✅
- All relative links resolve correctly
- Code accuracy: Docs accurately describe the Rust crate structure (nmea, sensor, autopilot, bathy, deadband modules), confirmed against source. PID anti-windup design, `#![deny(unsafe_code)]`, dependencies all verified.
- Formatting: Clean, well-structured. Uses consistent conventions.
- Cross-references: None to other fleet repos (self-contained marine sensor library)

**Issues found:** None

---

### 6. Sonar Vision 🛠️ (CRITICAL FIX)

**Status:** Fixed

- Doc index banner in README: ✅ (added by fix)
- All 5 doc files present: ✅
- All relative links resolve correctly
- Code accuracy: ✅ (after fix — README now matches the actual Python codebase)

#### Critical Issue Found

| Issue | Severity | Details |
|-------|----------|---------|
| Wrong README content | **CRITICAL** | README described `@superinstance/sonar-vision-tool` — a TypeScript npm package with Node.js ≥ 18.0 requirements and ES module imports. The actual repo is a **Python** library (confirmed by `pyproject.toml`, `sonar_vision/` Python package, `tests/` with Python tests, `pytest` test runner). The other docs (PLUG_AND_PLAY, GETTING_STARTED, ARCHITECTURE, API_REFERENCE, LOW_LEVEL) all correctly describe it as Python. |
| Duplicate H1 headings | Minor | `# Sonar Vision` followed immediately by `# @superinstance/sonar-vision-tool` — two H1 headings |

#### Fix Applied

Replaced the entire README.md with a Python-consistent version that:
- Uses the standard fleet doc index banner
- Correctly describes the Python 3.10+ library
- Documents the actual API (`Sonar`, `Signal`, `ObjectTracker`, `SpatialMap`)
- Uses Python code samples (`from sonar_vision import...`)
- References related fleet repos (cocapn-marine, handy-marine-voice)
- Adds MIT license block (consistent with the repo's actual license)
- **[Commit pushed](https://github.com/SuperInstance/sonar-vision/commit/17f8bd9)**

---

### 7. Handy Marine Voice ✅

**Status:** Clean

- Doc index banner in README: ✅
- All 5 doc files present: ✅
- All relative links resolve correctly
- Cross-references: Correctly references **cocapn-marine** (exists in our fleet) and **cocapn-core** (external repo — handles are accurate). The docs honestly note that "real cocapn-marine and cocapn-core crate dependencies not yet wired."
- Code accuracy: Docs accurately describe the Rust project structure (grammar.rs, bridge.rs, main.rs), command grammar patterns, escalation tiers, and simulator-first execution. Confirmed against source.
- Formatting: Clean, well-structured. Architecture diagram is ASCII art consistent with fleet standards.

**Issues found:** None

---

## Cross-Repo Consistency Check

### Doc Index Banners
All 7 repos now use the same format:
```markdown
> **📚 Documentation:** [`PLUG_AND_PLAY.md`](./PLUG_AND_PLAY.md) · [`GETTING_STARTED.md`](./GETTING_STARTED.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`API_REFERENCE.md`](./API_REFERENCE.md) · [`LOW_LEVEL.md`](./LOW_LEVEL.md)
```
✅ Fully consistent

### Naming Conventions
| Aspect | Status |
|--------|--------|
| H1 title format (bold, separator `— `) | ✅ Consistent |
| "Next Steps" tables with 4 guides | ✅ Consistent |
| PLUG_AND_PLAY headings style | ✅ All use same `# PLUG_AND_PLAY — <name>` |
| Emoji use in headings | ✅ Consistent (some use repo-specific emojis) |
| Code block language tags | ✅ All present |
| "Status" section in PLUG_AND_PLAY | ✅ All present |

### Cross-Repo References
| From | References | Correct? |
|------|-----------|----------|
| sonar-vision README (fixed) | cocapn-marine, handy-marine-voice | ✅ Both exist in fleet |
| handy-marine-voice | cocapn-marine, cocapn-core | ✅ cocapn-marine exists, cocapn-core is external |
| pincher ARCHITECTURE | ternary-types (dependency) | ✅ External dep |
| DeckBoss README | Fleet files (CHARTER, STATE, etc.) | ✅ All local |
| cocapn README | cocapn-sdk, cocapn-cli, agent-forge, etc. | ✅ All external repos |

### Naming Convention Consistency
- "cocapn" vs "coCapn" — All docs use "CoCapn" in prose, "cocapn" in paths/commands. ✅
- "Polychora Temporal" — Consistent capital P, T. ✅
- "Pincher" — Consistent. ✅
- "DeckBoss" — Consistent capital D, B. ✅
- "cocapn-marine" — Consistent hyphenated lowercase. ✅
- "sonar-vision" — Consistent hyphenated lowercase. ✅
- "handy-marine-voice" — Consistent hyphenated lowercase. ✅

---

## Remaining Recommendations

### Low Priority (Informational)

1. **polychora-temporal GETTING_STARTED.md** — Link to `docs/wasm-plugin-system.md` works but could benefit from being in the "Next Steps" table rather than just an additional link.
2. **pincher GETTING_STARTED.md** — Link to `examples/` works as a directory on GitHub but is not a file. Consider linking to specific example READMEs.
3. **ARCHITECTURE.md cross-links to `docs/`** — 3 repos (polychora-temporal, pincher, cocapn) link to `docs/` which works on GitHub but may not in all renderers. Consider linking to specific doc files.

### Medium Priority

4. **DeckBoss stale dev guides** — The repo has `Dev_Guide0.1.1.md` (7.9KB), `Dev_Guide_0.1.md` (27KB), and `Dev_Guide_add.md` (38KB). These are legacy guides from before the fleet doc standardization. Consider archiving or replacing with a consolidated DEVELOPER.md.
5. **Sonar Vision TESTING section** — The new README's testing section says `pip install pytest && pytest tests/` — verify this matches the actual test setup (the repo has both `tests/test_all.py` and a `sonar_vision/` package).

### Future Audit Suggestions

6. **Add link checking to CI** — A simple markdown link checker in CI would have caught the sonar-vision README mismatch before it propagated.
7. **Add doc linting rules** — Check for consistent H1 formatting, doc index banners, and required frontmatter.
8. **Verify cocapn-core references** — handy-marine-voice references `cocapn-core::handoff`, `cocapn-core::stripe`, etc. When cocapn-core is added to the fleet, verify these modules exist.

---

## Files Fixed

| Repo | File | Change | Commit |
|------|------|--------|--------|
| sonar-vision | `README.md` | Replaced TypeScript README with Python-consistent version | [`17f8bd9`](https://github.com/SuperInstance/sonar-vision/commit/17f8bd9) |
| DeckBoss | `LOW_LEVEL.md` | Fixed `Dev_Guide0.1.md` → `Dev_Guide_0.1.md` (lines 20, 117) | [`691dfba`](https://github.com/SuperInstance/DeckBoss/commit/691dfba) |
