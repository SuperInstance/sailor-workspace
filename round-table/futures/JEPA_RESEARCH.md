# JEPA Research: Continuous Audio Representation for Decomposition + Generation

**Status**: Research Complete  
**Date**: 2026-06-09  
**Author**: Subagent (Research)  
**Audience**: Oracle2, Kimi Code, Claude Code, Forgemaster  

---

## 1. What Is JEPA?

**Joint Embedding Predictive Architecture (JEPA)** is a self-supervised learning paradigm introduced by Yann LeCun's group at Meta AI (FAIR). It learns representations by predicting in *embedding space* rather than in pixel or raw-signal space. Unlike generative models (MAE, diffusion) that reconstruct the input signal, JEPA uses an encoder to produce a latent representation of the input, then trains a predictor to estimate the representations of **masked or future regions** from **visible context** — all within the embedding manifold. The key insight: forcing the predictor to operate in abstract latent space prevents it from wasting capacity on pixel-level details and instead drives it toward **semantic** representations. JEPA has been demonstrated for images (I-JEPA, CVPR 2023) and video (V-JEPA, 2024), achieving strong performance on classification, object counting, and depth estimation with a frozen backbone trained purely on unlabeled data.

The architecture has three components: (1) an **encoder** (typically a Vision Transformer) that maps input into patch-level embeddings, (2) a **predictor** that takes visible context embeddings and predicts the embeddings of masked targets, and (3) a **target encoder** (EMA-updated from the encoder) that produces the ground-truth target embeddings for the loss. Crucially, the loss is computed in embedding space — typically a smooth L1 or cosine-similarity loss between predicted and target embeddings. This design naturally supports **multi-scale** and **multi-time-horizon** prediction: you can predict representations at different spatial/temporal granularities, each supervised by the corresponding target embeddings. The result is a representation that captures abstract, semantic properties of the signal rather than low-level reconstruction artifacts.

---

## 2. Audio JEPA: The Key Finding

### Audio-JEPA (Tuncay et al., ICME 2025 — arXiv:2507.02915)

**Audio-JEPA** is the first direct application of the JEPA paradigm to audio. It was published in June 2025 (just 1 year ago). Key facts:

| Property | Value |
|----------|-------|
| **Architecture** | Vision Transformer (ViT) on mel-spectrograms |
| **Input** | Mel-spectrogram patches (10s audio @ 32kHz) |
| **Masking** | Random patch masking (like I-JEPA) |
| **Training data** | Unlabeled AudioSet clips |
| **Evaluation** | X-ARES suite (speech, music, environmental sounds) |
| **Performance** | Comparable to wav2vec 2.0 and data2vec |
| **Data efficiency** | Uses < 1/5 training data of wav2vec 2.0 |
| **Code/weights** | "Will be released" (as of June 2025) |

**Critical implication**: Audio-JEPA proves the JEPA paradigm transfers to audio with a simple ViT backbone operating on spectrograms. This means our **pipeline can treat audio as a 2D image-like signal** (spectrogram) and use the same V-JEPA codebase with minimal modification.

### Why Not a Pretrained Audio JEPA Today?

The Audio-JEPA paper says code and checkpoints "will be released." As of June 2026, we should check if they're available. If not, the path is clear: **we can train our own** using the V-JEPA codebase on spectrograms.

---

## 3. How JEPA Applies to Our Audio Pipeline

### Current Pipeline

```
┌──────────┐    ┌──────────┐    ┌─────────────┐    ┌──────────┐
│ Raw Audio│───►│ OpenSMILE│───►│ 25 eGeMAPS  │───►│  Ternary  │
│  (16kHz) │    │          │    │  features   │    │  States   │
└──────────┘    └──────────┘    └─────────────┘    └──────────┘
     │
     ▼
┌──────────┐    ┌──────────┐    ┌─────────────┐
│ Whisper  │───►│  Word    │───►│  Transcription │
│ (ASR)   │    │  tokens  │    │  + timestamps  │
└──────────┘    └──────────┘    └─────────────┘
```

**OpenSMILE + eGeMAPS**: 25 hand-crafted features per frame (pitch, jitter, shimmer, MFCCs, etc.). These are **discrete, pre-defined, finite**. They capture known acoustic correlates but miss anything not in the feature set.

