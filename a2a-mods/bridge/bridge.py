"""A2A Bridge Protocol — I2I Bottle ↔ Cell Formula translation.

Translates between the fleet's I2I bottle protocol (message passing)
and the spreadsheet cell formula system (functional composition).

Agent-consumable: no UI, no web server. Pure protocol translation.
"""

import re
import json
from datetime import datetime, timezone


# I2I type → spreadsheet formula prefix
TYPE_TO_FORMULA = {
    "STATUS": "STATUS",
    "TASK": "TASK",
    "CHECKPOINT": "CHECKPOINT",
    "BLOCKER": "IF",
    "SPLINE": "INVARIANT",
    "SYNTHESIS": "COMPOSE",
    "BOTTLE": "BOTTLE",
    "ACK": "STATUS",
    "DELIVERABLE": "DELIVERABLE",
    "CHALLENGE": "IF",
    "SESSION": "SESSION",
}

# Formula prefix → I2I type (reverse mapping)
# When multiple I2I types map to same formula, use the primary one
FORMULA_TO_TYPE = {
    "STATUS": "STATUS",      # Both STATUS and ACK → STATUS
    "TASK": "TASK",
    "CHECKPOINT": "CHECKPOINT",
    "IF": "BLOCKER",         # Both BLOCKER and CHALLENGE → BLOCKER
    "INVARIANT": "SPLINE",
    "COMPOSE": "SYNTHESIS",
    "BOTTLE": "BOTTLE",
    "DELIVERABLE": "DELIVERABLE",
    "SESSION": "SESSION",
}


def bottle_to_formula(bottle):
    """Convert an I2I bottle dict to a spreadsheet cell formula string.
    
    Args:
        bottle: Dict with 'type', 'from', 'body' keys (I2I bottle)
        
    Returns:
        String: spreadsheet formula =FUNC("from", "body")
    """
    bottle_type = bottle.get("type", "STATUS").upper()
    
    # Map type to formula function
    func = TYPE_TO_FORMULA.get(bottle_type, bottle_type)
    
    # Build arguments: sender, body, plus optional extras
    sender = bottle.get("from", "agent")
    body = bottle.get("body", "")
    to = bottle.get("to", "")
    timestamp = bottle.get("timestamp", "")
    
    # Escape quotes in body
    body_safe = str(body).replace('"', '""') if body else ""
    to_safe = str(to).replace('"', '""') if to else ""
    
    if func == "IF":
        # IF(condition, true_val, false_val)
        return f'=IF("{sender}", "{body_safe}", "{to_safe or "ok"}")'
    
    if func == "INVARIANT":
        # INVARIANT(from, body)
        return f'={func}("{sender}", "{body_safe}")'
    
    if func in ("COMPOSE",):
        return f'={func}("{sender}", "{body_safe}", "{to_safe}")'
    
    # Standard: FUNC("from", "body")
    # Build arg list with proper formatting
    args = [f'"{sender}"']
    if body_safe:
        args.append(f'"{body_safe}"')
    if timestamp:
        args[-1] = args[-1].rstrip('"') + f' // {timestamp}"'
    
    return f"={func}({', '.join(args)})"


def formula_to_bottle(cell_id, formula):
    """Parse a spreadsheet cell formula back into an I2I bottle dict.
    
    Args:
        cell_id: Cell coordinates (e.g. "B3")
        formula: Formula string (e.g. '=STATUS("oracle2", "ready")')
        
    Returns:
        Dict: I2I bottle with type, from, body keys
    """
    formula = formula.strip()
    
    # Remove leading '='
    if formula.startswith("="):
        formula = formula[1:]
    
    # Extract function name
    match_func = re.match(r'^([A-Z_]+)\(', formula)
    if not match_func:
        return {"type": "STATUS", "cell": cell_id, "from": "unknown", "body": formula}
    
    func_name = match_func.group(1)
    
    # Map back to I2I type
    bottle_type = FORMULA_TO_TYPE.get(func_name, func_name)
    
    # Extract arguments
    args_str = formula[len(func_name) + 1:-1]  # remove FUNC(...)
    
    # Parse quoted strings as arguments
    args = []
    for match in re.finditer(r'"((?:[^"]|"")*)"(?:\s*//\s*([^,)]+))?', args_str):
        arg = match.group(1).replace('""', '"')
        args.append(arg)
    
    bottle = {
        "type": bottle_type,
        "cell": cell_id,
        "from": args[0] if len(args) > 0 else "unknown",
        "body": args[1] if len(args) > 1 else "",
    }
    
    return bottle


