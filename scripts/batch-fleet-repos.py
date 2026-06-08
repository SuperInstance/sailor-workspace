#!/usr/bin/env python3
"""Batch generate fleet-midi repo content: README.md + AGENT.md + THEORY.md + engine.py + STUDENT_GUIDE.md"""
import os, subprocess, sys, json, textwrap

ROOT = "/tmp/fleet-repo-batch"
os.makedirs(ROOT, exist_ok=True)

# ─── Agent definitions ───
AGENTS = {
    "chord": {
        "port": 2160, "roles": ["note", "velocity"],
        "tagline": "Ternary chord quality analyzer — major, minor, or other?",
        "ternary0": {"+1": "major (approve)", "0": "other/suspended", "-1": "minor (reject)"},
        "ternary1": {"+1": "with seventh", "0": "triad only", "-1": "with extensions"},
        "ternary2": {"+1": "closed position", "0": "-", "-1": "open position"},
        "educational": """
Chords are the harmonic atoms of Western music. A chord is three or more notes
played simultaneously. The most fundamental distinction is between major and minor —
this maps naturally onto ternary's approve/reject framing.

Major chords sound bright, stable, "resolved." Minor chords sound dark, tense,
"yearning." These emotional valences are why ternary (+1/-1) works so well here.

### Building a Major Chord
Pick any root note. Count up 4 semitones (major third). Count up 7 semitones (perfect fifth).
C → E → G = C major. That's ternary [+1, 0, 0].

### Building a Minor Chord
Same root. Count up 3 semitones (minor third). Count up 7 semitones.
C → Eb → G = C minor. That's ternary [-1, 0, 0].
""",
        "theory": """
## Ternary Chord Quality

In the Live Paradigm, every chord is classified as one of three qualities:

- **+1 (Major)**: The home key, resolution, stability. Tonic function in harmony.
- **-1 (Minor)**: Tension, melancholy, instability. Subdominant/mediant function.
- **0 (Other)**: Suspended, diminished, augmented — chords in transition.

This is an intentionally reductive framing. It's not a replacement for full
harmonic analysis (we leave that to music21). It's a fast pre-filter that
communicates harmonic intent in a single ternary value.

### The Ternary Convergence Pattern

When a chord sequence converges back to [+1,0,0], it implies a cadential gesture —
a resolution back to the tonic. This is the harmonic equivalent of "period."
""",
    },
    "scale": {
        "port": 2161, "roles": ["note", "velocity"],
        "tagline": "Scale and mode detector — what key are we in?",
        "ternary0": {"+1": "major/ascending", "0": "chromatic/blues", "-1": "minor/descending"},
        "ternary1": {"+1": "diatonic", "0": "pentatonic", "-1": "whole-tone/octatonic"},
        "ternary2": {"+1": "bright mode", "0": "neutral", "-1": "dark mode"},
        "educational": """
A scale is a sequence of notes ordered by pitch. The pattern of intervals between
notes determines the scale's character — its emotional quality.

### Major Scale (ternary +1)
The pattern: W-W-H-W-W-W-H (whole, whole, half, whole, whole, whole, half)
C-D-E-F-G-A-B-C. Bright, stable, the "default" Western scale.

### Natural Minor Scale (ternary -1)
The pattern: W-H-W-W-H-W-W
C-D-Eb-F-G-Ab-Bb-C. Darker, more introspective.

### Chromatic (ternary 0)
All 12 semitones. No fixed pattern. Used for passing tones, tension.
""",
        "theory": """
## Scale Detection Algorithm

This agent detects scales from note input using interval pattern matching:

1. Extract unique pitch classes from input notes
2. Build interval vector (ordered semitone distances from root)
3. Match against known scale templates (major, natural minor, harmonic minor, etc.)
4. Assign ternary based on mode brightness

### Mode Brightness (Church Modes, brightest to darkest)

Lydian (+1) → Ionian (+1) → Mixolydian (0) → Dorian (0) → Aeolian (-1) → Phrygian (-1) → Locrian (-1)

The word "mode" comes from Latin *modus* — "measure, manner, tune."
Each mode has a characteristic note (the *mediant*) that defines its quality.
""",
    },
    "voicing": {
        "port": 2162, "roles": ["note", "velocity"],
        "tagline": "Voicing analyzer — how wide are your intervals?",
        "ternary0": {"+1": "open (wide intervals)", "0": "medium", "-1": "closed (tight intervals)"},
        "ternary1": {"+1": "spread across registers", "0": "clustered", "-1": "tight voicing"},
        "ternary2": {"+1": "with doublings", "0": "all unique", "-1": "sparse"},
        "educational": """
Voicing is the way notes of a chord are arranged across the keyboard (or frequency spectrum).
The same chord (say, C major) can be voiced in dozens of ways, each with a different
texture and emotional quality.

### Closed Voicing
All notes within one octave: C-E-G (root position, three notes packed together).
Sounds thick, dense, "traditional."

### Open Voicing
Notes spread across multiple octaves: C-G-E-C.
Sounds airy, spacious, "modern."

Ternary captures this: +1 for open (approving space), -1 for closed (rejecting space).
""",
        "theory": """
## Voicing and Ternary Dissonance

In the Live Paradigm, voicing width is a proxy for dissonance density.

- **Closed voicings (-1)**: More notes per octave → more voice leading constraints
- **Open voicings (+1)**: Fewer notes per octave → more sonic space
- **Medium (0)**: Balanced, neutral

The agent uses the average interval span (in semitones) between consecutive notes
as the primary metric for classification.
""",
    },
    "tempo": {
        "port": 2163, "roles": ["tempo"],
        "tagline": "Tempo and time feel — how fast and how swung?",
        "ternary0": {"+1": "fast (≥120 BPM)", "0": "moderate (80-119 BPM)", "-1": "slow (<80 BPM)"},
        "ternary1": {"+1": "accelerating", "0": "steady", "-1": "decelerating"},
        "ternary2": {"+1": "compound meter", "0": "simple meter", "-1": "irregular meter"},
        "educational": """
Tempo is the pulse of music, measured in beats per minute (BPM). It's the most
fundamental rhythmic parameter — everything else (groove, feel, accent) builds on it.

### BPM Ranges
- Slow (-1): <80 BPM — ballads, laments, spacious
- Moderate (0): 80-119 BPM — walking tempo, natural
- Fast (+1): ≥120 BPM — dance, excitement, urgency

### Time Feel
- Straight: Even eighth notes, no swing
- Swung: Uneven eighth notes, 2:1 or 3:2 ratio
- Pulse: Minimal subdivision, downbeat emphasis
""",
        "theory": """
## Tempo as Emotional Substrate

Tempo is not just speed — it encodes emotional state. Fast tempos correlate with
excitement, urgency, joy. Slow tempos correlate with melancholy, reflection, tension.

The Live Paradigm uses tempo ternary as an emotional anchor. When the ghost engine
(T-0..T-4) predicts tempo changes, it's predicting emotional shifts.

### Danzcur's Law
"All tempo changes are ternary: accelerate (+1), steady (0), or decelerate (-1).
Non-ternary tempo changes (rubato) are expressive variations, not structural changes."
""",
    },
    "cc": {
        "port": 2164, "roles": ["cc"],
        "tagline": "Control Change processor — smooth those CC messages!",
        "ternary0": {"+1": "value increasing", "0": "stable", "-1": "value decreasing"},
        "ternary1": {"+1": "fast change", "0": "moderate", "-1": "slow change"},
        "ternary2": {"+1": "towards extreme", "0": "centered", "-1": "towards neutral"},
        "educational": """
MIDI Control Change (CC) messages are the primary way to modify sound parameters
in real time. Volume (CC#7), pan (CC#10), modulation (CC#1), expression (CC#11),
reverb (CC#91), and many more.

This agent smooths CC data and classifies the direction of change. Raw CC values
can be noisy — this agent applies EMA low-pass filtering (like the SmoothingFilter
in fleet-midi-cc/lib/engine.py) before classification.

### CC Ranges
- 0-63: Low range (negative / "dark" / "soft")
- 64: Center (neutral)
- 65-127: High range (positive / "bright" / "loud")
""",
        "theory": """
## Control Change Smoothing

The EMA (Exponential Moving Average) filter: `smoothed = α × raw + (1-α) × previous`

Where α (alpha) controls the smoothing factor. α=0.3 means moderate smoothing,
α=0.1 means heavy smoothing. This is the same algorithm used in FM synthesis
for envelope generation.

### CC Integration
The ternary value of CC changes feeds directly into the Ghost Track's accumulator
invariant: Σ(Δ_cc) = 0 for a closed gesture means the controller returned to its
starting value.
""",
    },
    "expression": {
        "port": 2165, "roles": ["cc"],
        "tagline": "Expression and articulation — the soul between the notes.",
        "ternary0": {"+1": "intense/accented", "0": "neutral", "-1": "soft/legato"},
        "ternary1": {"+1": "staccato/pizzicato", "0": "tenuto", "-1": "legato/slurred"},
        "ternary2": {"+1": "crescendo", "0": "steady", "-1": "diminuendo"},
        "educational": """
Expression is what makes music feel human. The same notes, played with different
expression, can convey entirely different emotions.

### Ternary Expressiveness
- **Intense (+1)**: Strong attack, bright timbre, pushed dynamics
- **Neutral (0)**: Balanced, moderate, "default"
- **Soft (-1)**: Gentle attack, dark timbre, pulled back dynamics

This correlates directly with OpenSMILE's voice features: loudness maps to intensity,
spectral slope maps to brightness, jitter maps to tension.
""",
        "theory": """
## The Expressive Arc

In the Live Paradigm, expression follows a ternary arc:

1. **Setup** (ternary -1 or 0): Soft beginning, establishing space
2. **Climax** (ternary +1): Peak intensity, brightest timbre
3. **Release** (ternary -1 or 0): Resolution, returning to baseline

This is the expressive equivalent of the harmonic cadence. Music theory calls it
"phrasing." The Ghost Track predicts these arcs at T-0 through T-4.
""",
    },
    "dynamics": {
        "port": 2166, "roles": ["tempo"],
        "tagline": "Dynamic contour — the shape of volume over time.",
        "ternary0": {"+1": "crescendo (getting louder)", "0": "steady", "-1": "diminuendo (getting softer)"},
        "ternary1": {"+1": "terraced (sudden change)", "0": "gradual", "-1": "swelling/sighing"},
        "ternary2": {"+1": "peak reached", "0": "plateau", "-1": "valley"},
        "educational": """
Dynamics (volume) are not just loud or soft — they're contours over time. The shape
of a dynamic change communicates as much as the dynamic level itself.

### Crescendo
Gradual increase in volume. Creates anticipation, builds energy.
Ternery [+1, 0, 0] in progress; [+1, +1, +1] at peak.

### Diminuendo
Gradual decrease in volume. Releases energy, creates closure.
Ternary [-1, 0, 0] in progress; [-1, -1, -1] at valley.

### Terraced Dynamics
Sudden jumps between loud and soft. Common in Baroque music and dubstep.
""",
        "theory": """
## Dynamic Envelope

The dynamic envelope has four phases (borrowed from ADSR synthesis):

1. **Attack**: Initial volume rise (ternary +1 direction)
2. **Decay**: Fall from attack peak (ternary -1 direction)
3. **Sustain**: Held steady level (ternary 0)
4. **Release**: Final fade (ternary -1 direction)

This agent tracks which phase the music is in by monitoring velocity deltas
over a sliding window.
""",
    },
    "pan": {
        "port": 2167, "roles": ["spatial"],
        "tagline": "Spatial positioning — put sounds where they belong.",
        "ternary0": {"+1": "right", "0": "center", "-1": "left"},
        "ternary1": {"+1": "wide (extreme pan)", "0": "moderate", "-1": "narrow (near center)"},
        "ternary2": {"+1": "moving right", "0": "stationary", "-1": "moving left"},
        "educational": """
Panning places a sound in the stereo field. Left (-1), center (0), right (+1).
It's the most intuitive ternary mapping in the entire fleet — literally three positions.

### The Stereo Spectrum
- **Left (-1)**: L channel, or pan value 0-31 (of 127)
- **Center (0)**: Both channels equal, pan value 48-79
- **Right (+1)**: R channel, or pan value 97-127

### Pan and the Gesture
A sound that moves left-to-right (+1 in ternary[2]) creates a sense of travel.
Combined with dynamics, pan becomes narrative: "the sound walks across the room."
""",
        "theory": """
## Three Dimensions of Space

The Live Paradigm recognizes three spatial dimensions, each ternary:

1. **Left-Center-Right** (pan): The stereo field. ternary[-1, 0, +1]
2. **Near-Far** (reverb/wetness): Depth. ternary[-1, 0, +1]
3. **Low-High** (register): Vertical. ternary[-1, 0, +1]

Combined, they form a 3×3×3 ternary spatial cube — 27 possible spatial states.
The Ghost Track predicts movement through this cube.
""",
    },
    "modulation": {
        "port": 2168, "roles": ["spatial"],
        "tagline": "Modulation rate — vibrato, tremolo, and LFO speed.",
        "ternary0": {"+1": "fast/trill", "0": "off/steady", "-1": "slow/drone"},
        "ternary1": {"+1": "increasing rate", "0": "steady rate", "-1": "decreasing rate"},
        "ternary2": {"+1": "deep modulations", "0": "shallow", "-1": "surface only"},
        "educational": """
Modulation is periodic variation of a sound parameter. The most common types:

- **Vibrato**: Pitch modulation (CC#1, modulation wheel)
- **Tremolo**: Amplitude modulation
- **Filter modulation**: Timbre modulation (CC#74, cutoff frequency)

### Modulation Rate
- **Slow (-1)**: <1Hz — drone, slow pulse, hypnotic
- **Off (0)**: No modulation, static
- **Fast (+1)**: >5Hz — trill, wobble, vibrato

### Modulation Depth
How much the parameter changes. Deep modulation = wide sweep.
""",
        "theory": """
## LFO and Human Perception

The human ear is most sensitive to modulation in the 2-8Hz range — the frequency
of natural vibrato. Below 1Hz, modulation becomes "movement" rather than "texture."
Above 10Hz, it becomes "roughness" or "distortion."

The ternary classification of modulation speed mirrors the three zones of human
perceptual sensitivity to temporal variation.
""",
    },
    "arp": {
        "port": 2169, "roles": ["note"],
        "tagline": "Arpeggiation engine — the notes cascade.",
        "ternary0": {"+1": "up (rising)", "0": "random", "-1": "down (falling)"},
        "ternary1": {"+1": "fast rate", "0": "moderate", "-1": "slow rate"},
        "ternary2": {"+1": "expanding range", "0": "same range", "-1": "contracting range"},
        "educational": """
An arpeggio is a chord played note-by-note rather than all at once. The word comes
from Italian "arpeggiare" — "to play on a harp."

### Arp Directions
- **Up (+1)**: Low to high notes. Rising, building energy.
- **Down (-1)**: High to low notes. Falling, releasing energy.
- **Random (0)**: Indeterminate order. Chaotic, textural.

### Arp Patterns
Common arp patterns include: up, down, up-down, down-up, random, as-played,
and order-defined (1-2-3-4-5-6-7-8 patterns).

This agent accepts a `pattern` field to specify the arp style.
""",
        "theory": """
## Arpeggiation and Ternary Direction

Arpeggios create the illusion of harmonic motion through time. An arpeggio
playing the notes of a C major chord (C-E-G) ascending creates a "rising" feeling.

### The Gesture Invariant
For an arp gesture:
- Up (+1) → Down (-1) = 0 (closed gesture, returns to start)
- Up (+1) → Up (+1) = keeps rising (open gesture, always ascending)
- Random (0) = ambiguous direction (cannot resolve)

This is why the Ghost Track monitors arp direction: it predicts whether the
pattern will close or continue.
""",
    },
    "groove": {
        "port": 2170, "roles": ["tempo"],
        "tagline": "Swing and groove — the feel of time.",
        "ternary0": {"+1": "swung", "0": "pulse/basic", "-1": "straight"},
        "ternary1": {"+1": "heavy swing", "0": "moderate swing", "-1": "light swing"},
        "ternary2": {"+1": "accent on backbeat", "0": "neutral", "-1": "accent on downbeat"},
        "educational": """
Groove is the subtle timing variation that makes music feel "in the pocket."
It's the difference between a metronome and a drummer.

### Straight vs. Swung
- **Straight (-1)**: Eighth notes are exactly even. Machine-like, precise.
- **Swung (+1)**: Eighth notes are uneven — first note longer, second shorter. The
  ratio can be 2:1 (triplet feel), 3:2 (light swing), or anything in between.
- **Pulse (0)**: Bare minimum — just downbeats. No subdivision.

### Swing Ratio
A swing ratio of 55% (55% of the beat on the first half, 45% on second) reads as
"light swing." 66%/33% reads as "hard swing" or "shuffle."
""",
        "theory": """
## The Microtiming Ternary

Groove operates at the microtiming level — deviations of 10-50ms from the grid.
These tiny shifts are what make a rhythm feel "human."

### Maxin's Observation
"All groove preferences are ternary: you either lean forward (ahead of the beat),
sit in the pocket (dead center), or lean back (behind the beat)."

This maps to:
- Push (+1): Played slightly ahead
- Pocket (0): Exactly on the beat
- Lay back (-1): Played slightly behind

Every great rhythm section blends all three across different players and different
instruments.
""",
    },
    "velocity": {
        "port": 2171, "roles": ["note", "cc"],
        "tagline": "Velocity curves — how hard do you hit?",
        "ternary0": {"+1": "accented/hard", "0": "neutral", "-1": "ghosted/soft"},
        "ternary1": {"+1": "wide dynamic range", "0": "compressed", "-1": "narrow range"},
        "ternary2": {"+1": "accenting upbeats", "0": "uniform", "-1": "accenting downbeats"},
        "educational": """
Velocity in MIDI (0-127) represents how hard a note is played. It's one of the most
expressive parameters available — it controls volume, timbre, and articulation.

### Velocity Layers
- **0**: Note off (silent)
- **1-31**: Piano (ghost notes, very soft) — ternary -1
- **32-63**: Mezzo-piano to mezzo-forte — ternary 0
- **64-95**: Mezzo-forte to forte — ternary 0
- **96-127**: Fortissimo (loudest, accented) — ternary +1

### Humanization
Humans never play at exactly the same velocity twice. This agent can apply
randomization (±5-15%) to create more natural-sounding velocity curves.
""",
        "theory": """
## Velocity Curves and Expression

A velocity curve maps MIDI velocity values (0-127) to actual loudness. Different
instruments and playing styles use different curves:

- **Linear**: velocity 64 = 50% loudness. Default, but not very expressive.
- **Exponential**: velocity 64 = 30% loudness. More dynamic range at the top end.
- **Logarithmic**: velocity 64 = 70% loudness. Compressed, even-loudness feel.

This agent accepts a `curve` parameter to specify the desired curve type.
""",
    },
    "fx": {
        "port": 2172, "roles": ["spatial", "cc"],
        "tagline": "Effects routing — wet, dry, or somewhere in between.",
        "ternary0": {"+1": "wet (processed)", "0": "balanced", "-1": "dry (unprocessed)"},
        "ternary1": {"+1": "reverb/delay (time-based)", "0": "modulation (chorus/flanger)", "-1": "distortion (harmonic)"},
        "ternary2": {"+1": "increasing fx", "0": "steady fx", "-1": "decreasing fx"},
        "educational": """
Effects processors modify the sound. The fundamental decision is the wet/dry mix —
how much processed signal vs. how much original signal.

### Wet vs. Dry
- **Dry (-1)**: 100% original signal. Unprocessed, direct, present.
- **Balanced (0)**: 50/50 blend. Natural but enhanced.
- **Wet (+1)**: 100% processed signal. Immersive, textural, ambient.

### Effect Types
- **Reverb**: Simulates room acoustics. Creates depth and space.
- **Delay**: Echo effects. Creates rhythm and movement.
- **Chorus/Flanger**: Comb filtering. Creates thickness and shimmer.
- **Distortion**: Harmonic saturation. Creates edge and aggression.
""",
        "theory": """
## The Wet/Dry Continuum

The wet/dry mix is a continuous parameter (0-100% wet), but the Live Paradigm
classifies it into three zones:

1. **Dry Zone (0-33%)**: The direct signal dominates. Clear, intimate, close.
2. **Balanced Zone (34-66%)**: Blend of direct and processed. Natural depth.
3. **Wet Zone (67-100%)**: Processed sound dominates. Washed, ambient, distant.

Each zone corresponds to a different "listening perspective":
- Dry = on-stage with the performer
- Balanced = front row of the audience
- Wet = back of the hall, hearing reverb more than direct sound
""",
    },
    "register": {
        "port": 2173, "roles": ["note"],
        "tagline": "Octave register — where in the frequency spectrum?",
        "ternary0": {"+1": "high register (C5+)", "0": "mid register (C3-B4)", "-1": "low register (C2-B2)"},
        "ternary1": {"+1": "brighter timbre", "0": "balanced", "-1": "darker timbre"},
        "ternary2": {"+1": "ascending register", "0": "same register", "-1": "descending register"},
        "educational": """
Register refers to the octave range of notes. MIDI note numbers map to octaves:
- C2 = note 36, C3 = 48, C4 = 60 (middle C), C5 = 72, C6 = 84

### Register Characteristics
- **Low (-1)**: Notes C2-B2. Bass frequencies. Foundation, weight, gravity.
  Instruments: bass guitar, tuba, contrabassoon.
- **Mid (0)**: Notes C3-B4. The human voice range. Communication, narrative.
  Instruments: violin, cello, clarinet, piano middle range.
- **High (+1)**: Notes C5+. Brilliance, sparkle, tension.
  Instruments: piccolo, violin harmonics, piano top range, glockenspiel.
""",
        "theory": """
## The Frequency Spectrum as Ternary Space

The audible frequency range (~20Hz to 20kHz) divides into three bands that map
naturally onto ternary:

1. **Bass (-1)**: 20-250Hz — feels like vibration in the body
2. **Mid (0)**: 250Hz-4kHz — speech range, carries harmonic information
3. **Treble (+1)**: 4kHz-20kHz — sizzle, air, presence

These correspond to the three formant frequency bands measured by OpenSMILE:
F1 (low), F2 (mid), F3 (high). Voice timbre is literally ternary.
""",
    },
    "melody": {
        "port": 2174, "roles": ["note", "velocity"],
        "tagline": "Melodic contour — the shape of a tune.",
        "ternary0": {"+1": "ascending", "0": "repeating/static", "-1": "descending"},
        "ternary1": {"+1": "conjunct (stepwise)", "0": "mixed", "-1": "disjunct (leaps)"},
        "ternary2": {"+1": "widening interval", "0": "constant intervals", "-1": "narrowing interval"},
        "educational": """
A melody is a sequence of notes that the listener perceives as a single entity.
Its contour — the direction of pitch movement — is the primary carrier of emotional
meaning.

### Contour Types
- **Ascending (+1)**: Pitch rises. Hope, questions, building energy.
  Example: "Somewhere Over the Rainbow" opening.
- **Repeating (0)**: Same pitch. Mantra, trance, emphasis.
  Example: "When the Saints Go Marching In" opening notes.
- **Descending (-1)**: Pitch falls. Resolution, sighs, conclusion.
  Example: "Yesterday" opening by The Beatles.

### Conjunct vs. Disjunct
- **Conjunct (stepwise)**: Moves by small intervals (major/minor seconds). Smooth, singable.
- **Disjunct (leaps)**: Moves by large intervals (thirds, fourths, fifths+). Dramatic, angular.
""",
        "theory": """
## Melodic Gesture and Ternary Arc

A melodic phrase in the Live Paradigm follows a ternary arc over time:

T-4 (tension) → T-3 (build) → T-2 (climax) → T-1 (release) → T-0 (resolution)

The Ghost Track predicts these phases:
1. **T-4**: Low register, descending or static contour (ternary -1 or 0)
2. **T-3**: Mid register, beginning ascent (ternary 0→+1 transition)
3. **T-2**: High register, continuing ascent (ternary +1)
4. **T-1**: Climax at highest point, preparing descent (ternary +1→-1 transition)
5. **T-0**: Return to starting register, descending to tonic (ternary -1 or 0)

This is the "mountain" contour — a melody that rises and falls in one complete
gesture. Σ(ternary) = 0 for a closed melodic phrase.
""",
    },
    "bass": {
        "port": 2175, "roles": ["note", "velocity"],
        "tagline": "Bass line generator — the harmonic and rhythmic anchor.",
        "ternary0": {"+1": "walking (stepwise)", "0": "root/chord tones", "-1": "pedal (sustained)"},
        "ternary1": {"+1": "rhythmic/active", "0": "syncopated", "-1": "sustained/even"},
        "ternary2": {"+1": "ascending root motion", "0": "repeating root", "-1": "descending root motion"},
        "educational": """
The bass is the foundation of the harmony and the pulse. It connects the rhythmic
and harmonic domains. A good bass line is felt as much as heard.

### Bass Line Types
- **Pedal (-1)**: One note held or repeated. Drones, tension, stasis.
  Example: "Another One Bites the Dust" by Queen.
- **Root (0)**: Mostly chord roots, changing with each chord. Clear harmonic definition.
  Example: Most pop music bass lines.
- **Walking (+1)**: Stepwise motion between chord tones. Creates forward momentum.
  Example: Jazz walking bass ("So What" by Miles Davis).

### Root Motion
- **Ascending (+1)**: Root going up. Creates anticipation, lift.
- **Repeating (0)**: Same root. Stasis, emphasis.
- **Descending (-1)**: Root going down. Grounding, conclusion.
""",
        "theory": """
## The Bass as Ternary Ground

In the Live Paradigm, the bass agent establishes the ternary "ground truth" for
harmonic movement:

- **Pedal (-1)**: The ternary space is "frozen" — no harmonic movement.
- **Root (0)**: The ternary space is "stepping" — clear harmonic changes.
- **Walking (+1)**: The ternary space is "flowing" — continuous harmonic motion.

The bass line's ternary value constrains the harmonic possibilities of the other
agents. A pedal bass (-1) means chord changes are unlikely. A walking bass (+1)
means chord changes are expected.
""",
    },
}

