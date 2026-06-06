# LOW LEVEL — [Repo Name]

> *[One paragraph — who this document is for (contributors, porters, performance tuners) and what they'll find]*

## Internal Architecture

### Crate Structure

```
[repo-name]/
├── src/
│   ├── lib.rs          # [What goes in root module]
│   ├── [module]/       # [Module purpose]
│   │   ├── mod.rs
│   │   └── ...
│   ├── [module]/       # [Module purpose]
│   │   ├── mod.rs
│   │   └── ...
│   └── ...
├── tests/              # Integration tests
├── benches/            # Benchmarks
└── examples/           # Usage examples
```

### Module Map

| Module | Responsibility | Key Types |
|--------|---------------|-----------|
| `[module]` | [What it handles] | `[Type]`, `[Type]` |
| `[module]` | [What it handles] | `[Type]`, `[Type]` |

## Key Internal Patterns

### [Pattern Name]

[Describe the internal pattern — why it exists, what problem it solves]

```rust
// [Code showing the pattern]
```

## Performance

### Benchmarks

[If benchmarks exist, summarize key numbers. Otherwise:]

> Benchmarks are in [`benches/`](./benches/). Run with:
> ```bash
> cargo bench
> ```

### Hot Paths

- **[Hot path 1]** — [Where performance matters most, optimization strategy]
- **[Hot path 2]** — [Where performance matters most, optimization strategy]

### Allocation Profile

[Describe allocation behavior — how many allocations per operation, where they happen, any zero-copy guarantees]

## Concurrency & Thread Safety

[Describe thread safety guarantees. Which types are Send/Sync? Which APIs are reentrant?]

## Error Handling

[How errors are propagated. Custom error types? Anyhow? Thiserror? Panic policy?]

## Testing

### Unit Tests

[Where unit tests live. Run with `cargo test`. Any test-only features?]

### Integration Tests

[Where integration tests live. Describe test fixtures, if any.]

### Property-Based Tests

[If using proptest/fuzzcheck, describe what properties are verified.]

## Debugging

[Tips for debugging — logging, tracing, feature flags for verbose output, etc.]

## Porting Guide

### Adding a New [Backend/Platform/Feature]

1. [Step 1 — e.g., Implement the [Trait] trait]
2. [Step 2 — e.g., Register your backend in [location]]
3. [Step 3 — e.g., Add tests in [location]]
4. [Step 4 — e.g., Update feature flags in Cargo.toml]

### Platform-Specific Notes

| Platform | Notes |
|----------|-------|
| Linux | [Any Linux-specific considerations] |
| macOS | [Any macOS-specific considerations] |
| Windows | [Any Windows-specific considerations] |
| WASM | [Any WASM-specific considerations] |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) if it exists. Otherwise:

- Code style: `cargo fmt` / `cargo clippy`
- Commit messages: [Conventional commits / etc.]
- PR process: [Description of review and merge process]

## Future Work

- [Planned feature/improvement 1]
- [Planned feature/improvement 2]
- [Known limition 1]
- [Known limition 2]
