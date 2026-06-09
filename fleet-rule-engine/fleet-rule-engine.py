#!/usr/bin/env python3
"""
fleet-rule-engine — Conversation MIDI Validator
=================================================
Validates lead-sheet-MIDI data against music theory rules and
conversation-theory rules (conservation law, ternary state machine).

Inspired by CMC (Creative MIDI Companion) but extended with proprietary
conversation-theory rules that are our IP.

Usage:
    python3 fleet-rule-engine.py validate --input lead-sheet-v2.json
    python3 fleet-rule-engine.py fix --input lead-sheet-v2.json --output fixed.json
    python3 fleet-rule-engine.py visualize --input lead-sheet-v2.json
"""

import json
import sys
import os
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum


# ─── Constants ──────────────────────────────────────────────────────────────

NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

# Interval types for the affinity matrix
INTERVAL_NAMES = {
    0: 'unison', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd',
    4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone',
    7: 'perfect 5th', 8: 'minor 6th', 9: 'major 6th',
    10: 'minor 7th', 11: 'major 7th'
}


class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ValidationFinding:
    """A single validation finding — rule violation or observation."""
    rule: str           # Rule identifier
    severity: Severity
    message: str        # Human-readable
    location: dict      # {track, event_index, t} or empty
    suggestion: Optional[str] = None
    evidence: dict = field(default_factory=dict)  # Supporting data


# ─── Rule Engine Core ───────────────────────────────────────────────────────