**What JEPA Adds**: A **continuous embedding** of the entire audio scene — not just speech features. The embedding space (~384–1024 dims depending on ViT variant) captures:
- **Prosody**: Pitch contour, rhythm, emphasis
- **Timbre**: Voice quality, speaker identity, vocal texture
- **Emotional valence**: Aggressive, calm, excited, sad — not as labels but as continuous directions in embedding space
- **Acoustic scene**: Background noise, music, room acoustics
- **Temporal dynamics**: How the above evolve over time

---

## 4. Integration Architecture

### Recommendation: JEPA as COMPLEMENT, not replacement

```
                     ┌─────────────────────────────────┐
                     │         JEPA Encoder             │
                     │  (ViT on mel-spectrograms)       │
                     │  Output: continuous embedding    │
                     │  per time-step (patch-level)     │
                     └──────────┬──────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────┐
│                  Fusion Tensor                            │
│  ┌──────────────┐  ┌─────────┐  ┌────────────────┐      │
│  │ JEPA Embed   │  │ eGeMAPS │  │ Whisper Tokens │      │
│  │ (continuous) │  │ (25 feat)│  │ (discrete)    │      │
│  │  d=384-1024  │  │  d=25   │  │  d=vocab      │      │
│  └──────────────┘  └─────────┘  └────────────────┘      │
│              │          │              │                 │
│              ▼          ▼              ▼                 │
│         ┌───────────────────────────────────┐           │
│         │   Ghost Track — Ternary State      │           │
│         │   Transition (decomposed from      │           │
│         │   fused representation)            │           │
│         └───────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Why Complement, Not Replacement

| Criterion | OpenSMILE (eGeMAPS) | JEPA Embedding | Verdict |
|-----------|---------------------|----------------|---------|
| **Interpretability** | Each feature has a name | Black-box vector | Keep OpenSMILE |
| **Speed** | Real-time on CPU | Needs GPU | Keep OpenSMILE for real-time |
| **Prosody coverage** | 25 hand-picked features | Full spectral content | JEPA adds missing dims |
| **Emotion** | Jitter/shimmer correlates | Directional embedding | JEPA superior |
| **Speaker ID** | MFCCs approximate | Strongly encoded | JEPA superior |
| **Background/Scene** | Not captured | Captured | JEPA unique |
| **Decomposability** | Ternary-compatible | Partially analyzable | Hybrid approach |

### The OpenSMILE Trap: Why We Need JEPA

OpenSMILE's eGeMAPS features are **incomplete by design**. They capture the 25 most-studied acoustic correlates in the literature. But there are acoustic phenomena (vocal fry, breathy resonance, subtle emotional shifts, background interference) that fall through the cracks. JEPA's self-supervised embedding **doesn't have this blind spot** — if it's in the audio, it's in the embedding.

---

## 5. Analyzable vs. Holistic Dimensions

This is the core research question. A JEPA embedding of dimension d=768 (ViT-L) contains a mix of:

### Analyzable Dimensions (decomposable into ternary vectors)

Based on the I-JEPA/V-JEPA literature and the Audio-JEPA paper, we hypothesize these dimensions **can** be extracted:
- **Temporal position**: Embeddings near each other in time have correlated structure
- **Pitch/energy correlates**: Some dimensions consistently correlate with F0 and loudness (probe-able with a linear head)
- **Phonetic content**: Certain dimensions align with phonetic categories (place/manner of articulation)
- **Speaker identity**: Cluster structure in embedding space separates speakers

**Method to find them**: Train lightweight linear probes on labeled subsets (e.g., annotate 100 patches with "high energy / medium / low"). If a probe achieves >80% accuracy with a single embedding dimension → it's analyzable.

### Holistic Dimensions (best left as continuous signal)

These **resist** decomposition into discrete ternary states:
- **Emotional valence**: A "warm" voice vs a "cold" voice is a continuous blend, not a discrete state
- **Timbre/texture**: "Breathy" quality exists on a spectrum
- **Acoustic background**: Room reverb, ambient noise — ternary quantization destroys information
- **Prosodic contour**: The shape of a pitch glide matters more than its discrete level

### Recommendation: Dual Track

```
┌────────────┐    Analyzable Dims    ┌──────────────────┐
│  JEPA      │──────────────────────►│   Ternary State   │
│  Embedding │                       │   Decomposition   │
│  (768-dim) │                       └──────────────────┘
│            │
│            │    Holistic Dims      ┌──────────────────┐
│            │──────────────────────►│   Continuous CC   │
│            │                       │   Automation Track│
└────────────┘                       └──────────────────┘
```

This mirrors how DAWs handle expression: some parameters snap to grid (notes), others are continuous curves (modulation, aftertouch).

---

## 6. Generative Use: Rendering Intentions Into Outputs

This is the most exciting application. Here's the architecture:

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Ternary Target   │────►│ Embedding Decoder   │────►│ Waveform     │
│ State            │     │ (learned mapping    │     │ Generator    │
│ (from Ghost Track)    │  from ternary → JEPA │     │ (HiFi-GAN)   │
│                  │     │  embedding space)   │     │              │
└──────────────────┘     └─────────────────────┘     └──────────────┘
```

