#!/usr/bin/env python3
"""Fix crates that had 'pub use ternary_types::Ternary as Trit;' replaced incorrectly."""

import os
import sys

files = [
    "/home/ubuntu/.openclaw/workspace/ternary-fleet/ternary-knn/src/lib.rs",
    "/home/ubuntu/.openclaw/workspace/ternary-fleet/ternary-prune/src/lib.rs",
    "/home/ubuntu/.openclaw/workspace/ternary-fleet/ternary-distill/src/lib.rs",
    "/home/ubuntu/.openclaw/workspace/ternary-fleet/ternary-fuse/src/lib.rs",
    "/home/ubuntu/.openclaw/workspace/ternary-fleet/ternary-checkpoint/src/lib.rs",
]

BRIDGE_CODE = """/// A trit value: -1, 0, or +1.
///
/// This crate uses `i8` internally for performance. For conversion with
/// the shared [`ternary_types::Ternary`] type, use the `From`/`Into` impls.
pub type Trit = i8;

/// Convert a [`ternary_types::Ternary`] to this crate's [`Trit`] (i8).
impl From<ternary_types::Ternary> for Trit {
    fn from(t: ternary_types::Ternary) -> Self {
        t.to_i8()
    }
}

/// Convert this crate's [`Trit`] (i8) to [`ternary_types::Ternary`].
impl From<Trit> for ternary_types::Ternary {
    fn from(t: Trit) -> Self {
        ternary_types::Ternary::try_from(t).unwrap_or(ternary_types::Ternary::Neutral)
    }
}
"""

OLD = "pub use ternary_types::Ternary as Trit;"

for filepath in files:
    if not os.path.exists(filepath):
        print(f"SKIP {filepath} — not found")
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Remove the botched replacement first
    # Pattern 1: the messed up multi-line comment + type
    import re
    # Remove anything that looks like the broken comment (lines with no content)
    content = re.sub(
        r'/// A ternary value:.*?\n/// A trit value:.*?\n///\n/// This crate uses \[\] internally.*?shared \[\] type.*?/ impls\.\npub type Trit = i8;\n\n',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove old conversion impls (they might be present from the botched run)
    content = re.sub(
        r'impl From<ternary_types::Ternary> for Trit \{.*?\n\}',
        '',
        content,
        flags=re.DOTALL
    )
    content = re.sub(
        r'impl From<Trit> for ternary_types::Ternary \{.*?\n\}',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove the ternary_types import line if present as a statement
    content = content.replace('ternary_types::Ternary use ternary_types::Ternary;', '')
    
    # Check if our target pattern is still there
    if OLD in content:
        content = content.replace(OLD, BRIDGE_CODE)
        print(f"FIXED {filepath}")
    else:
        # Check if BRIDGE_CODE is already there
        if 'pub type Trit = i8;' in content and 'From<ternary_types::Ternary>' in content:
            print(f"OK {filepath} — already has bridge")
        else:
            print(f"WARN {filepath} — pattern not found, showing head:")
            with open(filepath) as f:
                print(f.read()[:500])
            continue
    
    with open(filepath, 'w') as f:
        f.write(content)

print("Done.")
