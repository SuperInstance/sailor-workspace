# OpenSMILE Fork — Refactoring Plan

**Fork**: github.com/SuperInstance/opensmile (from audeering/opensmile v3.0.2)  
**Goal**: Minimal ARM64 voice feature extraction library for the Live Paradigm fleet.  
**Architect**: Oracle2 (from direct C++ structural analysis)

---

## Phase 1: Minimal Live Feature Config (Today)

### Problem

The full eGeMAPS config chain has ~40+ component instances spanning 5 config includes:
- `standard_wave_input.conf.inc` → audio I/O (unnecessary for streaming)
- `GeMAPSv01b_core.lld.conf.inc` → framer, window, FFT, ACF, pitch, jitter, shimmer, formants, loudness, harmonics, spectrum (unnecessary I/O)
- `eGeMAPSv02_core.lld.conf.inc` → spectral selectors, MFCC, smoothers (core)
- `GeMAPSv01b_core.func.conf.inc` → functionals (unnecessary for streaming)
- `eGeMAPSv02_core.func.conf.inc` → LEq, functionals (unnecessary for streaming)

### Solution: Minimal Config

Build `config/live_paradigm/live_voice.conf` that:
- Starts from raw PCM frame (skip file I/O)
- Frame → Window → FFT → ACF (cAcf)
- Pitch from ACF + Cepstrum (cPitchACF → F0 + HNR + voiceProb + onsFlag)
- Jitter + Shimmer (cJitter, cShimmer)
- Formants via LPC (cFormantLpc → F1, F2, F3 freq + bandwidth)
- Loudness (cEnergy → RMS)
- Spectral features (cSpectral → flux, alpha ratio, slope, hammarberg)
- MFCC (cMelspec + cMfcc → mfcc 1-4)

**Output**: 25 features matching eGeMAPS but with:
- No functional summarizers (streaming, not batch)
- No file I/O (data from WebSocket, not WAV)
- Reduced smoothing (3-frame SMA instead of full-segment)
- All features available at frame rate (~100Hz)

---

## Phase 2: Build System Surgery (This Week)

### Current Build (CMakeLists.txt):

```
add_library(opensmile STATIC ${opensmile_SOURCES})   # 349 .cpp/.hpp sources
add_library(opensmile SHARED ${opensmile_SOURCES})    # same
```

### Dependencies (from CMakeLists.txt line numbers):

| Dependency | Used For | ARM64? | Can Strip? |
|---|---|---|---|
| portaudio | Audio input/output | ✅ | ✅ Strip (use WS audio) |
| FFmpeg | File I/O (WAV, MP3, video) | ✅ | ✅ Strip (use WS audio) |
| OpenSLES | Android audio | N/A | ✅ Strip (no Android) |
| OpenCV | Video input/processing | ⚠️ Heavy | ✅ Strip (voice only) |
| pthreads | Threading | ✅ | ❌ Keep (required) |
| GIT_HASH | Build metadata | ✅ | ❌ Keep (useful) |

### Stripped Build:

```
add_library(libopensmile-live STATIC
    # Core framework (required)
    src/core/smileCommon.hpp
    src/core/smileComponent.cpp
    src/core/componentManager.cpp
    src/core/dataMemory.cpp
    src/core/dataWriter.cpp
    src/core/dataReader.cpp
    
    # DSP pipeline (required)
    src/dspcore/framer.cpp
    src/dspcore/windower.cpp
    src/dspcore/transformFft.cpp
    src/dspcore/fft4g.c
    src/dspcore/acf.cpp
    
    # LLD extraction (core)
    src/lldcore/pitchACF.cpp      # F0 + HNR
    src/lldcore/jitter.cpp         # Jitter
    src/lldcore/shimmer.cpp        # Shimmer  
    src/lldcore/formantLpc.cpp     # Formants (F1-F3)
    src/lldcore/energy.cpp         # RMS Loudness
    src/lldcore/spectral.cpp       # Spectral flux, slopes
    src/lldcore/melspec.cpp        # Mel spectrogram
    src/lldcore/mfcc.cpp           # MFCC
    
    # Utility
    src/dspcore/vectorPreemphasis.cpp
    src/dspcore/contourSmoother.cpp
)
```

**Total**: ~50 files instead of 349.  
**Target**: ~5MB .so instead of ~30MB.  
**Deps**: pthreads + libc only. No FFmpeg, no OpenCV, no portaudio.

---

## Phase 3: C API Wrapper (This Week)

### Problem

The Python `opensmile` package wraps via CFFI but it's designed for file-based batch processing. We need frame-level streaming.

### Solution: Thin C API

```c
// opensmile_live.h
typedef struct opensmile_t opensmile_t;

// Initialize extractor with config path
opensmile_t* opensmile_init(const char* config_path, int sample_rate);

// Process one audio frame (returns JSON-like feature vector)
// Returns number of features written to `features` array
int opensmile_process(opensmile_t* ctx, 
                       const float* audio_frame, 
                       int frame_size,
                       float* features,       // [feature_count] output
                       char** feature_names); // optional: feature labels

// Reset state (between utterances)
void opensmile_reset(opensmile_t* ctx);

// Free extractor
void opensmile_free(opensmile_t* ctx);

// Get feature count
int opensmile_feature_count(opensmile_t* ctx);
```