### How It Works

1. **During analysis**: JEPA encodes speech → we extract the embedding at each time-step
2. **We build a mapping**: `f: ternary_state → JEPA_embedding` using a lightweight neural network (MLP or small transformer)
3. **During generation**: Ghost Track produces a ternary target state → we use `f` to predict the corresponding JEPA embedding → we decode that embedding into audio using a vocoder or diffusion decoder

### Key Property: Continuous Interpolation

Because JEPA embeddings live in a continuous space, we can interpolate between states:

```
ternary: [1,0,0] (aggressive) ──┐
                                ├──► embedding = lerp(e_aggro, e_calm, α)
ternary: [0,0,1] (calm)      ──┘
```

Where `α` controls the blend. This enables **fine-grained emotional rendering** that discrete state machines cannot express.

### Relationship to Audio-JEPA's Decoder

The Audio-JEPA paper mentions training a **conditional diffusion model** to decode predicted embeddings back to mel-spectrograms (then to audio via Griffin-Lim or a neural vocoder). We would need:
- A **predictor → decoder** path (JEPA already has the predictor)
- A **diffusion decoder** or **HiFi-GAN** for waveform synthesis

---

## 7. What Changes When We Have Continuous Reading + Discrete Ternary

### Before JEPA
```
Audio ──► eGeMAPS ──► Ternary states ──► MIDI lead sheet
           (25 discrete features)
```

All expression must be quantized into ternary states. Nuance is lost.

### After JEPA
```
Audio ──► JEPA Embedding ──►┌─► Analyzable dims ─► Ternary states ──► MIDI lead sheet
              │             │
          Continuous        └─► Holistic dims ─────► CC automation tracks
           embedding                                    │
              │                                         ▼
              └───────────────────► Full embedding stored in MIDI meta-events
```

### Concrete Changes to Our Pipeline

1. **MIDI format expansion**: 
   - Standard note events (from ternary decomposition)  
   - `CONTROL CHANGE` lanes for continuous JEPA dimensions (emotional valence, timbre)
   - `SYSEX` or meta-events storing the raw embedding for perfect reconstruction

2. **Ghost Track enhancement**:
   - Currently: ternary transitions only
   - Enhanced: ternary transitions **plus** continuous guidance vectors from JEPA

3. **Real-time vs. Offline modes**:
   - Offline (podcast processing): Full JEPA encoding, full embedding saved
   - Real-time (live performance): OpenSMILE for instant features, JEPA for periodic refinement

4. **New probe training requirement**:
   - We need labeled data to train probes that identify analyzable dimensions
   - 1 hour of annotated podcast audio could be enough for a first pass

---

## 8. Practical Implementation on ARM64

### ARM64 Compatibility Assessment

| Component | ARM64 Status | Notes |
|-----------|-------------|-------|
| **V-JEPA codebase** (PyTorch) | ✅ Yes | Pure PyTorch, no CUDA dependency required |
| **ViT-L/16 (300M params)** | ⚠️ Runs but slow | ~4-8x slower than GPU; 300M params = ~1.2GB RAM |
| **ViT-H/16 (632M params)** | ⚠️ Heavy | ~2.5GB RAM, may need swap on 8GB devices |
| **Audio-JEPA (ViT-B/S)** | ✅ Best bet | Smaller variant likely 86-110M params |
| **PyTorch for ARM64** | ✅ Yes | Install via `pip3 install torch --index-url https://download.pytorch.org/whl/cpu` |
| **torchaudio** | ✅ Yes | For spectrogram extraction |
| **HiFi-GAN decoder** | ⚠️ Moderate | ~50M params, runs on ARM64 |

