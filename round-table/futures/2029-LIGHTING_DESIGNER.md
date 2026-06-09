# 2029: The Lighting Designer Who Doesn't Script — An Audio-Driven QLC+

## The Future State

It's April 2029. The dress rehearsal for *The Stranger* is over. The actors have left the stage. Sarah, the lighting designer, has one hour to build the cue sheet for opening night.

She doesn't open a script. She doesn't place fixtures manually. She opens her fork of QLC+ — *QLC+ Audio* — drops in the audio file from tonight's rehearsal (a stereo mix from a single room mic), and hits "Analyze."

The interface fills. Dimmer channels mapped to aggregate RMS energy with a rolling-window smoothing. Color temperature tied to the pitch centroid — warm amber where voices settle low, cold blue where they climb. Scene-change SysEx triggers extracted from stage-direction pauses: when the spectral flux drops below a threshold and holds for 0.8 seconds, the software inserts a scene change. When two speakers' pitch contours cross, it flags a dramatic moment and assigns it a chase sequence.

Sarah makes exactly three tweaks: nudges the color transition threshold down a few cents, overrides one scene-change trigger that mistook a long pause for a cue, and renames the QLC+ scenes from "Scene 1" to "The Arrest" and "Scene 2" to "The Interrogation." The whole process takes 17 minutes. The previous play she lit took three full days.

When opening night runs, she sits in the booth watching the dimmers move with the actors' voices. The lighting isn't automated in the traditional sense — it's *responsive*. The actors don't hit marks; the light follows the energy. The audience doesn't notice the lights. They feel them.

## Evidence This Future Exists

1. **A GitHub fork** — `mcf/QLCPlus-Audio` (LGPL-3.0), ~1,200 stars, 80 forks. The README starts with: "Drop audio. Get cues." Active since 2027. Four core contributors, none of whom are professional lighting designers — they're a music information retrieval researcher, two audio programmers, and a theater tech who learned QLC+ out of necessity.

2. **A case study** — Published in *Theatre Journal* (2028): "Automated Cue Extraction from Rehearsal Audio in QLC+." The study compares Sarah's 17-minute workflow against a manual cue-sheet build for the same play. Manual took 12.5 hours. Audio-driven cues required 11% manual correction. The author notes: "The result is not better than a great lighting designer. It is better than a rushed one."

3. **A conference talk** — LDI 2028, "Your Mic Is Your Script: Audio-to-Lighting in Production." The room is SRO. Attendees bring their own audio files. The live demo works on 4 out of 5 of them. The fifth fails because the recording has a limiter clipping the pitch variation — a lesson about audio quality that becomes a standard workflow note.

4. **A plugin** — A VST-to-ArtNet bridge that exists as a standalone project. Separate from QLC+ Audio but interoperable. It lets any audio that runs through a DAW control lighting fixtures in real time. The plugin is described as "chaotic" by early adopters but "creative" by the same people.

5. **A patent filing** — "System and method for extracting lighting cue parameters from mixed-audio rehearsal recordings" (priority date 2027, filed by a theater collective in Portland). The patent specifically claims the spectral-flux-to-scene-change mapping and the pitch-centric-to-color-temperature mapping. It won't be enforced. It exists to prevent someone else from enforcing it.

## The Reverse Timeline

### 2028–2029: Production Readiness
- The fork has been battle-tested in four productions across three cities. Bugs are being found — the spectral-flux threshold is too sensitive for plays with percussive door slams; pitch centroid tracking fails when the room mic captures too much stage reverb.
- The solution: a pre-processing stage that separates speech from ambient noise using a lightweight training-free separation model (Demucs 4 with a speech-stem heuristic). This becomes the default. Accuracy goes from 71% to 92%.
- Sarah publishes her case study. The theater tech community is skeptical but curious. A few more designers adopt it for previews and early rehearsals, then override manually for tech week. The workflow is *never* fully trust, always verify.

### 2026–2028: The Plugin and the Bridge
- The VST-to-ArtNet bridge is built by a GitHub contributor who got frustrated that QLC+ Audio could only process *files*. He wants live. His bridge lets Ableton Live control DMX fixtures. It's janky — latency varies wildly — but it proves the concept.
- The core team for QLC+ Audio formalizes. Four people. They use Open Sound Control (OSC) as the intermediate protocol: audio features go to OSC, OSC goes to QLC+. This means anyone can write audio→feature extractors and plug them in.
- The first production runs with QLC+ Audio: a fringe theater production in Oakland. The designer uses it for one scene only — the interrogation scene in *The Stranger*. It works. The audience doesn't know. The designer knows.

### 2024–2026: The First Prototype
- A theater tech at a university in the UK has an idea. She builds a Python script: load a WAV, extract RMS energy, map to OSC, pipe OSC to QLC+. It works for one fixture. She posts the code. No one uses it. But the idea sticks.
- A second person — the MIR researcher — finds the code. He extends it: pitch tracking (CREPE), spectral centroid, spectral flux. Three more parameters. He maps energy to dimmers, pitch centroid to color temperature, spectral flux to scene-change detection. The result is ugly but functional. He pushes it to GitHub: "working prototype, please don't laugh."
- 53 people laugh. 2 people contribute. One of them is the audio programmer. The other is the theater tech with the original Python script.

### 2022–2024: The Preconditions
- Music Information Retrieval (MIR) libraries have matured. `librosa` v0.10 has pitch tracking that works on speech. `pytorch-audio` models run on a laptop. The gap between audio analysis and lighting control has never been narrower.
- QLC+ already supports ArtNet, OSC, and DMX. It has a plugin architecture. It is open source (GPL). The only missing piece is the audio-to-parameter mapping.
- The COVID-19 era produced a generation of theater technicians who learned remote workflows. They are comfortable with automated tools. They are not precious about the script — they will try anything that saves time.
- A group of theater techs on a forum start a thread: "What if we could light from audio?" The thread is 47 posts long. Most of it is speculation about what would be possible. One post says: "I bet someone has already built this. Check GitHub." No one has. The thread ends. But someone reads it.

## Today We Build: A Python script that extracts RMS energy, pitch centroid, and spectral flux from a WAV file, maps them to OSC messages, and sends them to QLC+ to control a single dimmer fixture and a single RGB fixture. Share it on GitHub. Title it: "Audio-to-light prototype for theater folks." Let the first 100 people who download it tell us what's missing.
