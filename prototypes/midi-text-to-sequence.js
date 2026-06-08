#!/usr/bin/env node

/**
 * ᛏ MIDI Text-to-Sequence Bridge
 * ================================
 * Takes a natural-language prompt, generates MIDI via music21 (Python),
 * tokenizes the MIDI events into a sequence for fleet transport,
 * and drops the result as an I2I bottle via fleet-bridge.
 *
 * Usage:
 *   node midi-text-to-sequence.js [--output /path/to/output.mid] [prompt...]
 *
 * Example:
 *   node midi-text-to-sequence.js "Create a 4/4 jazz piano progression in C major with walking bassline"
 *
 * Output:
 *   - MIDI file (default: generated/output-{timestamp}.mid)
 *   - Sequence JSON (default: generated/tokenized-{timestamp}.json)
 *   - Fleet bottle (via I2I transport to registered agents)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, execSync } = require('child_process');

// Python binary — prefer 3.10 for installed packages, fallback to default
const PYTHON_BIN = process.env.PYTHON_BIN || (() => {
  const candidates = ['python3.10', 'python3.12', 'python3.11', 'python3', 'python'];
  for (const c of candidates) {
    try {
      const r = execSync(`${c} -c "import music21; print(1)" 2>/dev/null`, { stdio: 'pipe', timeout: 3000 });
      if (r.toString().trim() === '1') return c;
    } catch (_) {}
  }
  return '/usr/bin/python3.10';
})();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const OUTPUT_DIR = path.join(__dirname, 'generated');
const FLEET_VESSEL_DIR = path.join(
  process.env.HOME || '/tmp',
  '.openclaw', 'workspace', 'i2i-vessel'
);

const BOTTLE_TYPES = [
  'TASK', 'STATUS', 'CHECKPOINT', 'BLOCKER', 'DELIVERABLE',
  'BOTTLE', 'ACK', 'SYNTHESIS', 'CHALLENGE', 'SESSION', 'SPLINE', 'REFLECT', 'PROMOTE'
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    throw new Error(`Cannot create directory ${dir}: ${err.message}`);
  }
}

/**
 * Generate a hex hash for a JSON object (for bottle integrity).
 */
function hashBottle(content) {
  const serialized = JSON.stringify(content, Object.keys(content).sort());
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}

/**
 * Timestamp string for filenames and bottles.
 */
function timestamp() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Step 1: Text → MIDI via music21 (Python)
// ---------------------------------------------------------------------------

/**
 * Generate a MIDI file from a natural language prompt using music21.
 *
 * The Python helper script interprets the prompt and composes a corresponding
 * musical structure: chords, bassline, melody, tempo, time signature, etc.
 *
 * @param {string} prompt - Natural language description of desired music
 * @returns {{ midiPath: string, metadata: object }}
 */