### Installation Path

```bash
# Step 1: PyTorch for ARM64
pip3 install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Step 2: Clone V-JEPA codebase
git clone https://github.com/facebookresearch/jepa.git
cd jepa

# Step 3: Download pretrained checkpoint (ViT-L for testing)
wget https://dl.fbaipublicfiles.com/jepa/vitl16/vitl16.pth.tar

# Step 4: Convert audio to spectrograms and run through V-JEPA
# (Adapt the video processing pipeline to accept 2D spectrograms)
```

### Expected Throughput on ARM64

| Setup | Throughput | Use Case |
|-------|-----------|----------|
| ViT-S/16 (22M params) | ~50 patches/sec | Real-time constrained |
| ViT-B/16 (86M params) | ~15 patches/sec | Near real-time |
| ViT-L/16 (300M params) | ~4 patches/sec | Offline batch |
| ViT-H/16 (632M params) | ~1-2 patches/sec | Research only on ARM64 |

For a podcast episode (60 min = 3600 sec), processing at 8 patches/second:
- ViT-S: ~12 min total
- ViT-B: ~40 min total
- ViT-L: ~15 hours (impractical on ARM64 alone)

**Recommendation**: Use ViT-B or ViT-S for ARM64, scale to GPU server for ViT-L/H.

---

## 9. Practical Next Steps

### Phase 0: Verify Audio-JEPA Checkpoints (Now)
- [ ] Check if Audio-JEPA weights are released (arXiv:2507.02915)
  - Watch https://github.com/..../audio-jepa (may have different repo name)
  - Alternative: Check HuggingFace for `audio-jepa` or `tuncay/audio-jepa`
- [ ] If not released, we can replicate using V-JEPA codebase on spectrograms

### Phase 1: Adapt V-JEPA to Spectrograms (Week 1-2)
- [ ] Install PyTorch + torchaudio on ARM64
- [ ] Clone facebookresearch/jepa 
- [ ] Write a spectrogram-to-video-frame adapter (treat mel-spectrogram as grayscale image)
- [ ] Run V-JEPA on 10-second podcast clips
- [ ] Visualize the embedding: PCA/UMAP projection + t-SNE on labeled segments
- [ ] **Graphing**: Plot embedding trajectories over time; color by eGeMAPS-derived ternary state to see structure

### Phase 2: Probe Training (Week 2-3)
- [ ] Extract JEPA embeddings for 100+ podcast 10-second clips
- [ ] Create ground-truth labels:
  - Ternary state (from Ghost Track / OpenSMILE)
  - Perceived emotion (self-annotate: calm/excited/aggressive/sad)
  - Speaker identity
- [ ] Train linear probes; identify analyzable vs. holistic dimensions
- [ ] Produce a **Dimension Map**: "Dimension 42 = correlates with energy, dimension 137 = correlates with breathiness"

### Phase 3: Embedding Storage (Week 3-4)
- [ ] Extend MIDI lead-sheet format to store JEPA embeddings:
  - Meta-events for full embedding per time-slice
  - CC automation lanes for top-K analyzable dimensions
- [ ] Verify MIDI file size is manageable (< 50MB for 1-hour podcast)
- [ ] Implement in the existing pipeline (round-table/futures/REVERSE_ACTUALIZATION.md)

### Phase 4: Generative Decoder (Month 2)
- [ ] Train MLP to map ternary state ↔ JEPA embedding
- [ ] Integrate lightweight vocoder (HiFi-GAN or MelGAN)
- [ ] Test: "Given ternary state [1,0,0] at time T, generate audio that sounds aggressive"
- [ ] Test: "Interpolate between [1,0,0] and [0,0,1] over 5 seconds → does emotion smoothly transition?"