class ConversationRuleEngine:
    """
    Validates lead-sheet-MIDI data against two rule sets:
    1. Music theory (scale membership, harmonic motion, voice leading)
    2. Conversation theory (conservation law, ternary state transitions)
    """

    def __init__(self, data: dict):
        self.data = data
        self.tracks = data.get('tracks', [])
        self.findings: List[ValidationFinding] = []
        self._extract_track_map()

    def _extract_track_map(self):
        """Index all tracks by name for fast lookup."""
        self.track_by_name = {}
        for t in self.tracks:
            name = t.get('name', '').lower().replace(' ', '_')
            self.track_by_name[name] = t

    def get_track(self, *names):
        """Get track by any of several names."""
        for name in names:
            key = name.lower().replace(' ', '_')
            if key in self.track_by_name:
                return self.track_by_name[key]
        return None

    # ── Music Theory Rules ──────────────────────────────────────────────

    def rule_major_scale_membership(self):
        """
        R01: Pitch contour events should be within ±1 semitone of a
        major scale key, given the implied key center.
        """
        pitch_track = self.get_track('pitch_contour', 'midi_notes')
        if not pitch_track:
            return

        events = pitch_track.get('events', [])
        if not events:
            return

        # Estimate key center from first note
        first_note = events[0].get('note', 60) % 12
        detected_key = NOTES[first_note]

        for i, ev in enumerate(events):
            note = ev.get('note', 60)
            pitch_class = note % 12
            offset = note // 12

            # Check major scale membership
            is_in_major = pitch_class in MAJOR_SCALE
            if not is_in_major:
                # Find nearest scale degree
                nearest = min(MAJOR_SCALE, key=lambda x: min((x - pitch_class) % 12, (pitch_class - x) % 12))
                semitone_dist = min((pitch_class - nearest) % 12, (nearest - pitch_class) % 12)

                self.findings.append(ValidationFinding(
                    rule='R01',
                    severity=Severity.WARNING,
                    message=f"Note {NOTES[pitch_class]}{offset} is outside {detected_key} major scale "
                            f"(nearest scale degree: {NOTES[nearest]}, distance: {semitone_dist} semitone{'s' if semitone_dist != 1 else ''})",
                    location={'track': 'pitch_contour', 'event_index': i, 'time': ev.get('t')},
                    suggestion=f"Shift to {NOTES[nearest]}{offset} (nearest scale tone)",
                    evidence={'pitch_class': pitch_class, 'nearest_scale_degree': nearest, 'distance': semitone_dist}
                ))

    def rule_interval_affinity(self):
        """
        R02: Interval changes between consecutive notes should respect the
        interval affinity matrix from our reharmonizer.
        Favored intervals: perfect 5th (7), major/minor 3rd (3/4),
        major 2nd (2). Dissonant: tritone (6), minor 2nd (1).
        """
        pitch_track = self.get_track('pitch_contour', 'midi_notes')
        if not pitch_track:
            return

        events = pitch_track.get('events', [])
        for i in range(len(events) - 1):
            a = events[i].get('note', 60)
            b = events[i + 1].get('note', 60)
            interval = abs(b - a) % 12

            # Flag tritones and minor 2nds (both melodic and harmonic)
            if interval == 6:
                self.findings.append(ValidationFinding(
                    rule='R02',
                    severity=Severity.WARNING,
                    message=f"Tritone between events {i} and {i+1} "
                            f"({NOTES[a%12]} → {NOTES[b%12]})",
                    location={'track': 'pitch_contour', 'event_indices': [i, i+1],
                              'times': [events[i].get('t'), events[i+1].get('t')]},
                    suggestion="Consider chromatic approach or skip to perfect 5th",
                    evidence={'interval': interval, 'interval_name': INTERVAL_NAMES[interval],
                              'from_note': NOTES[a%12], 'to_note': NOTES[b%12]}
                ))

    def rule_voice_leading(self):
        """
        R03: Voice leading should move in connected, step-wise motion
        unless a deliberate leap. Leaps > 5 semitones should resolve
        by step in the opposite direction.
        """
        pitch_track = self.get_track('pitch_contour', 'midi_notes')
        if not pitch_track:
            return

        events = pitch_track.get('events', [])
        for i in range(len(events) - 2):
            a = events[i].get('note', 60)
            b = events[i+1].get('note', 60)
            c = events[i+2].get('note', 60)

            leap = abs(b - a)
            if leap > 5:
                # Check if next interval resolves by step in opposite direction
                resolution = c - b
                if abs(resolution) > 2:
                    self.findings.append(ValidationFinding(
                        rule='R03',
                        severity=Severity.INFO,
                        message=f"Large leap ({leap} semitones) from event {i} to {i+1} "
                                f"does not resolve by step (resolution: {resolution} semitones)",
                        location={'track': 'pitch_contour', 'event_indices': [i, i+1, i+2]},
                        suggestion="Resolve large leaps in opposite direction by step",
                        evidence={'leap': leap, 'resolution': resolution}
                    ))

    # ── Conversation Theory Rules ───────────────────────────────────────

    def rule_conservation_law(self):
        """
        C01: Σ(Δ_ternary) → 0 over a closed conversational gesture.
        The sum of ternary state changes should return to zero.
        """
        prosody_track = self.get_track('prosody_cc', 'midi_cc')
        if not prosody_track:
            return

        events = prosody_track.get('events', [])
        if not events:
            return

        # Track the cumulative ternary delta
        cum_delta = 0
        segments = []

        for i, ev in enumerate(events):
            # Extract ternary state from CC values
            # CC74 (timbre/brightness) → ternary pitch
            # CC71 (resonance) → ternary volume
            # CC11 (expression) → ternary energy
            cc74 = ev.get('cc74', ev.get('controller', 74))
            cc71 = ev.get('cc71', ev.get('controller', 71))
            cc11 = ev.get('cc11', ev.get('controller', 11))

            # Quantize to ternary states
            def to_ternary(val):
                return -1 if val < 42 else (0 if val < 84 else 1)

            t_pitch = to_ternary(cc74 if cc74 != 74 else 64)
            t_volume = to_ternary(cc71 if cc71 != 71 else 64)
            t_energy = to_ternary(cc11 if cc11 != 11 else 64)

            delta = t_pitch + t_volume + t_energy
            cum_delta += delta
            segments.append({
                'index': i,
                'delta': delta,
                'cumulative': cum_delta,
                'ternary_vector': [t_pitch, t_volume, t_energy]
            })

        # Check: does the gesture close?
        closed = abs(cum_delta) <= 1
        if not closed:
            self.findings.append(ValidationFinding(
                rule='C01',
                severity=Severity.ERROR if abs(cum_delta) > 3 else Severity.WARNING,
                message=f"Conversation conservation law violated: "
                        f"Σ(Δ_ternary) = {cum_delta} (should approach 0)",
                location={},
                suggestion="Adjust opposing ternary states to balance the gesture",
                evidence={'cumulative_delta': cum_delta, 'segments': segments, 'closed': closed}
            ))

        return segments

    def rule_ternary_transition(self):
        """
        C02: Ternary state transitions should follow the conversation
        state machine: Agreement (+1,+1,+1), Neutral (0,0,0),
        Disagreement (-1,-1,-1). Direct flips (agreement→disagreement)
        are flagged.
        """
        prosody_track = self.get_track('prosody_cc', 'midi_cc')
        if not prosody_track:
            return

        events = prosody_track.get('events', [])
        if len(events) < 2:
            return

        prev_vector = None
        for i, ev in enumerate(events):
            def to_ternary(val_name):
                v = ev.get(val_name, ev.get('value', 64))
                return -1 if v < 42 else (0 if v < 84 else 1)

            # We need to handle the variable naming in prosody CC
            # Prosody CC events have 'value' field with CC change
            value = ev.get('value', ev.get('cc74', ev.get('cc', 64)))
            t_pitch = ev.get('ternary_pitch', -1 if value < 42 else (0 if value < 84 else 1))
            t_vol = ev.get('ternary_volume', 0)
            t_en = ev.get('ternary_energy', 0)

            # Actually derive from track metadata
            track_type = prosody_track.get('type', '')
            vector = [t_pitch, t_vol, t_en]

            if prev_vector and vector != prev_vector:
                # Check for direct flip
                def vector_name(v):
                    if v[0] >= 0 and v[1] >= 0 and v[2] >= 0:
                        return "agreement (+)"
                    elif v[0] <= 0 and v[1] <= 0 and v[2] <= 0:
                        return "disagreement (-)"
                    else:
                        return "mixed"

                prev_name = vector_name(prev_vector)
                curr_name = vector_name(vector)

                flip = sum(abs(a - b) for a, b in zip(vector, prev_vector))
                if flip > 4:
                    self.findings.append(ValidationFinding(
                        rule='C02',
                        severity=Severity.INFO,
                        message=f"Sharp ternary transition at event {i}: "
                                f"{prev_name} → {curr_name} (Δ={flip})",
                        location={'track': 'prosody_cc', 'event_index': i},
                        suggestion="Consider intermediate transition states",
                        evidence={'from': prev_vector, 'to': vector, 'delta': flip}
                    ))

            prev_vector = vector

    def rule_speaker_alternation(self):
        """
        C03: In multi-speaker lead-sheets, speakers should alternate.
        Extended monologue (>5 consecutive events by one speaker) flagged.
        """
        # Get stage directions track
        stage_track = self.get_track('stage_directions', 'sys_ex')
        pitch_track = self.get_track('pitch_contour', 'midi_notes')
        if not stage_track or not pitch_track:
            return

        pitch_events = pitch_track.get('events', [])
        stage_events = stage_track.get('events', [])

        # Map speaker_id from stage directions to pitch events (by index)
        for i in range(len(pitch_events) - 4):
            # Get speaker_ids for 5 consecutive events
            speakers = []
            for j in range(5):
                idx = i + j
                if idx < len(stage_events):
                    s = stage_events[idx].get('speaker_id', stage_events[idx].get('data', 0))
                else:
                    s = None
                speakers.append(s)

            all_same = all(s == speakers[0] for s in speakers if s is not None)
            if all_same and speakers[0] is not None:
                self.findings.append(ValidationFinding(
                    rule='C03',
                    severity=Severity.WARNING,
                    message=f"Extended monologue: speaker {speakers[0]} for "
                            f"5+ consecutive events (events {i}-{i+4})",
                    location={'track': 'pitch_contour', 'event_indices': [i, i+4]},
                    suggestion="Consider interjecting the other speaker",
                    evidence={'speaker': speakers[0], 'run_length': 5, 'start_idx': i}
                ))

    def rule_tempo_adherence(self):
        """
        C04: Tempo should remain within ±25% of the median word rate.
        Extreme tempo changes (>50%) flagged.
        """
        pitch_track = self.get_track('pitch_contour', 'midi_notes')
        if not pitch_track:
            return

        events = pitch_track.get('events', [])
        if len(events) < 3:
            return

        # Calculate inter-word intervals
        intervals = []
        for i in range(len(events) - 1):
            t0 = events[i].get('t', 0)
            t1 = events[i+1].get('t', 0)
            diff = t1 - t0
            if diff > 0:
                intervals.append(diff)

        if not intervals:
            return

        median_interval = sorted(intervals)[len(intervals) // 2]
        significant_deltas = []
        for i, iv in enumerate(intervals):
            deviation = abs(iv - median_interval) / median_interval if median_interval > 0 else 0
            if deviation > 0.50:
                evt_index = i + 1
                significant_deltas.append((evt_index, iv, deviation))

        # Report the most significant deviations
        significant_deltas.sort(key=lambda x: -x[2])
        for evt_idx, iv, dev in significant_deltas[:3]:
            self.findings.append(ValidationFinding(
                rule='C04',
                severity=Severity.WARNING,
                message=f"Extreme tempo change at event {evt_idx}: "
                        f"interval={iv:.2f}s, deviation={dev:.0%} from median",
                location={'track': 'pitch_contour', 'event_index': evt_idx},
                suggestion="Normalize inter-word timing",
                evidence={'interval': iv, 'median_interval': median_interval, 'deviation': dev}
            ))

    # ── Run All Rules ───────────────────────────────────────────────────

    def validate_all(self) -> List[ValidationFinding]:
        self.findings = []
        self.rule_major_scale_membership()
        self.rule_interval_affinity()
        self.rule_voice_leading()
        self.rule_conservation_law()
        self.rule_ternary_transition()
        self.rule_speaker_alternation()
        self.rule_tempo_adherence()
        return self.findings


# ─── Fix Suggestions ────────────────────────────────────────────────────────

def suggest_fixes(findings: List[ValidationFinding], data: dict) -> dict:
    """
    Given findings, suggest automatic fixes and return modified data
    with annotations.
    """
    result = {
        'original': data,
        'findings_count': len(findings),
        'fixes': [],
        'modified_data': json.loads(json.dumps(data))  # deep copy
    }

    for f in findings:
        if f.severity == Severity.ERROR and f.suggestion:
            result['fixes'].append({
                'rule': f.rule,
                'message': f.message,
                'suggestion': f.suggestion,
                'applied': False,  # Manual by default
                'auto_fixable': len(f.evidence) > 0
            })

    return result


# ─── Interactive Markdown Report ────────────────────────────────────────────

def render_report(findings: List[ValidationFinding], title="Fleet Rule Engine Report"):
    """Render validation findings as a markdown report."""
    lines = [
        f"# {title}",
        f"**Date**: {__import__('datetime').datetime.now().isoformat()[:10]}",
        f"**Total findings**: {len(findings)}",
        "",
        "## Summary",
    ]

    error_count = sum(1 for f in findings if f.severity == Severity.ERROR)
    warn_count = sum(1 for f in findings if f.severity == Severity.WARNING)
    info_count = sum(1 for f in findings if f.severity == Severity.INFO)
    lines.append(f"- 🔴 Errors: {error_count}")
    lines.append(f"- 🟡 Warnings: {warn_count}")
    lines.append(f"- 🔵 Info: {info_count}")
    lines.append("")

    # Group by rule
    by_rule = {}
    for f in findings:
        by_rule.setdefault(f.rule, []).append(f)

    lines.append("## By Rule")
    for rule, fs in sorted(by_rule.items()):
        severity_icon = {'error': '🔴', 'warning': '🟡', 'info': '🔵'}
        icon = severity_icon.get(fs[0].severity.value, '⚪')
        lines.append(f"### {icon} {rule} — {len(fs)} findings")

        # Show first 3
        for f in fs[:3]:
            loc_str = ""
            if f.location:
                idx = f.location.get('event_index', f.location.get('event_indices', ['?']))
                loc_str = f" (event {idx})"
            lines.append(f"- {f.message}{loc_str}")
            if f.suggestion:
                lines.append(f"  - 💡 *{f.suggestion}*")
        if len(fs) > 3:
            lines.append(f"  - *... and {len(fs) - 3} more*")
        lines.append("")

    return "\n".join(lines)


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Fleet Rule Engine — Conversation MIDI Validator")
    parser.add_argument('action', choices=['validate', 'fix', 'visualize', 'report'])
    parser.add_argument('--input', '-i', default='tensor-output/lead-sheet-v2.json',
                        help='Input lead-sheet JSON file')
    parser.add_argument('--output', '-o', help='Output file (for fix/report)')
    args = parser.parse_args()

    # Load data
    if not os.path.exists(args.input):
        print(f"Error: input file not found: {args.input}")
        sys.exit(1)

    with open(args.input) as f:
        data = json.load(f)

    engine = ConversationRuleEngine(data)

    if args.action == 'validate':
        findings = engine.validate_all()
        for f in findings:
            icon = {'error': '🔴', 'warning': '🟡', 'info': '🔵'}
            print(f"  {icon[f.severity.value]} [{f.rule}] {f.message}")
        print(f"\nTotal: {len(findings)} findings "
              f"({sum(1 for f in findings if f.severity==Severity.ERROR)} errors, "
              f"{sum(1 for f in findings if f.severity==Severity.WARNING)} warnings)")

    elif args.action == 'report':
        findings = engine.validate_all()
        report = render_report(findings)
        out_path = args.output or 'tensor-output/rule-engine-report.md'
        with open(out_path, 'w') as f:
            f.write(report)
        print(f"Report written to {out_path}")
        print(f"Total: {len(findings)} findings")

    elif args.action == 'fix':
        findings = engine.validate_all()
        result = suggest_fixes(findings, data)
        out_path = args.output or 'tensor-output/fixed-lead-sheet.json'
        # Don't overwrite, create fixed version
        data['validation'] = {
            'findings_count': len(findings),
            'fixes_suggested': len(result['fixes']),
        }
        with open(out_path, 'w') as f:
            json.dump(result['modified_data'], f, indent=2)
        print(f"Fixed data written to {out_path}")

    elif args.action == 'visualize':
        findings = engine.validate_all()
        print(f"# Conversation Shape\n")
        print(f"Findings: {len(findings)}")

        # Try conservation law visualization
        segments = engine.rule_conservation_law()
        if segments and isinstance(segments, list):
            print(f"\n## Cumulative Ternary Delta\n")
            print(f"```")
            cum_values = [s['cumulative'] for s in segments]
            min_v, max_v = min(cum_values), max(cum_values)
            for s in segments:
                c = s['cumulative']
                bar_len = int(abs(c) * 2) + 1
                bar = '█' * bar_len if c >= 0 else '░' * bar_len
                print(f"{s['index']:3d} | {bar:10s} {c:+d}")
            print(f"```")
            print(f"\nGesture closed: {abs(cum_values[-1]) <= 1}")


if __name__ == '__main__':
    main()