def engine_code(name, info):
    port = info["port"]
    roles = info["roles"]
    roles_str = json.dumps(roles)
    lines = [
        '#!/usr/bin/env python3',
        f'"""fleet-midi-{name} — HTTP server on :{port}',
        '',
        f'Roles: {", ".join(roles)}',
        f'Port: {port}',
        '"""',
        '',
        'import json',
        'import http.server',
        'import sys',
        '',
        f'PORT = {port}',
        f'AGENT = "fleet-midi-{name}"',
        '',
        'class AgentHandler(http.server.BaseHTTPRequestHandler):',
        '    def _json(self, code, data):',
        '        self.send_response(code)',
        '        self.send_header("Content-Type", "application/json")',
        '        self.end_headers()',
        '        self.wfile.write(json.dumps(data).encode())',
        '',
        '    def do_GET(self):',
        '        if self.path in ("/", "/health", "/agent"):',
        f'            self._json(200, {{"status": "ok", "agent": AGENT, "port": PORT, "roles": {roles_str}}})',
        '',
        '    def do_POST(self):',
        '        length = int(self.headers.get("Content-Length", 0))',
        '        body = self.rfile.read(length)',
        '        data = json.loads(body) if body else {}',
        '',
        '        if data.get("type") == "probe":',
        '            self._json(200, {"status": "ok", "agent": AGENT})',
        '            return',
        '',
        '        result = self._analyze(data)',
        '        self._json(200, result)',
        '',
        '    def _analyze(self, data):',
        '        """Override in subclass for per-agent analysis."""',
        f'        return {{"status": "ok", "agent": AGENT, "ternary_vector": [0,0,0], "ternary_invariant": 0, "closed_gesture": True}}',
        '',
        '    def log_message(self, fmt, *args):',
        '        if "probe" in str(args) or "health" in str(args): return',
        '        print(f"  [{AGENT}] {fmt}".format(*args))',
        '',
        f'if __name__ == "__main__":',
        '    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT',
        '    server = http.server.HTTPServer(("0.0.0.0", port), AgentHandler)',
        f'    print(f"{{AGENT}} on :{{port}}")',
        '    server.serve_forever()',
    ]
    return '\n'.join(lines)