function textToMidi(prompt) {
  ensureDir(OUTPUT_DIR);
  const midiPath = path.join(OUTPUT_DIR, `output-${timestamp()}.mid`);
  const tempPy = path.join(OUTPUT_DIR, `_gen_${timestamp()}.py`);

  // Build a Python script that uses music21 to interpret the prompt
  const pyScript = `
import sys, json, music21 as m21

def err(msg):
    print(json.dumps({"error": msg}), flush=True)
    sys.exit(1)

prompt = """${prompt.replace(/`/g, '\\`').replace(/\$/g, '\\$')}"""

# ---------- Prompt parser ----------
prompt_lower = prompt.lower()

# Determine key
key_map = {
    'c major': 'C', 'c minor': 'c', 'c# major': 'C#', 'c# minor': 'c#',
    'd major': 'D', 'd minor': 'd', 'eb major': 'E-', 'e minor': 'e',
    'e major': 'E', 'f major': 'F', 'f minor': 'f', 'f# major': 'F#',
    'g major': 'G', 'g minor': 'g', 'ab major': 'A-', 'a minor': 'a',
    'a major': 'A', 'bb major': 'B-', 'b minor': 'b', 'b major': 'B',
    'c major': 'C', 'a minor': 'a',
}
key = 'C'
for k in ['c minor', 'c major', 'a minor', 'd minor', 'g major',
           'f major', 'e minor', 'bb major', 'd major', 'a major',
           'g minor', 'ab major', 'e major', 'b minor', 'f# major',
           'b major', 'c# minor', 'f minor', 'eb major', 'db major',
           'c# major', 'ab minor', 'bb minor', 'eb minor']:
    if k in prompt_lower:
        key = key_map.get(k, 'C')
        break

# Determine tempo
tempo = 120
if 'walking' in prompt_lower: tempo = 140
if 'ballad' in prompt_lower: tempo = 70
if 'up-tempo' in prompt_lower or 'up tempo' in prompt_lower: tempo = 180
if 'slow' in prompt_lower: tempo = 60
if 'fast' in prompt_lower: tempo = 160
if 'bpm' in prompt_lower:
    import re
    bpm_match = re.search(r'(\\d+)\\s*bpm', prompt_lower)
    if bpm_match: tempo = int(bpm_match.group(1))

# Determine time signature
ts_num, ts_den = 4, 4
for t in ['3/4', '4/4', '5/4', '6/8', '7/8', '12/8']:
    if t in prompt_lower:
        ts_num, ts_den = int(t.split('/')[0]), int(t.split('/')[1])
        break

# Determine genre/style
style = 'jazz'
if 'blues' in prompt_lower: style = 'blues'
elif 'classical' in prompt_lower: style = 'classical'
elif 'pop' in prompt_lower: style = 'pop'
elif 'rock' in prompt_lower: style = 'rock'
elif 'latin' in prompt_lower or 'bossa' in prompt_lower: style = 'latin'

# Number of measures
measures = 8
for m in [4, 8, 12, 16, 32]:
    if f'{m} measure' in prompt_lower or f'{m} bar' in prompt_lower:
        measures = m
        break

print(json.dumps({
    "parsed": {"key": key, "tempo": tempo, "time_sig": f"{ts_num}/{ts_den}",
               "style": style, "measures": measures}
}), flush=True)

# ---------- Composition ----------
s = m21.stream.Score()
p1 = m21.stream.Part()
p1.partName = 'Piano'
p2 = m21.stream.Part()
p2.partName = 'Bass'

# Instrument
p1.insert(0, m21.instrument.Piano())
p2.insert(0, m21.instrument.ElectricBass())

# Time signature & key
ts = m21.meter.TimeSignature(f'{ts_num}/{ts_den}')
s.insert(0, ts)
ks = m21.key.Key(key)
s.insert(0, ks)
s.insert(0, m21.tempo.MetronomeMark(number=tempo))

# Chord progression by style
chord_progs = {
    'jazz': ['CM7', 'Dm7', 'G7', 'CM7', 'Am7', 'Dm7', 'G7', 'C6'],
    'blues': ['C7', 'F7', 'C7', 'C7', 'F7', 'F7', 'C7', 'G7'],
    'classical': ['I', 'IV', 'V', 'I', 'ii', 'V', 'I', 'I'],
    'pop': ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'C'],
    'rock': ['C5', 'F5', 'C5', 'G5', 'C5', 'F5', 'C5', 'G5'],
    'latin': ['CM7', 'G7', 'Am7', 'Em7', 'Dm7', 'G7', 'CM7', 'G7'],
}
chords = chord_progs.get(style, chord_progs['jazz'])[:measures]

# Generate the actual chord names from key
root_note = m21.pitch.Pitch(key)
def resolve_chord(chord_name):
    if chord_name in ['I', 'i']:
        return f'{key}M7' if key.isupper() else f'{key}m7'
    elif chord_name == 'IV':
        iv = m21.interval.Interval('P4').transposePitch(root_note)
        return f'{iv.name}M7' if iv.name[0].isupper() else f'{iv.name}m7'
    elif chord_name == 'V':
        v = m21.interval.Interval('P5').transposePitch(root_note)
        return f'{v.name}7'
    elif chord_name == 'ii':
        ii = m21.interval.Interval('M2').transposePitch(root_note)
        return f'{ii.name}m7'
    elif chord_name == 'vi':
        vi = m21.interval.Interval('M6').transposePitch(root_note)
        return f'{vi.name}m7'
    return chord_name

resolved = [resolve_chord(c) for c in chords]

# Build the piano part
for i, chord_str in enumerate(resolved):
    try:
        c = m21.chord.Chord(chord_str)
    except:
        c = m21.chord.Chord(['C4', 'E4', 'G4'])
    c.quarterLength = ts_num / len(resolved) * 4
    p1.append(c)

# Walking bass line
for i, chord_str in enumerate(resolved):
    try:
        c = m21.harmony.chordSymbolFigureToChord(chord_str)
        if c is None:
            c = m21.chord.Chord(chord_str)
    except:
        c = m21.chord.Chord(['C4', 'E4', 'G4'])
    
    # Walking pattern: root on beat 1, then various chord tones
    base = c.root()
    notes_in_chord = sorted(set(
        p.midi for p in c.pitches if p.midi >= base.midi
    ))[:4]
    
    beat_dur = ts_num / 4.0
    if 'walking' in prompt_lower:
        # Four quarter notes per measure, walking pattern
        for beat in range(4):
            idx = beat % len(notes_in_chord)
            midi_val = notes_in_chord[idx]
            n = m21.note.Note(midi_val)
            n.quarterLength = 1.0
            # Alternate octaves for walking feel
            if beat % 2 == 1 and 'walking' in prompt_lower:
                n.pitch.octave = 2
            else:
                n.pitch.octave = 2
            p2.append(n)
    else:
        # Root on beat 1, fifth on beat 3
        n1 = m21.note.Note(base)
        n1.quarterLength = beat_dur
        n1.pitch.octave = 2
        p2.append(n1)
        if len(notes_in_chord) >= 3:
            n2 = m21.note.Note(notes_in_chord[2])
            n2.quarterLength = beat_dur
            n2.pitch.octave = 2
            p2.append(n2)

s.insert(0, p1)
s.insert(0, p2)

# Write MIDI
out_path = "${midiPath}"
s.write('midi', fp=out_path)
print(json.dumps({"midi_path": out_path, "notes": len(s.flatten().notes)}), flush=True)
`;

  fs.writeFileSync(tempPy, pyScript, 'utf8');

  const result = spawnSync(PYTHON_BIN, [tempPy], {
    encoding: 'utf8',
    timeout: 30000
  });

  // Clean up temp script
  try { fs.unlinkSync(tempPy); } catch (_) {}

  if (result.error) {
    throw new Error(`Python execution failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Python exited with code ${result.status}\nStderr: ${result.stderr?.slice(0, 500)}`);
  }

  // Parse all JSON lines from stdout
  const lines = result.stdout.trim().split('\n').filter(l => l.trim());
  let metadata = {};
  let parsedInfo = {};
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.parsed) parsedInfo = parsed.parsed;
      if (parsed.midi_path) metadata = parsed;
    } catch (_) {
      // Non-JSON output (e.g. music21 logging) — ignore
    }
  }

  if (!fs.existsSync(midiPath)) {
    throw new Error(`MIDI file not generated at ${midiPath}\nPython output: ${result.stdout?.slice(0, 300)}\nPython stderr: ${result.stderr?.slice(0, 300)}`);
  }

  return { midiPath, metadata: { ...parsedInfo, ...metadata } };
}

// ---------------------------------------------------------------------------
// Step 2: MIDI → Tokenized Sequence (using MIDI event serialization)
// ---------------------------------------------------------------------------

/**
 * Parse a MIDI file into a tokenized sequence suitable for fleet transport.
 *
 * Uses mido (Python) to extract note-on/note-off events and serializes them
 * into a compact sequence of tokens with timing deltas.
 *
 * @param {string} midiPath - Path to the MIDI file
 * @returns {{ tokens: Array, sequence: string, stats: object }}
 */
function midiToTokenSequence(midiPath) {
  const tempPy = path.join(OUTPUT_DIR, `_tokenize_${timestamp()}.py`);

  const pyScript = `
import sys, json, mido

def err(msg):
    print(json.dumps({"error": msg}), flush=True)
    sys.exit(1)

mid = mido.MidiFile("${midiPath.replace(/'/g, "\\'")}")

tokens = []
note_events = []
stats = {"tracks": len(mid.tracks), "ticks_per_beat": mid.ticks_per_beat, "total_events": 0, "note_count": 0}

for track_idx, track in enumerate(mid.tracks):
    abs_time = 0
    for msg in track:
        abs_time += msg.time
        ev = {
            "type": msg.type,
            "time": msg.time,
            "abs_time": abs_time,
            "track": track_idx
        }
        if hasattr(msg, 'note'):
            ev["note"] = msg.note
            ev["velocity"] = msg.velocity
        if hasattr(msg, 'channel'):
            ev["channel"] = msg.channel
        if hasattr(msg, 'control'):
            ev["control"] = msg.control
            ev["value"] = msg.value
        if hasattr(msg, 'program'):
            ev["program"] = msg.program
        if hasattr(msg, 'key'):
            ev["key"] = msg.key
        note_events.append(ev)
        stats["total_events"] += 1
        if msg.type in ('note_on', 'note_off'):
            stats["note_count"] += 1

# Build token sequence — compact representation
# Token format: "TYPE:delta:args" where delta is ticks since last event
token_seq = []
prev_abs = 0
for ev in note_events:
    delta = ev['abs_time'] - prev_abs
    prev_abs = ev['abs_time']
    
    if ev['type'] == 'note_on':
        token_seq.append(f"N:{delta}:{ev['note']}:{ev['velocity']}:{ev.get('channel', 0)}")
    elif ev['type'] == 'note_off':
        token_seq.append(f"F:{delta}:{ev['note']}:{ev.get('channel', 0)}")
    elif ev['type'] == 'control_change':
        token_seq.append(f"C:{delta}:{ev['control']}:{ev['value']}")
    elif ev['type'] == 'program_change':
        token_seq.append(f"P:{delta}:{ev.get('program', 0)}")
    elif ev['type'] == 'set_tempo':
        token_seq.append(f"T:{delta}:{ev.get('tempo', 500000)}")
    elif ev['type'] == 'time_signature':
        token_seq.append(f"S:{delta}:{ev.get('numerator', 4)}/{ev.get('denominator', 4)}")
    elif ev['type'] == 'key_signature':
        token_seq.append(f"K:{delta}:{ev.get('key', 'C')}")
    elif ev['type'] == 'end_of_track':
        token_seq.append(f"E:{delta}:0")
    else:
        # Skip/reset, meta events etc.
        pass

# Also add a summary token at the start
header_tokens = [
    f"H:{mid.ticks_per_beat}:{stats['tracks']}:{stats['total_events']}:{stats['note_count']}"
]
all_tokens = header_tokens + token_seq

result = {
    "tokens": all_tokens,
    "stats": stats,
    "sequence": "|".join(all_tokens),
    "compressed": len("|".join(all_tokens)),
    "raw_events": len(note_events)
}

print(json.dumps(result), flush=True)
`;

  fs.writeFileSync(tempPy, pyScript, 'utf8');

  const result = spawnSync(PYTHON_BIN, [tempPy], {
    encoding: 'utf8',
    timeout: 15000
  });

  try { fs.unlinkSync(tempPy); } catch (_) {}

  if (result.error) {
    throw new Error(`Tokenization Python failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Tokenization Python exited with code ${result.status}\n${result.stderr?.slice(0, 300)}`);
  }

  // Parse JSON from stdout
  for (const line of result.stdout.trim().split('\n').reverse()) {
    try {
      return JSON.parse(line);
    } catch (_) {}
  }

  throw new Error(`Failed to parse tokenization output: ${result.stdout?.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// Step 3: Send via Fleet Bridge I2I Bottle Protocol
// ---------------------------------------------------------------------------

/**
 * Drop a fleet bottle as an I2I message.
 *
 * Writes a JSON file to the I2I harbor directory so fleet-bridge picks it up
 * and delivers it to registered agents.
 *
 * @param {object} payload - The message payload
 * @param {string} to - Target agent ID
 * @param {string} type - Bottle type (must be in BOTTLE_TYPES)
 * @returns {object} The written bottle
 */
function sendFleetBottle(payload, to = 'fleet', type = 'DELIVERABLE') {
  if (!BOTTLE_TYPES.includes(type)) {
    throw new Error(`Invalid bottle type "${type}". Valid: ${BOTTLE_TYPES.join(', ')}`);
  }

  ensureDir(FLEET_VESSEL_DIR);
  const harborDir = path.join(FLEET_VESSEL_DIR, 'harbor');
  ensureDir(harborDir);

  const bottleId = `midi-bridge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const bottle = {
    id: bottleId,
    type,
    from: 'midi-text-to-sequence',
    to,
    timestamp: now,
    shard: {
      artifacts: {
        type: 'midi-tokenized-sequence',
        version: '1.0.0',
        payload
      },
      reasoning: [
        `Generated from natural language prompt`,
        `Tokenized into ${payload.tokens?.length || 0} MIDI tokens`,
        `Compressed sequence: ${payload.compressed || 0} bytes`
      ],
      blockers: []
    },
    _meta: {
      generated: now,
      protocol: 'I2I-v2',
      tool: 'midi-text-to-sequence.js'
    }
  };

  // Compute integrity hash
  const { integrity: _skip, ...bodyForHash } = bottle;
  bottle.integrity = hashBottle(bodyForHash);

  const filename = `${Date.now()}-midi-tokenized-${to}-${Math.random().toString(36).slice(2, 5)}.json`;
  const outPath = path.join(harborDir, filename);

  fs.writeFileSync(outPath, JSON.stringify(bottle, null, 2), 'utf8');
  console.log(`\n📮 Fleet bottle dropped: ${outPath}`);
  console.log(`   → To: ${to} (type: ${type})`);
  console.log(`   → ID: ${bottleId}`);

  return bottle;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

async function main() {
  // Get prompt from command line
  const args = process.argv.slice(2);
  const promptIndex = args.findIndex(a => !a.startsWith('--'));
  const outputFlag = args.indexOf('--output');
  let outputPath = null;

  if (outputFlag >= 0 && outputFlag + 1 < args.length) {
    outputPath = args[outputFlag + 1];
  }

  // Filter prompt arguments
  const promptArgs = promptIndex >= 0 ? args.slice(promptIndex).filter(a => !a.startsWith('--output')) : [];

  let prompt = promptArgs.join(' ');

  if (!prompt) {
    // Default test prompt
    prompt = "Create a 4/4 jazz piano progression in the key of C major with a walking bassline";
    console.log(`🎵 No prompt provided. Using default:\n   "${prompt}"\n`);
  }

  const separator = '='.repeat(60);

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Text → MIDI
    // -----------------------------------------------------------------------
    console.log(`\n${separator}`);
    console.log(`🔮 STEP 1: Text → MIDI Generation`);
    console.log(`${separator}`);
    console.log(`   Prompt: "${prompt}"`);
    console.log(`   Generating with music21 ...`);

    const midiResult = textToMidi(prompt);
    const midiPath = outputPath || midiResult.midiPath;

    // If output was specified, copy there
    if (outputPath && outputPath !== midiResult.midiPath) {
      fs.copyFileSync(midiResult.midiPath, outputPath);
    }

    console.log(`   ✅ MIDI generated:`);
    console.log(`      📄 File: ${midiPath}`);
    console.log(`      🎯 Size: ${(fs.statSync(midiPath).size / 1024).toFixed(1)} KB`);
    if (midiResult.metadata.key) {
      console.log(`      🎼 Key: ${midiResult.metadata.key}`);
      console.log(`      ⏱️  Tempo: ${midiResult.metadata.tempo} BPM`);
      console.log(`      🥁 Time sig: ${midiResult.metadata.time_sig}`);
      console.log(`      🎹 Style: ${midiResult.metadata.style}`);
      console.log(`      📏 Measures: ${midiResult.metadata.measures}`);
    }

    // -----------------------------------------------------------------------
    // STEP 2: MIDI → Tokenized Sequence
    // -----------------------------------------------------------------------
    console.log(`\n${separator}`);
    console.log(`⚙️  STEP 2: MIDI → Tokenized Sequence`);
    console.log(`${separator}`);

    const tokenResult = midiToTokenSequence(midiPath);

    const tokenPath = path.join(OUTPUT_DIR, `tokenized-${timestamp()}.json`);
    const tokenOutput = {
      prompt,
      generated_at: new Date().toISOString(),
      midi_file: midiPath,
      stats: tokenResult.stats,
      tokens: tokenResult.tokens,
      sequence: tokenResult.sequence,
      compressed_bytes: tokenResult.compressed
    };
    fs.writeFileSync(tokenPath, JSON.stringify(tokenOutput, null, 2), 'utf8');

    console.log(`   ✅ Tokenization complete:`);
    console.log(`      📄 File: ${tokenPath}`);
    console.log(`      📊 Stats: ${JSON.stringify(tokenResult.stats)}`);
    console.log(`      🏷️  Tokens: ${tokenResult.tokens.length}`);
    console.log(`      📦 Sequence: ${(tokenResult.compressed / 1024).toFixed(2)} KB`);

    // Show first few tokens as preview
    const previewCount = Math.min(10, tokenResult.tokens.length);
    console.log(`\n   📝 Token Preview (${previewCount}/${tokenResult.tokens.length}):`);
    for (let i = 0; i < previewCount; i++) {
      console.log(`      [${i}] ${tokenResult.tokens[i]}`);
    }

    // -----------------------------------------------------------------------
    // STEP 3: Fleet Bridge I2I Bottle
    // -----------------------------------------------------------------------
    console.log(`\n${separator}`);
    console.log(`🌉 STEP 3: Fleet Bridge I2I Bottle Delivery`);
    console.log(`${separator}`);

    const fleetPayload = {
      prompt,
      midi_file: midiPath,
      midi_size_bytes: fs.statSync(midiPath).size,
      tokens: tokenResult.tokens,
      sequence: tokenResult.sequence,
      stats: tokenResult.stats,
      compressed: tokenResult.compressed
    };

    // Drop bottle to 'fleet' — bridge will route to registered agents
    const bottle = sendFleetBottle(fleetPayload, 'fleet', 'DELIVERABLE');

    // Also drop a dedicated bottle to 'oracle2' (the ARM64 coordinator)
    sendFleetBottle(fleetPayload, 'oracle2', 'CHECKPOINT');

    // -----------------------------------------------------------------------
    // Complete
    // -----------------------------------------------------------------------
    console.log(`\n${separator}`);
    console.log(`✅ PIPEINE COMPLETE`);
    console.log(`${separator}`);
    console.log(`   📄 MIDI: ${midiPath}`);
    console.log(`   🔤 Token Sequence: ${tokenPath}`);
    console.log(`   🛰️  I2I Vessel: ${FLEET_VESSEL_DIR}/harbor/`);
    console.log(`   📊 Stats: ${tokenResult.stats.note_count} notes, ${tokenResult.tokens.length} tokens`);

    // Return results
    return {
      success: true,
      midiPath,
      tokenPath,
      prompt,
      bottleId: bottle.id,
      stats: tokenResult.stats,
      tokenCount: tokenResult.tokens.length,
      sequenceLength: tokenResult.compressed
    };

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    if (err.stderr) console.error(`   Stderr: ${err.stderr.slice(0, 500)}`);
    console.error(err.stack);
    return { success: false, error: err.message };
  }
}

// Run
main().then(result => {
  if (!result.success) process.exit(1);
}).catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
