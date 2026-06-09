#!/usr/bin/env python3
"""
synthesis-init.py — Launches the hero-level synthesis session.
Reads all narrow agent outputs and sends them to Hermes 405B + Seed 2.0
for synoptic novel-insight generation.

Usage:
    python3 scripts/synthesis-init.py

This is called AFTER all 5 subagents complete.
"""

import json
import os
import sys

# All outputs that should exist after all agents complete
EXPECTED_OUTPUTS = {
    'Tool Audit': 'round-table/tool-audits/FULL_AUDIT.md',
    'JEPA Research': 'round-table/futures/JEPA_RESEARCH.md',
    '2032 Living Archive': 'round-table/futures/2032-LIVING_ARCHIVE.md',
    '2029 Lighting Designer': 'round-table/futures/2029-LIGHTING_DESIGNER.md',
    '2028 DAW Plugin': 'round-table/futures/2028-DAW_PLUGIN.md',
    'Ardour Exporter': 'tensor-demo/export-ardour.py',
    'Demucs Research': 'round-table/tool-audits/DEMUCS.md',
}

def check_readiness():
    """Check which expected outputs exist."""
    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    results = {}
    all_present = True
    for name, rel_path in EXPECTED_OUTPUTS.items():
        abspath = os.path.join(workspace, rel_path)
        exists = os.path.exists(abspath)
        size = os.path.getsize(abspath) if exists else 0
        results[name] = {'exists': exists, 'size': size, 'path': abspath}
        if not exists and 'Demucs' not in name:  # Demucs may still be running
            all_present = False
        if not exists:
            print(f"  ⏳ {name}: not yet available")
        else:
            print(f"  ✅ {name}: {size:,} bytes")

    return results, all_present


def generate_synthesis_prompt(results):
    """Generate the prompt for Hermes 405B with all agent outputs in context."""
    prompt_parts = []
    prompt_parts.append("""# Synthesis of 5 Narrow Agent Outputs

You are Hermes 3 405B operating at the highest level of insight.
Below are the outputs of 5 narrow research agents, each working on
a different slice of the same question:

**Question**: How do we build a live voice-to-conversation-MIDI pipeline
that connects 30 years of open-source audio tools?

Your task: Read ALL outputs synoptically and identify:

1. **Cross-Cutting Patterns** — What themes appear across multiple agents?
2. **Architecture Gaps** — What's missing that no single agent spotted?
3. **Novel Insights** — The most surprising finding across ALL data.
4. **Fork Priority** — One concrete tool to fork first. Not a roadmap.
5. **Blind Spot** — Something none of the agents considered.
6. **Metaphor** — A strong analogy that captures the whole system.

Be specific. Reference evidence from the outputs. Have a strong opinion.

""")

    for name, info in results.items():
        if not info['exists']:
            continue
        try:
            with open(info['path']) as f:
                content = f.read()
            prompt_parts.append(f"\n\n{'='*60}")
            prompt_parts.append(f"### Agent Output: {name}")
            prompt_parts.append(f"Source: {info['path']}")
            prompt_parts.append(f"Size: {info['size']:,} bytes")
            prompt_parts.append(f"{'='*60}\n")
            # Truncate very large files
            if info['size'] > 30000:
                prompt_parts.append(content[:15000])
                prompt_parts.append(f"\n[... truncated, full file at {info['path']}]")
            else:
                prompt_parts.append(content)
        except Exception as e:
            prompt_parts.append(f"\n[Error reading {name}: {e}]")

    return "\n".join(prompt_parts)


if __name__ == '__main__':
    print("=" * 60)
    print("Synthesis Readiness Check")
    print("=" * 60)
    results, ready = check_readiness()
    print()
    if ready:
        print(f"\n✅ ALL AGENTS COMPLETE. Ready for synthesis.")
        prompt = generate_synthesis_prompt(results)
        out_path = '/home/ubuntu/.openclaw/workspace/round-table/decisions/synthesis-prompt.md'
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'w') as f:
            f.write(prompt)
        print(f"✅ Synthesis prompt written: {out_path} ({len(prompt):,} bytes)")
    else:
        print(f"\n⏳ Waiting for remaining agents. Synthesis will fire when all are ready.")