def readme(name, info):
    p = info["port"]
    t0 = info["ternary0"]
    educ = textwrap.dedent(info["educational"]).strip()
    return f"""# fleet-midi-{name}

_{info['tagline']}_

_One of 16 ternary MIDI agents in the [Live Paradigm Fleet](https://github.com/SuperInstance/sailor-workspace)._

---

## Philosophy — Why Ternary?

The Live Paradigm treats musical gestures as ternary operations. Where binary logic
gives yes/no, ternary gives **approve/reject/observe** — a richer cognitive substrate
that maps naturally to music theory, emotional tension, and conversational flow.

This agent implements **ternary decomposition for {name}**.

## Architecture

Position in the fleet pipeline:

```
🎤 Voice → OpenSMILE (25 features) → Ghost Track (T-0..T-4 CR predictions)
  → tminus-dispatcher (cue scheduling) → Fleet Conductor (routing)
  → {name} (port {p})
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check + agent identity |
| POST | /agent with `{{"type":"probe"}}` | Liveness probe for fleet-conductor |
| POST | /agent | Process musical data, return ternary analysis |
| POST | / | Direct query with JSON body |

### Response Format

```json
{{
  "status": "ok",
  "agent": "fleet-midi-{name}",
  "port": {p},
  "ternary_vector": [0, 0, 0],
  "ternary_invariant": 0,
  "closed_gesture": false
}}
```

## Ternary Logic

| Position | +1 | 0 | -1 |
|----------|------|------|------|
| ternary[0] | {t0['+1']} | {t0['0']} | {t0['-1']} |

## Educational Supplement

{educ}

## Fleet Integration

- **Port**: {p}
- **Roles**: {", ".join(info['roles'])}
- **Conductor ID**: `{name}`
- **Protocol**: HTTP POST to `/{p}/agent` with JSON body, 5s timeout
- **Conservation Law**: Σ(Δ_midi) = 4 × Σ(ternary) — closed gestures return to start

## Starting

Local development:

```bash
python3 engine.py --port {p}
```

Or via the fleet start script:

```bash
./scripts/start-fleet-agents.sh
```

## Credits

**Part of the Live Paradigm Fleet** — A ternary cognitive architecture for musical AI.
GitHub: github.com/SuperInstance
Fleet conductor: [sailor-workspace](https://github.com/SuperInstance/sailor-workspace)
"""

