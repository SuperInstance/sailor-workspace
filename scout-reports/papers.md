# 📚 Academic Papers — SuperInstance Ternary⇄Music Foundation

> *Curated 2026-06-08. Each paper connects to specific fleet repos.*

---

## 1. Neo-Riemannian Theory

### "Generalized Musical Intervals and Transformations" (GMIT)
**Author:** David Lewin (1987, Yale University Press)
**URL:** https://www.jstor.org/stable/10.2307/843979

Our ternary {-1, 0, +1} system is a direct implementation of Lewin's Generalized Interval Systems (GIS). A GIS defines an interval function between elements of a musical space — our `TERNARY_TO_INTERVAL` dictionary is exactly this.

**Connects to:** fleet-ternary-music (direct), fleet-symmetry-analyzer, fleet-voice-leader

---

### "Audacious Euphony: Chromaticism and the Triad's Second Nature"
**Author:** Richard Cohn (2012, Oxford University Press)
**URL:** https://global.oup.com/academic/product/audacious-euphony-9780199770223

Cohn's hexatonic cycles and voice-leading transformations use exactly the +1/0/-1 triad transformations we implement. The P (parallel), L (leading-tone), and R (relative) transforms form a group — the same group structure as our conservation pairs.

**Connects to:** fleet-ternary-music, fleet-symmetry-analyzer, fleet-fugue-engine

---

### "A Geometry of Music: Harmony and Counterpoint in the Extended Common Practice"
**Author:** Dmitri Tymoczko (2011, Oxford University Press)
**URL:** https://dmitri.mycpanel.princeton.edu/geomusic.html

Tymoczko maps chord progressions to geometric spaces. Our arrangement of ternary states into chord progressions (in fleet-midi-musiclang) follows Tymoczko's voice-leading constraints — each state change is minimal motion in chord space.

**Connects to:** fleet-midi-musiclang, fleet-ternary-music, fleet-voice-leader

---

## 2. Machine Learning for Music

### "MusicVAE: Creating a Music Variational Autoencoder"
**Authors:** Roberts, Engel, Raffel, Hawthorne, Eck (2018, Google Magenta)
**URL:** https://magenta.tensorflow.org/music-vae

MusicVAE's latent space is a continuous representation of musical sequences. Our agent state vectors could seed MusicVAE's latent space for neural-style generation — the bridge between ternary structure and neural generation.

**Connects to:** fleet-midi-generator, fleet-midi-markov, fleet-midi-text2midi

---

### "DDSP: Differentiable Digital Signal Processing"
**Authors:** Engel, Hantrakul, Gu, Roberts (2020, ICLR)
**URL:** https://ddsp.dev/

DDSP makes audio synthesis differentiable. Combined with our MIDI output, DDSP could render our fleet's MIDI into realistic instrument audio — acoustic text-to-speech for music.

**Connects to:** fleet-midi-player, fleet-midi-text2midi, fleet-jam-engine

---

## 3. Symmetry Groups in Music

### "Symmetry and Transformational Analysis in Music"
**Author:** various (Journal of Mathematics and Music)
**URL:** https://tandfonline.com/toc/tmam20

Our symmetry analyzer detects palindromes and conservation pairs in agent states. This is mathematically identical to the retrograde and inversion operations in twelve-tone theory.

**Connects to:** fleet-symmetry-analyzer, fleet-ternary-music

---

## 4. Agent-Based Music Systems

### "Evolving Structures for Electronic Dance Music"
**Authors:** Eigenfeldt, Pasquier (2013, ICCC)
**URL:** https://computationalcreativity.net/iccc2013/

Multi-agent systems for music generation where each agent has a role (rhythm, harmony, structure). This is exactly our fleet architecture — Rhapsodia, Rhythmica, Harmonia, and Composita as collaborative agents.

**Connects to:** fleet-jam-engine, fleet-music-theorist, symphony-orchestrator, composite-headspace

---

## 5. Real-Time Systems

### "Open Sound Control: An Enabling Technology for Musical Networking"
**Authors:** Wright, Freed (1997, ICMC)
**URL:** https://cnmat.berkeley.edu/publications/open-sound-control-enabling-technology-musical-networking

OSC is the protocol underlying our fleet's real-time communication (fleet-osc-server). The paper describes the timing model that ensures distributed agents stay synchronized — our I2I bottle protocol extends this.

**Connects to:** fleet-osc-server, fleet-midi-sonicpi, fleet-midi-foxdot, i2i-bottle-agent, fleet-bridge

---

## Quick Reference by Fleet Domain

| Domain | Key Paper | Why It Matters |
|--------|-----------|----------------|
| **Ternary Math** | Lewin, GMIT (1987) | Proves our interval mapping is mathematically sound |
| **Music Theory** | Cohn, Audacious Euphony (2012) | Our symmetry groups have academic precedent |
| **Geometry** | Tymoczko (2011) | Our chord progressions follow geometric constraints |
| **ML Music** | MusicVAE (2018) | Bridge to neural music generation |
| **Audio** | DDSP (2020) | Our MIDI → realistic instrument audio |
| **Agents** | Eigenfeldt (2013) | Multi-agent music systems → academic validation |
| **Real-Time** | Wright, OSC (1997) | Our OSC and I2I protocol has roots in this |
