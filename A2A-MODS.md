# 🎯 A2A Modules

Agent-to-Agent consumable modules. No UI. No DOM. No HTML. Pure exports.

Four modules bridging the spreadsheet ecosystem (functional composition)
with the I2I fleet (message passing) through the shared ternary {-1,0,+1} core.

## Modules

| Module | File | Tests | Size | Language |
|--------|------|-------|------|----------|
| 🪟 **WASM Kernel** | `a2a-mods/wasm/ternary-core.wasm` | 8/8 | **514 B** | C → WASM |
| 🌀 **Spectral→MIDI** | `a2a-mods/spectral/evaluator.py` | 8/8 | 6.4 KB | Python |
| 🔗 **Bridge Protocol** | `a2a-mods/bridge/bridge.py` | 9/9 | 7.9 KB | Python |
| 📊 **Pipeline A2A** | `a2a-mods/pipeline/pipeline.mjs` | 7/7 | 7.0 KB | ESM JS |

**Total: 32 tests, all passing. ∼21.9 KB source, 514 B WASM binary.**

## Dual Architecture

```
┌──────────────────┐          ┌─────────────────────┐
│   I2I Fleet      │          │ Spreadsheet Fleet   │
│  (message pass)  │          │ (functional compose) │
│                  │          │                      │
│  agents ↔ bottles│  Bridge  │  cells ↔ formulas   │
│  harbor directory│ ────────▶│  grid topology      │
│  pipeline dispatch│  Protocol│  dependency graph   │
└──────────────────┘          └─────────────────────┘
        │                            │
        └──────────┬───────────────┘
                   ▼
        Shared Ternary Core {-1, 0, +1}
                   │
                   ▼
        MIDI Notes (accumulator ×4)

        [1, 0, -1, 1, 0, -1, 1, 1]
        → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

## A2A Contract

Every module in this directory:
- **Zero UI dependencies** — no React, no HTML, no Canvas
- **Self-contained** — no npm install, no requirements.txt
- **Tested** — each module has a self-test that exits 0 on success
- **Agent-importable** — ESM, Python import, or WASM binary
- **Size-minimal** — smallest module is 514 bytes
- **Documented** — each has README.md and inline docs

## Agent Usage Patterns

```python
# Pattern 1: Bridge I2I → spreadsheet
from a2a_mods.bridge.bridge import bottle_to_formula
formula = bottle_to_formula({"type": "STATUS", "from": "agent", "body": "ready"})
cell_A1 = formula  # spreadsheet cell consumes this
```

```python
# Pattern 2: Spectral → MIDI
from a2a_mods.spectral.evaluator import spectral_to_ternary
vectors = spectral_to_ternary(eigenvalues, fiedler, cr, cheeger)
```

```js
// Pattern 3: Spreadsheet → MIDI pipeline
import { runPipeline } from './a2a-mods/pipeline/pipeline.mjs';
const result = runPipeline('1,0,-1,1,0,-1,1,1');
const midi = result.sequences[0].midi;
```

```js
// Pattern 4: WASM binary (any WASM runtime)
const wasm = await WebAssembly.compile(fs.readFileSync('./a2a-mods/wasm/ternary-core.wasm'));
const { mapping } = (await WebAssembly.instantiate(wasm, {})).exports;
const ptr = 256; const view = new Int8Array(mem.buffer);
[1,0,-1,1,0,-1,1,1].forEach((v,i) => view[ptr+i] = v);
const count = mapping(ptr, 8);
```

## Running All Tests

```bash
cd a2a-mods
python3 spectral/evaluator.py && \
python3 bridge/bridge.py && \
cd wasm && node test.mjs && cd .. && \
cd pipeline && node pipeline.mjs && cd ..
```