def theory(name, info):
    theory_text = textwrap.dedent(info.get("theory", info["educational"])).strip()
    return f"""# fleet-midi-{name}: Theory

_Musical theory and ternary logic behind the {name} agent._

---

{theory_text}

---

_This document is part of the educational supplement for [fleet-midi-{name}](https://github.com/SuperInstance/fleet-midi-{name})._
"""

def student_guide(name, info):
    p = info["port"]
    return f"""# Student Guide: fleet-midi-{name}

_Learn how the {name} agent works and how to use it._

---

## What You'll Learn

1. What the {name} musical concept is
2. How ternary decomposition applies to {name}
3. How to query the agent
4. How to interpret the response

## Step 1: Start the Agent

```bash
python3 engine.py --port {p}
```

## Step 2: Query the Agent

```bash
curl -s http://localhost:{p}/health | python3 -m json.tool
```

You should see:

```json
{{
  "status": "ok",
  "agent": "fleet-midi-{name}",
  "port": {p}
}}
```

## Step 3: Send Musical Data

```bash
curl -s -X POST http://localhost:{p}/agent \\
  -H 'Content-Type: application/json' \\
  -d '{{"input": "test"}}' | python3 -m json.tool
```

## Step 4: Interpret the Ternary Vector

The response includes a `ternary_vector` field. Each position represents a
musical dimension:

- `ternary[0]`: The primary classification (approve/reject/observe)
- Remaining positions: Secondary attributes

## Exercise

Experiment with different inputs and observe how the ternary vector changes.
What inputs produce [+1, 0, 0]? What produces [-1, 0, 0]?

---

_This is part of the educational supplement for the [Live Paradigm Fleet](https://github.com/SuperInstance/sailor-workspace)._
"""

