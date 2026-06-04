# 🔫 CRYSTALLIZATION ENGINE: THE GUN

## Overview
The Crystallization Engine is a high-density utility designed to instantly transform a raw repository into a **Sovereign Room**. It automates the generation of the `CORTEX.json` spatial coordinate system and enforces the mandatory Sovereign directory structure.

## Operational Flow
1. **Landed**: Engine targets a directory.
2. **Sensing**: 
   - Scans for domain keywords (Constraint, Flux, Fleet).
   - Identifies critical "Anchors" (core files, specs).
   - Maps "Splines" to related rooms.
3. **Crystallizing**:
   - Generates `CORTEX.json` based on the `CORTEX_SPEC`.
   - Creates mandatory paths: `docs/specs`, `src/core`, `tests/integration`, `scripts/sync`.
4. **Activated**: An agent entering the room now has a zero-shot mental map.

## Logic Specification
- **Expertise Detection**: Heuristic mapping of file patterns $\rightarrow$ Domain $\rightarrow$ Role.
- **Anchor Discovery**: Pattern-based selection of high-significance files.
- **Negative Space**: Synthesizes the "Sovereign Gap" based on the detected domain, mapping local limits to specific `Hub.synthesis.request` patterns.

## Usage
```bash
python3 crystallize.py <path_to_room>
```

## Spec Compliance
- $\checkmark$ `TETHER_SPEC`: Generates `hub_request_pattern` for Hub communication.
- $\checkmark$ `CORTEX_SPEC`: Full schema compliance.
