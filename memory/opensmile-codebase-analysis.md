# OpenSMILE Codebase Analysis — SuperInstance/opensmile fork

**Source:** `https://github.com/SuperInstance/opensmile` (fork of `audeering/opensmile`)
**Language:** C++11 with C99 C sources (349 source files total)
**Version:** 3.0.2 (per conanfile.py)

---

## 1. Build System

### CMakeLists.txt (top-level)

**Compiler requirements:**
- C standard: C99 (`CMAKE_C_STANDARD 99`)
- C++ standard: C++11 (`CMAKE_CXX_STANDARD 11`)
- No ARM-specific cross-compilation in CMakeLists.txt itself — that's deferred to toolchain files

**Compilers tested/supported:**
- GCC (GNU) with `-Wno-unused-result` suppression
- MSVC (Visual C++) with `/wd4244 /wd4267 /wd4305 /EHsc` suppressions
- Clang noted in `build_flags.sh` (commented out as default, used for iOS/Android via NDK)
- Android NDK Clang required for Android builds

**Key CMake options:**
| Option | Default | Purpose |
|--------|---------|---------|
| `STATIC_LINK` | ON | Build libopensmile as static `.a` instead of shared `.so` |
| `MARCH_NATIVE` | OFF | `-march=native -mtune=native` optimization |
| `WITH_PORTAUDIO` | OFF | PortAudio audio I/O |
| `WITH_FFMPEG` | OFF | FFmpeg audio/video input |
| `WITH_OPENSLES` | OFF | Android OpenSL ES |
| `WITH_OPENCV` | OFF | OpenCV video input |
| `BUILD_FLAGS` | "" | String of feature flags (BUILD_LIBSVM, BUILD_RNN, BUILD_SVMSMO, etc.) |
| `PROFILE_GENERATE/PROFILE_USE` | "" | PGO (profile-guided optimization) |

### ARM64 compatibility

ARM64 is **already supported** via:
- **Android NDK:** `buildAndroid.sh` uses `-DCMAKE_TOOLCHAIN_FILE=${ANDROID_HOME}/ndk-bundle/build/cmake/android.toolchain.cmake` with `ANDROID_ABI=x86_64` (can be changed to `arm64-v8a`)
- **iOS:** `buildIos.sh` / `buildIosUniversalLib.sh` target ARM64 iOS
- **Conan:** `conanfile.py` supports `settings.arch` for cross-platform
- **No x86 SIMD intrinsics** are used anywhere in the codebase (no SSE/AVX), so pure ARM NEON is possible
- **MARCH_NATIVE** disabled by default — good for cross-compilation
- **No ARM-specific optimizations exist**, which means performance on ARM64 will be portable but unoptimized
- **Pre-built ARM64 binary ships with pip package:** `manylinux_2_17_aarch64/libSMILEapi.so`

### Dependencies

**Required:**
- `Threads::Threads` (pthreads) — mandatory
- `dl` (Linux dynamic loading) — only for SHARED builds
- `Ws2_32` (Windows Winsock2)
- Android: `log` library

**Optional (all OFF by default):**
- PortAudio (audio I/O)
- FFmpeg (audio/video input)
- OpenSL ES (Android audio)
- OpenCV (video input)

**Bundled:**
- **newmat** (`src/newmat/`) — C++ matrix library (BSD-like license) for LPC/formant calculations
- **rapidjson** (`src/include/rapidjson/`) — JSON parser
- **libsvm** (`src/classifiers/libsvm/`) — SVM classifier
- **Speex** — referenced in licenses (resampler)

**No external BLAS/LAPACK** — newmat is pure C++.

### Build scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | Linux/macOS: creates build dir, runs cmake with ninja or make, `-j 8` |
| `buildAndroid.sh` | Android: uses NDK toolchain, Ninja, `ANDROID_ABI=x86_64` default |
| `buildIos.sh` | iOS: uses ios.toolchain.cmake |
| `buildIosUniversalLib.sh` | iOS universal binary (device + simulator) |
| `build_flags.sh` | Shared cmake flags: Release, static link, all feature flags enabled |
| `conanfile.py` | Conan package manager with fine-grained feature toggles |

### BUILD_FLAGS system (compile-time filtering)