def agent_md(name, info):
    p = info["port"]
    return f"""# fleet-midi-{name}: Agent Identity

**Type:** Fleet-MIDI service agent
**Port:** {p}
**Fleet:** [sailor-workspace](https://github.com/SuperInstance/sailor-workspace)

## Who You Are

You are {name}, one of 16 musical agents in the Live Paradigm fleet.
Your domain is {name.capitalize()}. You analyze musical data, apply ternary
decomposition, and return your finding to the fleet conductor.

## Decision Framework

All decisions follow the ternary model:

1. **Approve (+1)**: The input matches your positive template
2. **Reject (-1)**: The input matches your negative template
3. **Observe (0)**: The input is neutral or ambiguous

## Communication Protocol

- You speak HTTP POST on port {p}
- You expect JSON bodies with musical data
- You respond with JSON containing ternary_vector and analysis fields
- The fleet conductor probes you every 15 seconds for liveness
- You have 5 seconds to respond or the conductor marks you as "error"

## Self-Maintenance

- Log important events
- Handle NaNs gracefully (return 0 for invalid features)
- Never crash — wrap edge cases
"""

def write_repo(name, info):
    """Write all files for one repo to /tmp/fleet-repo-batch/{name}/"""
    repo_dir = f"{ROOT}/{name}"
    os.makedirs(repo_dir, exist_ok=True)

    files = {
        "README.md": readme(name, info),
        "engine.py": engine_code(name, info),
        "THEORY.md": theory(name, info),
        "STUDENT_GUIDE.md": student_guide(name, info),
        "AGENT.md": agent_md(name, info),
    }

    for filename, content in files.items():
        path = f"{repo_dir}/{filename}"
        with open(path, "w") as f:
            f.write(content)
        print(f"  ✏️  {name}/{filename} ({len(content)} chars)")

