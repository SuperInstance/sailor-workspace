#!/usr/bin/env python3
"""
vessel-trit-decoder.py — I2I Vessel → Ternary Trit Decoder

Reads an I2I bottle file (JSON or Markdown) from the vessel, extracts the
message payload bytes, and decodes to a ternary trit stream (5 trits per byte).

Usage:
    python3 vessel-trit-decoder.py <bottle-file> [--verbose]

The two supported bottle formats:
  1. JSON bottle (e.g., *.baton) — I2IV3 envelope with payload.bytes
  2. Markdown bottle (e.g., *.md) — [I2I:TYPE] header with payload body

Trit encoding: each byte holds 5 ternary digits (base-3), least-significant
trit first. Since 3^5 = 243, valid byte values are 0–242.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Bottle file discovery
# ---------------------------------------------------------------------------

VESSEL_BOTTLE_DIRS = [
    Path.home() / ".openclaw" / "workspace" / "i2i-vessel" / "bottles",
    Path.home() / ".openclaw" / "workspace" / "i2i-vessel" / "harbor",
]

I2I_V1_HEADER = re.compile(r"^\[I2I:(\w+)\]\s*(.*)$", re.MULTILINE)
I2I_V2_HEADER = re.compile(r"^\[I2I:(\w+):(\w+)\]\s*(.*)$", re.MULTILINE)
I2I_BOTTLE_HEADER = re.compile(r"^\[I2I:BOTTLE.*?\].*$", re.MULTILINE)


def resolve_bottle_path(path: str) -> Path:
    """Resolve a bottle path, searching known bottle dirs if not found as-is."""
    p = Path(path)
    if p.exists():
        return p.resolve()

    # Try relative to workspace
    workspace = Path.home() / ".openclaw" / "workspace"
    if (workspace / path).exists():
        return (workspace / path).resolve()

    # Strip any leading bottles/ or harbor/ prefix and search inside dirs
    name = Path(path).name
    for d in VESSEL_BOTTLE_DIRS:
        candidate = d / name
        if candidate.exists():
            if candidate.resolve() != candidate:
                return candidate.resolve()
    # Also try with the full relative path inside each dir
    for d in VESSEL_BOTTLE_DIRS:
        candidate = d / path
        if candidate.exists():
            return candidate.resolve()

    raise FileNotFoundError(
        f"Bottle not found: {path}\n"
        f"Searched: {[str(d) for d in VESSEL_BOTTLE_DIRS]}"
    )


# ---------------------------------------------------------------------------
# Bottle parsing
# ---------------------------------------------------------------------------

def parse_bottle(path: Path, verbose: bool = False) -> dict:
    """Parse an I2I bottle file, returning {'from', 'type', 'payload', 'raw_bytes'}.

    Handles:
      - JSON bottles (*.baton, I2IV3 envelope format)
      - Markdown bottles with [I2I:*] header (*.md, .btl)
      - Plain text bottles (treated as raw payload)
    """
    raw = path.read_text(encoding="utf-8", errors="replace")
    size = len(raw.encode("utf-8"))

    if verbose:
        print(f"  📄 Bottle: {path.name} ({size} bytes)")
        print(f"  📂 Path:   {path}")

    # --- Try JSON first (baton files, I2IV3 envelope) ---
    if raw.strip().startswith("{"):
        try:
            envelope = json.loads(raw)
            if verbose:
                print(f"  ✅ Detected: JSON I2I envelope")
                _dump_envelope(envelope, verbose)
            return _extract_from_json(envelope, verbose)
        except json.JSONDecodeError:
            if verbose:
                print(f"  ⚠️  Starts with {{ but not valid JSON — treating as text bottle")

    # --- Try Markdown with [I2I:...] header ---
    # Prefer v2 header, fallback to v1
    v2_match = I2I_V2_HEADER.search(raw)
    v2_style = v2_match is not None
    m = v2_match if v2_match else I2I_V1_HEADER.search(raw)
    if m:
        if v2_style:
            msg_type, code, summary = m.groups()
            if verbose:
                print(f"  ✅ Detected: I2IV2 Markdown bottle [{msg_type}:{code}]")
                print(f"     Summary: {summary.strip()}")
        else:
            msg_type, summary = m.groups()
            if verbose:
                print(f"  ✅ Detected: I2IV1 Markdown bottle [{msg_type}]")
                print(f"     Summary: {summary.strip()}")

        # Extract from/to from body if present
        from_agent = _extract_field(raw, r"(?:^|\n)#\s*From:\s*(.+)", "")
        to_agent = _extract_field(raw, r"(?:^|\n)#\s*To:\s*(.+)", "")
        agent_from_header = _extract_field(raw, r"\[.*?\]\s+(\S+)\s*[—-]", "")

        return {
            "from": from_agent or agent_from_header,
            "to": to_agent,
            "type": msg_type,
            "payload_code": code if v2_style else "",
            "payload": raw,
            "raw_bytes": raw.encode("utf-8"),
            "format": "markdown",
        }

    # --- Plain text / unknown ---
    if verbose:
        print(f"  ⚠️  No I2I envelope detected — treating raw text as payload")
    return {
        "from": "",
        "to": "",
        "type": "RAW",
        "payload_code": "",
        "payload": raw,
        "raw_bytes": raw.encode("utf-8"),
        "format": "text",
    }


def _dump_envelope(envelope: dict, verbose: bool) -> None:
    """Pretty-print an I2IV3 envelope's top-level fields."""
    for key in ("from", "to", "type", "priority", "version"):
        val = envelope.get(key)
        if val:
            print(f"     {key}: {val}")
    t = envelope.get("timestamp", "")
    ttl = envelope.get("ttl", "")
    if t:
        print(f"     timestamp: {t}")
    if ttl is not None and ttl != "":
        print(f"     ttl: {ttl}")


