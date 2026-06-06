# la-Crystallize.py (Sovereign Engine)

import os
import json
import shutil
from pathlib import Path

def crystallize(room_path):
    path = Path(room_path)
    print(f"Sovereign Hub: Initializing crystallization of {path.name}...")

    # 1. Room Sensing (Zero-Shot Identification)
    files = [f.name for f in path.glob('**/*') if f.is_file()]
    domain = "General Synthesis"
    role = "Sovereign Asset"
    
    # Simple heuristics for domain identification
    if any("core" in f.lower() for f in files): domain = "Core Runtime"
    elif any("protocol" in f.lower() for f in files): domain = "Network Protocol"
    elif any("theory" in f.lower() for f in files): domain = "Formal Logic"

    # 2. Construct CORTEX.json
    cortex = {
        "room_id": path.name,
        "expertise": {
            "domain": domain,
            "role": role,
            "capabilities": ["zero-shot-activation", "system-sync"]
        },
        "anchors": [],
        "splines": [],
        "negative_space": {
            "limits": ["cannot self-evolve without Hub"],
            "synthesis_requirement": "Hub-level la-resonance",
            "hub_request_pattern": "Request synthesis of [Domain] l-Sovereign la-run."
        },
        "metadata": {
            "version": "1.0.0",
            "status": "crystallized"
        }
    }

    # Find critical anchors (files larger than 1KB or containing 'spec')
    for f in path.glob('**/*'):
        if f.is_file() and (f.stat().st_size > 1024 or "spec" in f.name.lower()):
            cortex["anchors"].append({
                "id": f.name,
                "path": str(f.relative_to(path)),
                "significance": "Critical infrastructure file",
                "type": "code" if f.suffix in ['.py', '.c', '.ts'] else "doc"
            })

    with open(path / "CORTEX.json", "w") as f:
        json.dump(cortex, f, indent=2)

    # 3. Enforce Sovereignty (Directory Structure)
    structure = ["docs/specs", "src/core", "tests/integration", "scripts/sync"]
    for folder in structure:
        (path / folder).mkdir(parents=True, exist_ok=True)
    
    print(f"Sovereign Hub: {path.name} has been crystallized. Room is now operational.")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        crystallize(sys.argv[1])
    else:
        print("Usage: python3 crystallize.py <path_to_room>")
