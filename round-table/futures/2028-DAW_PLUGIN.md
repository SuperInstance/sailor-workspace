# 2028: The Conversation Track — A DAW Plugin for Speech as Music

## The Future State

It's February 2028. Marcus opens Ardour 9, creates a new session, and adds a track. But instead of selecting "Audio" or "MIDI," he selects a track type he's never seen before: **"Conversation."**

The track appears with three sub-lanes: a MIDI lane, an automation lane, and a marker lane. He arms the track, hits record, and speaks into his mic for 15 minutes — basically rambling about a script he's stuck on. When he stops and looks at the result:

- **MIDI lane**: A monophonic MIDI region showing the fundamental frequency of his voice mapped to note numbers C2–C6. Velocity mapped to loudness. CC 1 mapped to spectral centroid (brightness), CC 2 mapped to jitter (roughness), CC 3 mapped to shimmer (breathiness).

- **Automation lane**: A continuous energy envelope — volume envelope of the voice over time, smoothed. He can grab a node, pull it down, and it ducks the volume of the entire track. Automation is automation, whether it controls a synth filter or a human voice.

- **Marker lane**: A transcript — time-stamped, with speaker diarization (if others were in the room). Double-clicking a marker jumps playback to that line and highlights the corresponding MIDI notes. The markers show emotional labels too: "[uncertain]", "[emphatic]", "[laughing]".

Marcus drags a synth onto the MIDI lane. He plays back his own voice as a monophonic synthesizer. It sounds like a vocoder but cleaner — the pitch is accurate, the dynamics are there. He noodles. He finds a melody in his own frustrated rambling and turns it into the verse for a song he's been stuck on.

"Conversation Track" is a free, open-source LV2 plugin for Ardour. It is the most musical thing Marcus has installed in years. Because it doesn't pretend speech is *just* data. It treats speech as *already music* — you just can't hear it until someone removes the words.

## Evidence This Future Exists

1. **An LV2 plugin on GitHub** — `conversation-track.lv2` (GPL-3.0, ~1,900 stars). The repo includes the DSP library, an Ardour session template, and a paper documenting the design. The paper title: "Prosody as MIDI: Bridging Speech Analysis and DAW Workflows" (rejected from ISMIR 2027, accepted to the Linux Audio Conference 2028).

2. **A viral demo video** — A YouTube video titled "I turned my angry voicenote into a house track" (3.2M views). The creator shows: record a rant → drag a supersaw synth → play with filter cutoff → two hours of production. The comments are split between "this is brilliant" and "this is cheating."

3. **An Ardour 9 feature** — The Ardour team adds native support for "Speech Analysis" track types. The feature ships in Ardour 9.1 (2028). It is basically a wrapper around the Conversation Track LV2 plugin, but officially supported. The Ardour blog post says: "We didn't think we'd ship this. Our users asked for it. Here it is."

4. **A licensing deal** — An indie game studio licenses the plugin to procedurally generate music from NPC voice lines. They process 40,000 lines of dialogue through the plugin, extract the MIDI regions, and use them as input to a generative music system. The game ships in 2029. Critics praise its "emotional soundtrack that actually follows the actors' performances."

5. **A fork** — Someone forks the plugin and extends it to handle polyphonic speech (multiple speakers). It's janky — separate-pitch extraction per speaker is hard without a source separation model — but it works for 2 speakers with different timbres. The fork is called `duet-track`. It has 230 stars.

## The Reverse Timeline

### 2027–2028: The Ardour Integration
- The LV2 plugin exists and works. But the Ardour UX for it is baroque — you have to manually create three tracks, route audio to the plugin, and configure the outputs. Most users bail before it works.
- The author submits a patch to Ardour 9: "Support for speech analysis track type." The Ardour maintainers are initially skeptical. They accept it after a long thread. The patch adds: automatic track creation on "Conversation Track" selection, built-in connection routing, and a session template.
- The plugin ships as a built-in option in Ardour 9.1. The standalone plugin is still available for other LV2 hosts. Adoption jumps from ~200 users to ~5,000 in the first month.

### 2025–2027: The Plugin Matures
- The first version is an LV2 plugin that takes an audio input and writes MIDI to its output ports. It works in Ardour, Carla, and any LV2 host that supports multi-port output.
- The guts: `pyo3` bindings to Python for `pyworld` (pitch extraction) and `whisper` (transcription). The Python component does the heavy analysis. The C++ component handles real-time buffer interfacing. Latency is ~500ms — too slow for live monitoring, acceptable for post-recording processing.
- The author releases it. It gets ~200 stars. It is described as "a bit hacky" but "surprisingly useful." The three most common requests: (1) lower latency, (2) speaker diarization, (3) a GUI for the marker track.
- Someone writes a plugin for REAPER using the same architecture (JSFX). It's less polished but works. This proves the concept is DAW-agnostic.

### 2023–2025: The First Prototype
- An audio programmer at an independent label in Berlin is working on speech-to-synth experiments. They write a Python script: capture audio → pyworld F0 → convert to MIDI notes → output via `python-rtmidi` → drive a hardware synth. It works but it's not a plugin — it's a script with dependencies.
- They try to wrap it as an LV2 plugin. They fail. The LV2 API is hard. They publish the Python script on GitHub anyway: "conversation-track.py." 47 stars. Most comments are "make this a plugin."
- A second person — a Linux audio enthusiast — picks it up. They know LV2. They wrap the Python core in a C++ LV2 shell using `lv2-plugin` (a helper library). It compiles. It crashes. They debug. It compiles again. It works for 8 seconds, then glitches. They add a ring buffer. It works.
- The first working LV2 plugin has 3 outputs: MIDI pitch (mono), CC 1 (energy), and a text file (transcript). No marker track. No GUI. No documentation. It is the ugliest thing they have ever built. They push it to GitHub.

### 2022–2023: The Preconditions
- Ardour is the dominant open-source DAW. LV2 is its native plugin format. LV2 supports multi-port MIDI and CV outputs. The infrastructure for an audio-analysis plugin that outputs MIDI is already there — nobody has written it yet.
- `pyworld` and `crepe` offer pitch extraction that works on speech at low latency. `whisper` runs fast enough to transcribe on a consumer GPU. The technology stack is ready.
- A blogger writes a post: "Why can't I hook a pitch tracker up to my DAW and get MIDI from speech?" It gets 2,000 views. Someone in the comments mentions `pyworld`. Someone else mentions Ardour. A third person writes: "I bet I could build this." They bookmark it. They forget for a year.

- A conference talk at the Linux Audio Conference 2023: "Pitch Extraction in Real Time with LV2." The speaker demonstrates a simple plugin that extracts F0 from a guitar and outputs MIDI. The plugin is called `guitar2midi`. Someone in the audience asks: "Would this work on a voice?" The speaker says: "I don't know. Try it." Someone does.

## Today We Build: A Python script that records 60 seconds of speech, extracts F0 as MIDI notes, RMS as a CC lane, and a whisper transcript with timestamps. Output: a `.mid` file and a `.txt` file. Get it working on one laptop. Share it. Let people hear their own speech as MIDI for the first time. That's the demo. The plugin comes after.