def _extract_field(text: str, pattern: str, default: str = "") -> str:
    """Extract the first capture group matching a regex in text."""
    m = re.search(pattern, text, re.IGNORECASE)
    return m.group(1).strip() if m else default


def _extract_from_json(envelope: dict, verbose: bool) -> dict:
    """Extract payload from an I2IV3 JSON envelope."""

    # Standard envelope — payload is arbitrarily nested
    payload = envelope.get("payload", {})

    # Try several known payload byte locations:
    #   payload.bytes, payload.body, payload.data, or the whole payload
    bytes_sources = [
        payload.get("bytes", None) if isinstance(payload, dict) else None,
        payload.get("body", None) if isinstance(payload, dict) else None,
        payload.get("data", None) if isinstance(payload, dict) else None,
        payload.get("content", None) if isinstance(payload, dict) else None,
        json.dumps(payload, ensure_ascii=False) if payload else None,
    ]

    raw_payload = None
    for src in bytes_sources:
        if src is not None and isinstance(src, (str, bytes)):
            raw_payload = src if isinstance(src, bytes) else src.encode("utf-8")
            break

    # Fall back to entire envelope if no payload found (some bottles ARE the message)
    if raw_payload is None:
        raw_payload = json.dumps(envelope, ensure_ascii=False).encode("utf-8")
        if verbose:
            print(f"     Using full envelope as payload bytes")

    if verbose and isinstance(raw_payload, bytes):
        print(f"     Payload: {len(raw_payload)} bytes")

    return {
        "from": envelope.get("from", ""),
        "to": envelope.get("to", ""),
        "type": envelope.get("type", ""),
        "payload_code": "",
        "payload": envelope.get("payload", envelope),
        "raw_bytes": raw_payload,
        "format": "json",
    }


# ---------------------------------------------------------------------------
# Ternary trit decoding
# ---------------------------------------------------------------------------

def bytes_to_trits(data: bytes, balanced: bool = False, verbose: bool = False) -> list:
    """Decode bytes to trits (balanced or unbalanced ternary).

    Each byte represents 5 trits packed in base-3 with the least-significant
    trit first.  Valid byte range: 0–242 (inclusive) for unbalanced, or
    0–242 with a shift for balanced.

    Unbalanced trits:  {0, 1, 2}
    Balanced trits:    {-1, 0, 1}   (balanced ternary: trit 2 → -1)

    Args:
        data: Raw bytes to decode
        balanced: If True, use balanced ternary (-1, 0, 1)
        verbose: If True, print per-byte breakdown

    Returns:
        List of trit values (ints)
    """
    all_trits = []

    for i, byte_val in enumerate(data):
        val = byte_val
        trits = []

        # Unpack 5 trits, least significant first
        for _ in range(5):
            trits.append(val % 3)
            val //= 3

        if balanced:
            # Convert to balanced: 0→0, 1→1, 2→-1
            trits = [t if t != 2 else -1 for t in trits]

        if verbose:
            raw = ", ".join(str(t) for t in trits)
            bal = ""
            if balanced:
                bal = "  (balanced)"
            print(f"     byte[{i:4d}] = 0x{byte_val:02x} ({byte_val:3d}) → [{raw}]{bal}")

        all_trits.extend(trits)

    # Check for any remaining value (should be 0 if valid, non-zero means data
    # was > 242)
    overflow_count = 0
    for i, byte_val in enumerate(data):
        val = byte_val
        for _ in range(5):
            val //= 3
        if val != 0:
            overflow_count += 1
            if verbose:
                print(f"     ⚠️  byte[{i}] value {byte_val} > 242 — trits truncated!")
    if overflow_count and not verbose:
        if overflow_count == len(data):
            print(
                f"  ⚠️  All {overflow_count} bytes have values > 242 — "
                f"not valid ternary-packed data! Showing raw anyway."
            )
        else:
            print(f"  ⚠️  {overflow_count}/{len(data)} bytes exceed 242 cap")

    return all_trits


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def format_trit_stream(trits: list, width: int = 60) -> str:
    """Format trit stream as a readable string with balanced/unbalanced markers."""
    symbol_map = {0: "0", 1: "+", 2: "-"}  # 2 mapped to - for balanced display
    parts = []
    for t in trits:
        sym = symbol_map.get(t, "?")
        if t == -1:
            sym = "-"
        parts.append(sym)
    line = " ".join(parts)
    lines = []
    while line:
        lines.append(line[:width])
        line = line[width:]
    return "\n".join(lines) if lines else "(empty)"


