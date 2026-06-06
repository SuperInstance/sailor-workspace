# Kimi Wiring Report

## Summary
Wired 7 CLI command stubs to real `pincher-core` functions in `/tmp/pincher-wire`.

## Commands Wired

### `pincher teach <intent> <action>`
- **Before**: stub printing `"Interactive teach flow coming soon!"`
- **After**: calls `ReflexEngine::teach(&intent, &action)?` → persists reflex to SQLite with embedding
- **Enum change**: `Teach` → `Teach { intent: String, action: String }`

### `pincher do <input>`
- **Before**: stub printing `"Executing intent: {input}"`
- **After**: calls `ReflexEngine::do_command(&input)?` → runs exact/similar/novel intent matching
- **Output**: match type, confidence, latency, matched reflex ID, execution output

### `pincher pack --output <path>`
- **Before**: stub printing fake assembly + fake cryptographic signature
- **After**: calls `pincher_core::migration::pack_nail(&db_path, &output)?` → creates real `.nail` (tar.zst) archive with BLAKE3 checksums, manifest, identity, config

### `pincher doctor`
- **Before**: stub printing hardcoded `"✅"` for all checks
- **After**: checks 6 real conditions:
  1. SQLite database connectivity + reflex/action counts
  2. Embedder status (ONNX loaded vs fallback hash mode)
  3. bwrap/bubblewrap availability
  4. Disk space via `df`
  5. Hardware fingerprint collection
  6. Binary integrity

### Also wired (bonus):
- **`pincher status`**: calls `ReflexEngine::get_status()` for live reflex count, action log count, embedder loaded
- **`pincher shellinfo`**: calls `migration::fingerprint()` + `fingerprint_hash()` for real hardware fingerprinting
- **`pincher reflexes`**: calls `db::schema::get_all_reflexes()` to list stored reflexes from the database
- **`expand_tilde()`**: added for `~/.pincher/...` db path support

## Test Results

### `cargo test -p pincher-core`
```
test result: ok. 130 passed; 0 failed; 0 ignored
Doc-tests: 1 passed; 4 ignored
```

### End-to-end verification:
```
$ pincher teach "hello" "echo hello" --db /tmp/pincher-test.db
[TAUGHT] reflex d3d01e3b — intent: "hello", action: "echo hello"

$ pincher --db /tmp/pincher-test.db do "hello"
[DO] Intent: hello
  Match type: Exact
  Confidence: 0.5000
  Latency: 5ms
  Matched reflex: d3d01e3b-1bb7-405b-bdf8-2a7b312ed053
  Output: Sandboxed command executed: echo hello

$ pincher --db /tmp/pincher-test.db pack --output /tmp/pincher-test.nail
[*] Packing database into .nail archive...
[SUCCESS] Nail archive created at: /tmp/pincher-test.nail

$ pincher --db /tmp/pincher-test.db doctor
[Doctor] PincherOS Health Check
  SQLite database .......... OK (11 reflexes, 1 log entries)
  Embedding model ......... WARN (fallback hash mode)
  Sandbox (bwrap) ......... OK (bubblewrap 0.6.1)
  Disk space .............. OK (4900 MB free)
  Hardware fingerprint .... OK (c12a10b4d5201dcd)
  Binary integrity ........ OK (78221 KB, ...)
Result: All checks passed.
```

## PR Link
**https://github.com/SuperInstance/pincher/pull/8**

Branch: `wire-cli-to-core`
Commit: `20a25c3` — "wire CLI to core: teach, do, pack, doctor commands now call real pincher-core functions"