### Implementation Strategy

The opensmile-python package uses `smileapi` (progsrc/smileapi/) to bridge C++ → Python via CFFI. We can:
1. **Option A**: Extend smileapi to support frame-level streaming
2. **Option B**: Write a new minimal C wrapper that calls the component pipeline directly
3. **Option C**: Use the existing `cComponentManager` graph but feed data via `cDataWriter` instead of file I/O

**Recommended**: Option C. The component manager already supports streaming data — `cDataWriter` can push frames into the pipeline. We just need to skip the file input component.

---

## Phase 4: Streaming Pipeline Integration (Next Week)

### Flow

```
Browser mic → Float32Array → WebSocket → opensmile_bridge (Python)
                                              ↓
                                        C shared library (opensmile_process)
                                              ↓
                                        25 float features
                                              ↓
                                        MIDI CC mapping
                                              ↓
                                        Ghost Track Bridge (:8767)
                                              ↓
                                        tminus-dispatcher
```

### Latency Budget

| Stage | Latency | Cumulative |
|---|---|---|
| Audio capture (browser) | 10-20ms | 10-20ms |
| WebSocket send | 2-5ms | 12-25ms |
| OpenSMILE process (C lib) | 10-30ms | 22-55ms |
| MIDI CC mapping | <1ms | 23-56ms |
| Ghost Bridge forward | <1ms | 24-57ms |
| **Total** | | **25-60ms** |

Target: Stay under 100ms for "instant" feel.

---

## Config File: `config/live_paradigm/live_voice.conf`

This is the key deliverable — a minimal config file that produces only the 25 eGeMAPS-compatible LLD features without any file I/O or functional aggregation:

```ini
[componentInstances:cComponentManager]
; Core pipeline (no file input — expects data pushed via cDataWriter)
instance[frame].type=cFramer
instance[win].type=cWindower
instance[fft].type=cTransformFFT
instance[fftmag].type=cFftmagphase
instance[acf].type=cAcf

; Pitch + HNR
instance[pitch].type=cPitchACF

; Jitter + Shimmer
instance[jitter].type=cJitter
instance[shimmer].type=cShimmer

; Formants
instance[lpc].type=cLpc
instance[formants].type=cFormantLpc

; Energy
instance[energy].type=cEnergy

; Spectral
instance[spectral].type=cSpectral

; MFCC
instance[melspec].type=cMelspec
instance[mfcc].type=cMfcc

; Smoother
instance[smoother].type=cContourSmoother

; Collector
instance[concat].type=cVectorConcat
```

---

## File Structure for the Fork

```
opensmile/                         # Root of fork
├── config/
│   └── live_paradigm/             # NEW: Live Paradigm configs
│       ├── live_voice.conf        # Minimal streaming config
│       └── live_voice_ssml.conf   # With SSML prosody mapping (future)
├── src/
│   ├── core/                      # Keep (required framework)
│   ├── dspcore/                   # Keep (DSP pipeline)
│   ├── lldcore/                   # Keep (feature extraction)
│   ├── io/                        # STRIP (file I/O — not needed for streaming)
│   ├── iocore/                    # STRIP (file I/O core — not needed)
│   ├── classifiers/               # STRIP (classification — not needed)
│   ├── functionals/               # STRIP (batch functionals — not needed)
│   ├── ffmpeg/                    # STRIP (FFmpeg bridge — not needed)
│   ├── newmat/                    # KEEP (matrix math — formant LPC needs it)
│   └── include/
│       ├── lldcore/               # Keep
│       └── opensmile/             # NEW: C API header
│           └── live.h             # opensmile_process() API
├── CMakeLists.txt                 # Modified: optional build targets
└── README.md                      # Fork-specific README
```

---

## Implementation Order

1. **Config file** — Write `live_voice.conf` (no C++ changes needed, just INI config)
2. **Build test** — Run OpenSMILE with the config on known audio
3. **C API** — Write `opensmile_live.h` + thin wrapper
4. **Build surgery** — CMakeLists.txt: add `libopensmile-live` build target
5. **Python bindings** — ctypes wrapper for the C API
6. **Integration** — Pipe through `opensmile-bridge/server.py`
7. **ARM64 CI** — GitHub Actions workflow for ARM64 cross-build

---

## Current Status

| Item | Status |
|------|--------|
| Fork created | ✅ at github.com/SuperInstance/opensmile |
| Structural analysis | ✅ (done manually, Claude Code running deeper) |
| Minimal build targets identified | ✅ 50 files vs 349 |
| Config file design | ✅ Defined above |
| C API design | ✅ Drafted |
| Build system surgery | 🔄 Pending |
| ARM64 build test | 🔄 Pending |
| Frame-level streaming | 🔄 Pending |