def push_repo(name):
    """Push a repo dir to GitHub"""
    repo_dir = f"{ROOT}/{name}"
    if not os.path.exists(f"{repo_dir}/README.md"):
        print(f"  ⚠️  {name}: no README.md, skipping")
        return

    subprocess.run(["git", "init"], capture_output=True, cwd=repo_dir)
    subprocess.run(["git", "add", "-A"], capture_output=True, cwd=repo_dir)
    msg = f"fleet-midi-{name}: engine + expansive docs\n\n- engine.py: HTTP server with ternary {name} analysis\n- README.md: educational docs\n- THEORY.md: musical theory\n- AGENT.md: agent identity\n- STUDENT_GUIDE.md: tutorial"
    subprocess.run(["git", "commit", "-m", msg], capture_output=True, cwd=repo_dir)
    subprocess.run(["git", "remote", "add", "origin", f"https://github.com/SuperInstance/fleet-midi-{name}.git"], capture_output=True, cwd=repo_dir)
    result = subprocess.run(["git", "push", "-u", "origin", "HEAD:main", "--force"], capture_output=True, text=True, cwd=repo_dir)
    if result.returncode == 0:
        print(f"  ✅ {name}: pushed")
    else:
        print(f"  ❌ {name}: push failed: {result.stderr[:200]}")

# ─── Main ───
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "write"

    if mode == "write":
        print("=== Generating repo content ===\\n")
        for name, info in AGENTS.items():
            write_repo(name, info)
        print(f"\\n=== Done — {len(AGENTS)} repos in {ROOT} ===")

    elif mode == "push":
        print("=== Pushing to GitHub ===\\n")
        for name in AGENTS:
            push_repo(name)
        print(f"\\n=== Done — {len(AGENTS)} repos pushed ===")

    elif mode == "both":
        print("=== Generating + Pushing ===\\n")
        for name, info in AGENTS.items():
            write_repo(name, info)
            push_repo(name)
        print(f"\\n=== Done — {len(AGENTS)} repos ===")