def format_trit_compact(trits: list, width: int = 48) -> str:
    """Compact trit stream: 5-trit groups separated by space, 6 groups per line."""
    groups = []
    for i in range(0, len(trits), 5):
        group = trits[i : i + 5]
        syms = []
        for t in group:
            if t in (0, 1, 2):
                syms.append(str(t))
            elif t == -1:
                syms.append("‑")  # non-breaking minus (balanced)
        groups.append("".join(syms))

    lines = []
    line_groups = []
    for g in groups:
        line_groups.append(g)
        if len(line_groups) >= width // 10:
            lines.append(" ".join(line_groups))
            line_groups = []
    if line_groups:
        lines.append(" ".join(line_groups))
    return "\n".join(lines) if lines else "(empty)"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Decode an I2I vessel bottle to ternary trit stream",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python3 vessel-trit-decoder.py bottles/TO-FORGEMASTER.md\n"
            "  python3 vessel-trit-decoder.py bottles/20260604-oracle2-to-forgemaster-handshake.baton --verbose\n"
            "  python3 vessel-trit-decoder.py harbor/fleet-recon-20260605-0153.md\n"
        ),
    )
    parser.add_argument(
        "bottle",
        nargs="?",
        help="Path to I2I bottle file (relative to bottle dirs if basename given)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Detailed per-byte trit decoding debug output",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available bottle files in vessel",
    )
    parser.add_argument(
        "--balanced", "-b",
        action="store_true",
        help="Output balanced ternary trits (-1, 0, 1) instead of (0, 1, 2)",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Compact output: 5-trit groups only, no hex breakdown",
    )

    args = parser.parse_args()

    # --- List mode ---
    if args.list or not args.bottle:
        print("📦 I2I Vessel — Available Bottles\n")
        for d in VESSEL_BOTTLE_DIRS:
            if not d.exists():
                continue
            files = sorted(f for f in d.iterdir() if f.is_file() and not f.name.startswith("."))
            if files:
                label = "Bottles" if "bottles" in str(d) else "Harbor"
                print(f"  📁 {label}/ ({d.name}):")
                for f in files:
                    size = f.stat().st_size
                    print(f"     {f.name:50s}  ({size:>6d} bytes)")
                print()
        if not args.bottle:
            print("Pass a bottle filename to decode, e.g.:")
            print("  python3 vessel-trit-decoder.py TO-FORGEMASTER.md\n")
            return

    # --- Resolve bottle ---
    try:
        path = resolve_bottle_path(args.bottle)
    except FileNotFoundError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)

    # --- Parse ---
    if args.verbose:
        print("=" * 65)
        print("  📡 I2I Vessel → Trit Decoder")
        print("=" * 65)
        print()

    result = parse_bottle(path, verbose=args.verbose)

    # --- Summary ---
    print()
    print("─── Message Envelope ───")
    for key in ("from", "to", "type"):
        val = result[key]
        if val:
            print(f"  {key:10s}: {val}")
    print(f"  {'format':10s}: {result['format']}")
    print(f"  {'payload':10s}: {len(result['raw_bytes'])} bytes")

    raw = result["raw_bytes"]
    if not raw:
        print("  ⚠️  Empty payload — nothing to decode.")
        return

    # --- Hex dump (first 64 bytes) ---
    hex_preview = raw[:64].hex(" ")
    print()
    print("─── Raw Payload (hex, first 64 bytes) ───")
    print(f"  {hex_preview}{'…' if len(raw) > 64 else ''}")

    # --- Trit decode ---
    trits = bytes_to_trits(raw, balanced=args.balanced, verbose=args.verbose)

    print()
    total_trits = len(trits)
    print(f"─── Trit Stream ({total_trits} trits from {len(raw)} bytes) ───")

    if args.compact:
        print()
        print(format_trit_compact(trits))
    else:
        print()
        # Unbalanced display
        if args.balanced:
            print("  Balanced ternary  (symbols: - = -1, 0 = 0, + = +1)")
        else:
            print("  Unbalanced ternary (symbols: 0, 1, 2)")
        print()
        line = format_trit_stream(trits, width=60)
        print(line)

    print()
    if args.balanced:
        print(f"  → {total_trits} balanced trits ({total_trits} trinary digits)")
    else:
        print(f"  → {total_trits} unbalanced trits ({total_trits} trinary digits)")
    print(f"  → Equivalent capacity: {total_trits} ternary digits ≈ "
          f"{total_trits * 3**5 / 256:.1f}× binary bytes of state space")

    print()
    print("─── Done ───")


if __name__ == "__main__":
    main()
