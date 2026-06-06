# API Reference — [Repo Name]

> *[Brief note about what this API reference covers — public API surface only, version noted, etc.]*

---

## `[Module/Crate Name]`

### `[FunctionName]`

```rust
pub fn [function_name](params) -> ReturnType
```

[Description of what this function does, when to use it]

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `param` | `Type` | [Description] |
| `param` | `Type` | [Description] |

**Returns:** `ReturnType` — [Description of return value]

**Panics:** [Describe panic conditions, if any. Remove if not applicable.]

**Example:**
```rust
// [Usage example]
```

---

### `[StructName]`

```rust
pub struct [StructName] {
    // [Fields]
}
```

[Description of what this struct represents]

**Fields:**
| Name | Type | Description |
|------|------|-------------|
| `field` | `Type` | [Description] |

**Implements:**
| Trait | Description |
|-------|-------------|
| `[Trait]` | [What this impl provides] |

**Example:**
```rust
// [Construction/usage example]
```

---

### `[TraitName]`

```rust
pub trait [TraitName] {
    // [Methods]
}
```

[Description of what this trait abstracts]

**Required Methods:**
| Method | Signature | Description |
|--------|-----------|-------------|
| `method` | `fn method(...) -> ...` | [Description] |

**Provided Methods:**
| Method | Signature | Description |
|--------|-----------|-------------|
| `method` | `fn method(...) -> ...` | [Description] |

**Implementors:**
| Type | Notes |
|------|-------|
| `[Type]` | [How it implements this trait] |

**Example:**
```rust
// [Usage example]
```

---

### `[EnumName]`

```rust
pub enum [EnumName] {
    Variant1,
    Variant2(Field1),
    Variant3 { named_field: Type },
}
```

[Description of what this enum represents]

**Variants:**
| Variant | Payload | Description |
|---------|---------|-------------|
| `Variant1` | — | [Description] |
| `Variant2` | `Type` | [Description] |
| `Variant3` | `{ field: Type }` | [Description] |

**Example:**
```rust
// [Usage example]
```

---

### `[MacroName]`

```rust
[macro_name!]
```

[Description of what this macro does]

**Syntax:**
```
[macro_name!($param:expr) => ...]
```

**Example:**
```rust
// [Usage example]
```

---

## Feature Gates

| Feature | What It Enables | Default? |
|---------|----------------|----------|
| `feature_name` | [Description] | Yes/No |

## Re-exports

- `pub use [path]::[item];` — [Description]

## Minimum Supported Rust Version (MSRV)

[MSRV version — e.g., 1.80.0]
