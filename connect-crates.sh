#!/usr/bin/env bash
# connect-crates.sh — Add ternary-types dependency to all ternary fleet crates
# and replace local Trit definitions with the shared Ternary type.
set -euo pipefail

CRATES_DIR="$1" # directory containing crate subdirectories

add_dep_and_update() {
    local crate_dir="$1"
    local crate_name
    crate_name=$(basename "$crate_dir")
    local toml="$crate_dir/Cargo.toml"
    local lib="$crate_dir/src/lib.rs"

    echo "=== Processing $crate_name ==="

    # Skip if no Cargo.toml
    [ ! -f "$toml" ] && echo "  ⚠️  No Cargo.toml, skipping" && return

    # Add ternary-types dependency (unless it's already there)
    if grep -q 'ternary-types' "$toml" 2>/dev/null; then
        echo "  ✓ Already depends on ternary-types"
    else
        # Add to dependencies section
        if grep -q '^\[dependencies\]' "$toml"; then
            # Insert after [dependencies] line
            sed -i '/^\[dependencies\]/a\ternary-types = { version = "0.2", features = ["std"] }' "$toml"
        else
            # Add [dependencies] section at end
            echo -e "\n[dependencies]\nternary-types = { version = \"0.2\", features = [\"std\"] }" >> "$toml"
        fi
        echo "  ✓ Added ternary-types dependency"
    fi

    # Update lib.rs if it exists
    if [ -f "$lib" ]; then
        # Add use ternary_types::Ternary; if not already present
        if ! grep -q 'use ternary_types' "$lib" 2>/dev/null; then
            # Find a good insertion point — after any existing use statements, or at top
            if grep -q '^use ' "$lib" 2>/dev/null; then
                # Find last use line and add after it
                sed -i '0,/^use [a-z]/!b; /^use [a-z]/a\use ternary_types::Ternary;' "$lib"
            else
                # Prepend after mod docs
                sed -i '/^\/\/!/{n;/^\/\/!/!{s/^/use ternary_types::Ternary;\n/}}' "$lib"
            fi
            echo "  ✓ Added use ternary_types::Ternary"
        fi

        # Replace local trit definitions with shared type
        # Pattern: pub type Trit = i8;
        local had_trit_alias=false
        if grep -q 'pub type Trit = i8;' "$lib" 2>/dev/null; then
            sed -i 's/pub type Trit = i8;/pub use ternary_types::Ternary as Trit;/' "$lib"
            had_trit_alias=true
            echo "  ✓ Replaced Trit=i8 alias with re-export"
        fi

        # Pattern: local Trit enum
        if grep -q '#\[derive.*Clone.*Copy.*PartialEq.*Eq.*Hash\]' "$lib" 2>/dev/null; then
            if grep -q 'pub enum Trit' "$lib" 2>/dev/null; then
                # More complex — comment out the local enum and add re-export
                sed -i '/pub enum Trit/,/^}/s/^/\/\/ /' "$lib"
                echo "  ✓ Commented out local Trit enum"
            fi
        fi
    fi

    echo ""
}

# Process each crate
for crate_dir in "$CRATES_DIR"/*/; do
    add_dep_and_update "$crate_dir"
done