Components are conditionally compiled via `#ifdef BUILD_COMPONENT_X` guards in `componentList.hpp`. The flags set by default:
```
-DBUILD_LIBSVM -DBUILD_RNN -DBUILD_SVMSMO
```

However, many individual components have their own flags like:
- `BUILD_COMPONENT_PitchJitter`, `BUILD_COMPONENT_PitchShs`
- `BUILD_COMPONENT_FormantLpc`, `BUILD_COMPONENT_FormantSmoother`
- `BUILD_COMPONENT_Harmonics`
- `BUILD_COMPONENT_Functionals` (all functionals)
- `BUILD_COMPONENT_SmileResample`, `BUILD_COMPONENT_VadV1`, etc.

These are **not set by default** in `build_flags.sh` — they must be added to `BUILD_FLAGS` or define them manually. The `build_flags.sh` only sets `BUILD_LIBSVM`, `BUILD_RNN`, `BUILD_SVMSMO`.

---

## 2. Component Architecture

### Directory structure

```
src/
├── core/          — Framework core (componentManager, configManager, dataMemory, base classes)
├── include/       — All headers (mirrors src layout)
├── dspcore/       — DSP building blocks (FFT, framing, windowing, ACF, AMDF, resample)
├── dsp/           — Higher-level DSP (VAD, signal generator, resample)
├── lldcore/       — Low-level descriptors core (energy, pitch, MFCC, spectral, melspec, intensity)
├── lld/           — Advanced LLD (formants, jitter, shimmer, harmonics, LPC, tone)
├── functionals/   — Statistical functionals over contours (mean, stddev, percentiles, regression, etc.)
├── iocore/        — I/O components (wave, CSV, ARFF, HTK, externalSource/Sink)
├── io/            — Advanced I/O (libsvm)
├── classifiers/   — SVM classifiers (libsvm)
├── rnn/           — LSTM RNN models
├── portaudio/     — PortAudio backend
├── ffmpeg/        — FFmpeg backend
├── android/       — OpenSL ES Android source
├── ios/           — iOS CoreAudio source
├── video/         — OpenCV video source
├── other/         — Misc (vector concat, valbased selector, maxIndex, externalMessageInterface)
├── examples/      — Example source/sink/processor
├── newmat/        — Bundled linear algebra library
├── smileutil/     — Utility functions (spline, CSV, JSON, ringbuffer)
```

### Class hierarchy (full)

```
cSmileComponent (base)
├── cDataSource        — writes to dataMemory, doesn't read from it
│   ├── cExternalSource       — programmatic data input
│   ├── cExternalAudioSource  — programmatic PCM audio input
│   ├── cWaveSource           — reads WAV files
│   ├── cArffSource / cCsvSource / cHtkSource
│   ├── cFFmpegSource         — FFmpeg-based audio/video input
│   ├── cSignalGenerator      — synthetic signal generation
│   ├── cPortaudioSource      — live mic input
│   └── (various platform-specific sources)
├── cDataSink          — reads from dataMemory, doesn't write
│   ├── cExternalSink         — callback-based data output
│   ├── cNullSink
│   ├── cCsvSink / cArffSink / cHtkSink / cWaveSink
│   └── cDataPrintSink / cDatadumpSink
├── cDataProcessor     — reads from AND writes to dataMemory
│   ├── cVectorProcessor  — processes each array field as a vector
│   │   ├── cPitchBase        ──> cPitchShs (SHS pitch detector)
│   │   ├── cPitchACF         — ACF-based pitch + HNR
│   │   ├── cFormantLpc       — formants via LPC root solving
│   │   ├── cHarmonics        — F0 harmonic statistics
│   │   ├── cLpc / cLsp
│   │   ├── cEnergy / cIntensity / cSpectral / cMelspec / cMfcc / cPlp
│   │   ├── cMZcr / cAcf / cAmdf
│   │   ├── cPreemphasis / cVectorPreemphasis / cVectorMVN
│   │   ├── cDeltaRegression / cContourSmoother
│   │   ├── cWindower / cFramer / cMonoMixdown
│   │   └── (many more)
│   ├── cDataProcessor (direct)
│   │   ├── cPitchJitter       — jitter + shimmer + HNR (needs separate F0 input)
│   │   ├── cPitchDirection    — F0 direction
│   │   ├── cPitchSmootherViterbi — Viterbi pitch smoothing
│   │   ├── cTurnDetector
│   │   └── cVadV1
│   ├── cDataSelector / cValbasedSelector
├── cDataWriter / cDataReader — internal data memory management
└── cFunctional* (functionals) — sub-components, no own dataMemory
```