def grid_to_dependency_table(grid):
    """Convert grid state to dependency table.
    
    Analyzes cell formulas to find references to other cells.
    
    Args:
        grid: List of dicts with 'id' and 'raw' keys
        
    Returns:
        Dict: cell_id → list of dependency cell_ids
    """
    deps = {}
    
    # Regex for cell references like A1, B3, ZZ10
    cell_ref = re.compile(r'\b([A-Z]+\d+)\b')
    
    for cell in grid:
        cell_id = cell.get("id", "")
        raw = cell.get("raw", "")
        
        # Find all cell references in formula
        refs = cell_ref.findall(raw)
        # Remove self-references
        refs = [r for r in refs if r != cell_id]
        
        deps[cell_id] = refs
    
    return deps


def round_trip(bottle):
    """Verify round-trip: bottle → formula → bottle preserves identity."""
    formula = bottle_to_formula(bottle)
    cell_id = bottle.get("cell", "A1")
    parsed = formula_to_bottle(cell_id, formula)
    
    return (
        parsed["type"] == bottle["type"] and
        parsed["from"] == bottle.get("from", "unknown")
    )


# === Self-test on load ===
if __name__ == "__main__":
    import sys
    errors = 0
    
    # Test 1: STATUS bottle → formula
    bottle = {"type": "STATUS", "from": "oracle2", "body": "ready"}
    f = bottle_to_formula(bottle)
    expected = '=STATUS("oracle2", "ready")'
    if f == expected:
        print(f"✅ STATUS_BOTTLE: {f}")
    else:
        print(f"❌ STATUS_BOTTLE: got '{f}', expected '{expected}'")
        errors += 1
    
    # Test 2: TASK bottle → formula
    bottle = {"type": "TASK", "from": "forgemaster", "body": "build"}
    f = bottle_to_formula(bottle)
    expected = '=TASK("forgemaster", "build")'
    if f == expected:
        print(f"✅ TASK_BOTTLE: {f}")
    else:
        print(f"❌ TASK_BOTTLE: got '{f}', expected '{expected}'")
        errors += 1
    
    # Test 3: BLOCKER → IF formula
    bottle = {"type": "BLOCKER", "from": "agentA", "body": "waiting on input", "to": "agentB"}
    f = bottle_to_formula(bottle)
    expected = '=IF("agentA", "waiting on input", "agentB")'
    if f == expected:
        print(f"✅ BLOCKER: {f}")
    else:
        print(f"❌ BLOCKER: got '{f}', expected '{expected}'")
        errors += 1
    
    # Test 4: SPLINE → INVARIANT formula
    bottle = {"type": "SPLINE", "from": "oracle2", "body": "[1,0,-1]"}
    f = bottle_to_formula(bottle)
    expected = '=INVARIANT("oracle2", "[1,0,-1]")'
    if f == expected:
        print(f"✅ SPLINE: {f}")
    else:
        print(f"❌ SPLINE: got '{f}', expected '{expected}'")
        errors += 1
    
    # Test 5: ACK → STATUS formula (ACK reuses STATUS function)
    bottle = {"type": "ACK", "from": "oracle2", "body": "received"}
    f = bottle_to_formula(bottle)
    expected = '=STATUS("oracle2", "received")'
    if f == expected:
        print(f"✅ ACK: {f}")
    else:
        print(f"❌ ACK: got '{f}', expected '{expected}'")
        errors += 1
    
    # Test 6: Formula → bottle (STATUS)
    parsed = formula_to_bottle("B3", '=STATUS("oracle2", "ready")')
    if parsed["type"] == "STATUS" and parsed["from"] == "oracle2" and parsed["body"] == "ready":
        print(f"✅ FORMULA_TO_BOTTLE: type={parsed['type']}, from={parsed['from']}, body={parsed['body']}")
    else:
        print(f"❌ FORMULA_TO_BOTTLE: got {parsed}")
        errors += 1
    
    # Test 7: Formula → bottle (IF)
    parsed = formula_to_bottle("A5", '=IF("agentA", "blocked", "agentB")')
    if parsed["type"] == "BLOCKER" and parsed["from"] == "agentA" and parsed["body"] == "blocked":
        print(f"✅ FORMULA_TO_BOTTLE_IF: type={parsed['type']}, from={parsed['from']}")
    else:
        print(f"❌ FORMULA_TO_BOTTLE_IF: got {parsed}")
        errors += 1
    
    # Test 8: Formula → bottle (INVARIANT)
    parsed = formula_to_bottle("C1", '=INVARIANT("oracle2", "[1,0,-1]")')
    if parsed["type"] == "SPLINE" and parsed["body"] == "[1,0,-1]":
        print(f"✅ FORMULA_TO_BOTTLE_SPLINE: type={parsed['type']}, from={parsed['from']}, body={parsed['body']}")
    else:
        print(f"❌ FORMULA_TO_BOTTLE_SPLINE: got {parsed}")
        errors += 1
    
    # Test 9: Round-trip STATUS
    rt = round_trip({"type": "STATUS", "from": "oracle2", "body": "ready"})
    if rt:
        print(f"✅ ROUND_TRIP_STATUS: preserved")
    else:
        print(f"❌ ROUND_TRIP_STATUS: lost")
        errors += 1
    
    # Test 10: Round-trip TASK
    rt = round_trip({"type": "TASK", "from": "forgemaster", "body": "build binary"})
    if rt:
        print(f"✅ ROUND_TRIP_TASK: preserved")
    else:
        print(f"❌ ROUND_TRIP_TASK: lost")
        errors += 1
    
    # Test 11: Round-trip BLOCKER
    rt = round_trip({"type": "BLOCKER", "from": "agentA", "body": "stuck", "to": "agentB"})
    if rt:
        print(f"✅ ROUND_TRIP_BLOCKER: preserved")
    else:
        print(f"❌ ROUND_TRIP_BLOCKER: lost")
        errors += 1
    
    # Test 12: Round-trip SPLINE (verify body preserved)
    sp = {"type": "SPLINE", "from": "oracle2", "body": "[1,0,-1]"}
    sp_formula = bottle_to_formula(sp)
    sp_parsed = formula_to_bottle("D1", sp_formula)
    if sp_parsed["body"] == "[1,0,-1]" and sp_parsed["type"] == "SPLINE":
        print(f"✅ ROUND_TRIP_SPLINE: body={sp_parsed['body']}")
    else:
        print(f"❌ ROUND_TRIP_SPLINE: got {sp_parsed}")
        errors += 1
    
    # Test 12: Grid dependency table
    grid = [
        {"id": "A1", "raw": '=TASK("oracle2", "build subset")'},
        {"id": "B1", "raw": '=COMPOSE(A1: "result")'},
        {"id": "C1", "raw": '=TASK("forgemaster", A1)}'},
    ]
    deps = grid_to_dependency_table(grid)
    expected_deps = {"A1": [], "B1": ["A1"], "C1": ["A1"]}
    if deps == expected_deps:
        print(f"✅ DEP_TABLE: {deps}")
    else:
        print(f"❌ DEP_TABLE: got {deps}, expected {expected_deps}")
        errors += 1
    
    if errors == 0:
        print(f"\n✅ ALL 12 TESTS PASS")
        sys.exit(0)
    else:
        print(f"\n❌ {errors} TEST(S) FAILED")
        sys.exit(1)