### Phase 5: Fuse into Pipeline (Month 2-3)
- [ ] Add JEPA as optional "depth" track alongside OpenSMILE
- [ ] Implement cascading logic: use OpenSMILE for instant features, JEPA for refinement
- [ ] Benchmark accuracy: does JEPA-enhanced pipeline produce better ternary states?
- [ ] Write the "JEPA track" export to Ardour-compatible CC lanes

---

## 10. Model Sizes and Compute Budget

| Model | Params | RAM | ARM64 Speed | Disk (checkpoint) |
|-------|--------|-----|-------------|-------------------|
| ViT-T/16 | 5.7M | ~30MB | Very fast | ~23MB |
| ViT-S/16 | 22M | ~90MB | ~50 patches/s | ~88MB |
| ViT-B/16 | 86M | ~350MB | ~15 patches/s | ~344MB |
| ViT-L/16 | 307M | ~1.2GB | ~4 patches/s | ~1.2GB |
| ViT-H/16 | 632M | ~2.5GB | ~1-2 patches/s | ~2.5GB |

**ARM64 cutoff**: ViT-B (86M) is the sweet spot for our hardware. For production, ViT-L on GPU.

---

## 11. Open Questions (For Further Research)

1. **Audio-JEPA code release**: Has anyone replicated Audio-JEPA on GitHub since June 2025? Search for "audio-jepa" on GitHub.

2. **Temporal resolution**: How fine-grained are JEPA patch embeddings? V-JEPA uses 2x16x16 patches in video (2 frames × 16×16 pixels). For spectrograms, what's the equivalent? 1 patch = X ms of audio?

3. **EMA target update**: JEPA uses a momentum encoder (EMA of encoder weights) for the target. Does this slow training convergence on small datasets compared to simpler contrastive methods?

4. **VICReg alternative**: VICReg (Variance-Invariance-Covariance Regularization) is another LeCun-group method that explicitly decorrelates embedding dimensions. Could VICReg produce more "analyzable" dimensions (since it enforces covariance regularization)?

5. **Multi-granularity**: JEPA can predict at multiple scales simultaneously. Could we predict at the ternary-state granularity directly, bypassing the decomposition step?

---

## 12. Key References

- **I-JEPA**: Assran et al., "Self-Supervised Learning from Images with a Joint-Embedding Predictive Architecture," CVPR 2023. arXiv:2301.08243
- **V-JEPA**: Bardes et al., "Revisiting Feature Prediction for Learning Visual Representations from Video," 2024. 
  - Code: https://github.com/facebookresearch/jepa
- **Audio-JEPA**: Tuncay et al., "Joint-Embedding Predictive Architecture for Audio Representation Learning," ICME 2025. arXiv:2507.02915
- **VICReg**: Bardes et al., "VICReg: Variance-Invariance-Covariance Regularization for Self-Supervised Learning," ICLR 2022.
- **eGeMAPS**: Eyben et al., "The Geneva Minimalistic Acoustic Parameter Set (GeMAPS) for Voice Research and Affective Computing," IEEE Trans. Affective Computing, 2016.
- **X-ARES**: Darefsky et al., "X-ARES: A Cross-domain Audio Representation Evaluation Suite," 2024.

---

## 13. Summary Verdict

| Question | Answer |
|----------|--------|
| **Does JEPA work for audio?** | ✅ Yes — Audio-JEPA (2025) proves it. |
| **Pretrained checkpoint available?** | ⚠️ Promised but needs verification. Can self-train using V-JEPA codebase. |
| **ARM64 compatible?** | ✅ Yes — ViT-B (86M params) is the sweet spot. |
| **Replacement for OpenSMILE?** | ❌ No — OpenSMILE is faster and interpretable. |
| **Complement?** | ✅ Yes — JEPA fills the blind spots (timbre, emotion, scene). |
| **Analyzable dimensions exist?** | ✅ Yes — linear probing can identify them. |
| **Holistic dimensions worth keeping?** | ✅ Yes — emotion and timbre resist quantization. |
| **Generative rendering feasible?** | ✅ Yes — train MLP to map ternary ↔ JEPA embedding, decode with vocoder. |
| **Biggest win?** | Continuous emotion/timbre control that current discrete pipeline lacks. |

**Final recommendation**: Implement JEPA as a **complementary continuous embedding layer** that feeds both the ternary decomposition and the generative decoder. Build the ARM64 prototype with ViT-B. Migrate to GPU for production.