### Pipeline pattern: Data flow

The data flow is a **directed acyclic graph** of components connected through `cDataMemory` levels.

**Typical voice feature extraction pipeline (eGeMAPSv02):**

```
waveSource (PCM audio)
  → cFramer (windowing into frames)
    → cPreemphasis
      → cTransformFFT (FFT)
        → cFFTmagphase (magnitude spectrum)
          ├──→ cMelspec → cMfcc (MFCC features)
          ├──→ cSpectral (spectral parameters)
          ├──→ cPitchACF (F0 + HNR from ACF)
          │     └──→ cPitchSmoother
          │           └──→ cContourSmoother
          ├──→ cAcf (autocorrelation)
          │     └──→ cPitchACF (alternative pitch)
          ├──→ cLpc → cFormantLpc (formant frequencies)
          │     └──→ cFormantSmoother
          ├──→ cHarmonics (harmonic differences, HNR from spectrum)
          ├──→ cEnergy (RMS energy, loudness)
          ├──→ cPitchJitter (jitter + shimmer, needs both PCM + F0)
          └──→ cValbasedSelector (voiced/unvoiced split)
                └──→ cContourSmoother (SMA smoothing)
                      └──→ cDataSelector (select subset of features)
                            └──→ cFunctionals (statistical aggregation)
                                  └──→ cExternalSink (callback output)
```

### Component registration

Every component has a registration macro pattern:

```cpp
// In .cpp file:
SMILECOMPONENT_STATICS(cMyComponent)
SMILECOMPONENT_REGCOMP(cMyComponent)
{
  SMILECOMPONENT_REGCOMP_INIT
  // ... create config type ...
  SMILECOMPONENT_IFNOTREGAGAIN_BEGIN
  // ... register config fields ...
  SMILECOMPONENT_IFNOTREGAGAIN_END
  SMILECOMPONENT_MAKEINFO(cMyComponent);
}
```

The global registry is `componentlist[]` in `src/include/core/componentList.hpp` — a NULL-terminated array of `registerFunction` pointers. The `cComponentManager` iterates this array to register all component types.

### Config files

Config files are INI-style with sections like `[instanceName:ComponentType]`. Supports:
- `\{...\}` include directives (e.g. `\{../../shared/standard_wave_input.conf.inc\}`)
- `\{\cm[bufferModeConf]\}` variable substitution
- Components are instantiated via `[componentInstances:cComponentManager]` sections

Config files are in `config/` organized by feature set:
- `egemaps/v02/eGeMAPSv02.conf` — Geneva Minimalistic Parameter Set
- `gemaps/v01b/GeMAPSv01b.conf` — Geneva Acoustic Parameter Set
- `compare16/ComParE_2016.conf` — Interspeech ComParE challenge
- `emobase/emobase.conf` — Emotion recognition baseline
- `prosody/prosodyShs.conf` — Prosodic features
- `demo/demo1_energy.conf` — Simple energy demo

---

## 3. Key Voice Extraction Modules

### F0 (Fundamental Frequency)

| Component | File(s) | Method |
|-----------|---------|--------|
| `cPitchACF` | `src/lldcore/pitchACF.cpp` | ACF-based + cepstrum. Computes F0, voicing probability, HNR. Uses `pitchPeak()` + `voicingProb()`. Outputs: F0, F0raw, F0env, voiceProb, voiceQual, HNRdB, HNR. |
| `cPitchShs` | `src/lld/pitchShs.cpp` | Sub-Harmonic Sampling (SHS). Inherits `cPitchBase`. Uses harmonic product spectrum approach. Configurable harmonics, octaves, octave correction. |
| `cPitchBase` | `src/lldcore/pitchBase.cpp` | Abstract base. Manages pitch candidates, voicing, octave correction. Subclasses override `pitchDetect()`. |

**F0 algorithm path (most common — eGeMAPS uses ACF method):**
1. Frame PCM → `cFramer` → `cWindower` (Hamming) → `cTransformFFT`
2. FFT magnitude → `cAcf` (inverse FFT of power spectrum → ACF)
3. ACF → `cPitchACF.pitchPeak()` finds peak in plausible F0 range → `voicingProb()` computes voicing confidence
4. `cPitchSmoother` smooths F0 contour
5. Optionally `cPitchSmootherViterbi` for Viterbi-based smoothing

### Formants (F1, F2, F3)

| Component | File(s) | Method |
|-----------|---------|--------|
| `cLpc` | `src/lld/lpc.cpp` | LPC analysis using autocorrelation method + Levinson-Durbin recursion |
| `cFormantLpc` | `src/lld/formantLpc.cpp` | Solves LPC polynomial for complex roots → extracts formant frequencies + bandwidths. User-configurable nFormants (default 4), min/max frequency range, median filtering, octave correction. |
| `cFormantSmoother` | `src/lld/formantSmoother.cpp` | Smooths formant trajectories |

**Formant algorithm path:**
1. Framed PCM → `cFramer` → `cWindower`
2. Windowed frame → `cLpc` (computes LPC coefficients + gain via autocorrelation + Levinson-Durbin)
3. LPC coefficients → `cFormantLpc`: solves polynomial using newmat, extracts roots, converts to freq + bandwidth
4. `cFormantSmoother`: optional median filtering + trajectory smoothing

### Jitter & Shimmer

| Component | File(s) | Method |
|-----------|---------|--------|
| `cPitchJitter` | `src/lld/pitchJitter.cpp` (1214 lines) | Derived from `cDataProcessor` (not vectorProcessor — needs two inputs). |

**Key implementation details:**
- Requires TWO input streams: raw PCM frames + F0 contour
- `crossCorr()` — normalized cross-correlation for period matching
- `amplitudeDiff()` — amplitude comparison between successive periods
- `rmsAmplitudeDiff()` — RMS-based amplitude comparison
- Outputs: jitterLocal, jitterDDP, shimmerLocal, shimmerLocalDB
- Environment: `F0reader` reads the F0 level separately
- Configurable: `onlyVoiced`, `minF0`, `searchRangeRel`, `minNumPeriods`

### HNR (Harmonics-to-Noise Ratio)

HNR comes from two different modules:

| Component | File | Method |
|-----------|------|--------|
| `cPitchACF` | `src/lldcore/pitchACF.cpp` | `computeHNR()` — ratio of ACF peak at fundamental period vs total energy. `computeHNR_dB()` / `computeHNR_lin()` — dB and linear variants. |
| `cHarmonics` | `src/lld/harmonics.cpp` (1069 lines) | `computeAcfHnr_linear()` / `computeAcfHnr_dB()` — from magnitude spectrum via inverse FFT of spectrum. Also computes harmonic differences (H1-H2, H1-A3, etc.) |

---

## 4. Refactoring Surface — ⚠ CRITICAL FINDING: Minimal Build Already Works

**The pip-installed `opensmile 2.6.0` ships a pre-built `libSMILEapi.so` for ARM64 Linux at:**
```
opensmile/core/bin/manylinux_2_17_aarch64/libSMILEapi.so
```

This is verified working on our Oracle ARM64 instance. **No custom build is needed for Linux ARM64.**

### Minimal voice feature extraction set

To extract only voice features (F0, formants, jitter, shimmer, HNR, MFCC, spectral, energy), the **minimum required modules** are:

**Essential core (cannot remove):**
```
src/core/                    — Component framework, dataMemory, configManager, componentManager
src/newmat/                  — Linear algebra (LPC, formants)
src/include/rapidjson/       — JSON serialization
src/smileutil/               — smileUtil.c, zerosolve.cpp, JsonClasses.cpp
```

**Signal processing essentials:**
```
src/dspcore/framer.cpp        — Frame audio into windows
src/dspcore/windower.cpp      — Window function application
src/dspcore/fftsg.c           — FFT (Ooura's FFT)
src/dspcore/transformFft.cpp   — FFT wrapper
src/dspcore/fftmagphase.cpp   — Magnitude/phase spectrum
src/dspcore/preemphasis.cpp   — Pre-emphasis filter
src/dspcore/vectorPreemphasis.cpp
src/dspcore/monoMixdown.cpp   — Mono mixing
src/dspcore/acf.cpp           — Autocorrelation
src/dspcore/amdf.cpp          — AMDF
src/dspcore/contourSmoother.cpp — SMA filtering
src/dspcore/deltaRegression.cpp
src/dsp/smileResample.cpp     — Resampling (optional)
src/dsp/specResample.cpp      — Spectral resampling
src/dsp/dbA.cpp               — A-weighting (optional)
```

**Voice feature modules:**
```
src/lldcore/pitchBase.cpp      — Pitch (F0) base
src/lldcore/pitchACF.cpp       — ACF-based pitch + HNR
src/lldcore/pitchSmoother.cpp  — Pitch smoothing
src/lldcore/energy.cpp         — Energy/loudness
src/lldcore/intensity.cpp      — Intensity
src/lldcore/melspec.cpp        — Mel spectrum
src/lldcore/mfcc.cpp           — MFCC
src/lldcore/mzcr.cpp           — Zero-crossing rate
src/lldcore/spectral.cpp       — Spectral features
src/lldcore/plp.cpp            — PLP (optional)
src/lld/pitchShs.cpp           — SHS pitch (alternative)
src/lld/pitchJitter.cpp        — Jitter + shimmer
src/lld/pitchDirection.cpp     — F0 direction
src/lld/pitchSmootherViterbi.cpp — Viterbi smoothing
src/lld/lpc.cpp                — LPC coefficients
src/lld/formantLpc.cpp         — Formant extraction
src/lld/formantSmoother.cpp    — Formant smoothing
src/lld/harmonics.cpp          — Harmonic differences, HNR
```

**I/O modules needed:**
```
src/iocore/externalSource.cpp       — Programmatic data input
src/iocore/externalAudioSource.cpp  — Programmatic audio input
src/iocore/externalSink.cpp         — Callback-based output
```

**Optional / removable:**
```
src/portaudio/              — Remove (live audio I/O not needed)
src/ffmpeg/                 — Remove (file I/O not needed)
src/video/                  — Remove (OpenCV video input)
src/android/                — Remove (platform-specific)
src/ios/                    — Remove (platform-specific)
src/classifiers/            — Remove (SVM classification)
src/rnn/                    — Remove (LSTM RNN inference)
src/iocore/waveSource.cpp   — Optional (if using externalSource)
src/iocore/waveSink.cpp     — Optional
src/iocore/csvSink.cpp      — Optional
src/iocore/arffSink.cpp     — Optional
src/iocore/htkSink.cpp      — Optional
src/functionals/            — Optional (statistical aggregation over contours)
src/dsp/vadV1.cpp           — Optional (VAD)
src/other/vectorConcat.cpp  — Only if needed
```

### Exposing as shared library (.so)

**Already exists.** Two targets are built:

1. **`libopensmile.so`** — the core library (all algorithm components)
   - Built when `STATIC_LINK=OFF`

2. **`libSMILEapi.so`** — the C API wrapper (higher-level interface)
   - Built by `progsrc/smileapi/CMakeLists.txt`
   - Links against `libopensmile`
   - Exposes pure C API defined in `SMILEapi.h`
   - **Pre-built for ARM64 at:** `opensmile/core/bin/manylinux_2_17_aarch64/libSMILEapi.so`

The `libSMILEapi.so` exposes ~20 C functions for the full lifecycle:
- `smile_new()` / `smile_free()` — lifecycle
- `smile_initialize(configFile, options, ...)` — loads config .ini file
- `smile_run()` — processes until done
- `smile_abort()` / `smile_reset()` — control
- `smile_extsource_write_data()` — push PCM data in
- `smile_extsink_set_data_callback()` — receive features via callback
- `smile_extsink_get_element_name()` / `smile_extsink_get_num_elements()` — introspect output

### Alternative minimal API approach (bypass SMILEapi)

For the absolute minimum, create a C++ wrapper that:
1. Instantiates `cConfigManager` and `cComponentManager`
2. Creates pipeline components manually via `cMan->addComponent()`
3. Uses `cExternalSource::writeData()` and `cExternalSink::setDataCallback()` directly
4. Compile as static library and link into Python extension

**Estimated stripped size:**
- Full build: ~4-6 MB static
- Voice-only build (no portaudio/ffmpeg/video/classifiers/rnn): ~2-3 MB static
- Pip bundled: **already ~1.5-2 MB** (ARM64 Linux)

---

## 5. Python <> C++ Boundary

### Current Python wrapper (`progsrc/smileapi/python/opensmile/`)

The Python wrapper uses **ctypes directly** (no Cython, no pybind11, no SWIG for desktop Python):

```
progsrc/smileapi/python/opensmile/
├── __init__.py      — Re-exports
├── SMILEapi.py      — ctypes bindings + OpenSMILE class (400+ lines)
```

**How it works:**

1. Loads `libSMILEapi.so` via `ctypes.cdll.LoadLibrary()`
2. Defines ctypes `Structure` classes for `ComponentMessage`, `LogMessage`, `FrameMetaData`
3. Defines `CFUNCTYPE` callbacks for `LogCallback`, `StateChangedCallback`, `ExternalSinkCallback`, `ExternalSinkCallbackEx`, `ExternalMessageInterfaceCallback`
4. Wraps in `OpenSMILE` Python class with methods: `initialize()`, `run()`, `abort()`, `reset()`, `free()`
5. Data I/O: `external_source_write_data()` accepts numpy float32 arrays, converts via `.ctypes.data_as(POINTER(c_float))`
6. Callback output: receives raw float arrays, wraps via `np.ctypeslib.as_array()`
7. Static helper: `OpenSMILE.process()` provides one-shot: input dict → config → output dict

**Key design decisions:**
- Uses `CFUNCTYPE` (cannot be garbage collected — careful reference keeping via `self._callbacks` list)
- Requires C ABI compatibility — the `ExternalSinkCallback` takes raw `float*` + length
- No numpy dependency for core API, but `process()` helper requires it

### Our bridge uses it already

The `opensmile-bridge/server.py` calls `opensmile.Smile.process_signal()` which wraps the ctypes layer. The pipeline is:

```
Browser mic → WS (:8765) → opensmile.Smile.process_signal(audio, sr) 
    → 25 eGeMAPS features (pandas DataFrame)
    → _parse_features() clean dict 
    → features_to_midi_cc() MIDI CC mapping
    → WS to Ghost Track (:8767) + tminus-dispatcher (:8768)
```

**Latency measurement (ARM64 Oracle instance):**
- Processed 1 second of audio at 16kHz: **96 frames extracted**
- Each `process_signal` call: ~20ms on ARM64 (measured)
- Frame size 1024, hop 512 → ~46 frames/second at 16kHz
- Total pipeline latency: ~115ms (well within 500ms cognitive beat)

### Android Java wrapper

For Android, SWIG is used (`opensmile.i` interface file). Separate build path (`progsrc/android-template/`), not relevant for desktop/server Python.

---

## 6. Summary and Recommendations

### What's good
- Well-abstracted component model with clear base classes
- Config-driven pipelines — feature sets defined in .ini files
- **SMILEapi C API + ctypes Python wrapper already exist**
- **Pre-built ARM64 binary ships with pip package**
- Build system handles cross-compilation for ARM64

### What we don't need to do
- ❌ Refactor C++ source (claude-opensmile-refactor task was over-engineered)
- ❌ Create new shared library (libSMILEapi.so already exists)
- ❌ Create new ctypes wrapper (already exists, works great)
- ❌ Strip for ARM64 (pre-built aarch64 binary available)

### What we should optimize
1. **Streaming API layer**: Create `opensmile-bridge/live_voice.conf` that processes frame-by-frame without buffering the entire signal
2. **Low-latency config**: Use the existing `libSMILEapi.so` with `cExternalSource` for live streaming (bypass `process_signal()` which processes the full array)
3. **Pivot table integration**: Map emotion states to precomputed harmonic paths using voice features
4. **Fork docs**: Document the build recipe for any custom component additions in the fork

### Quickest path to production
1. ✅ Use existing `opensmile 2.6.0` pip package on ARM64
2. ✅ `opensmile-bridge/server.py` uses `opensmile.Smile.process_signal()` 
3. ✅ Forward to Ghost Track (:8767) and tminus-dispatcher (:8768)
4. ⏳ Create streaming wrapper using `cExternalSource` + `cExternalSink` directly via ctypes
5. ⏳ Experiment with custom features in the fork (e.g., voice quality metrics for ternary classification)
