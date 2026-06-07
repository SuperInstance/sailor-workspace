# Market Manifold — TDA Subsystem Specification

## Table of Contents

1. [Overview](#1-overview)
2. [1. Personality Fingerprinting of Stocks](#1-personality-fingerprinting-of-stocks)
   - [1.1 The Shape of a Stock](#11-the-shape-of-a-stock)
   - [1.2 Delay Embedding (Takens' Theorem)](#12-delay-embedding-takens-theorem)
   - [1.3 Sliding-Window Distance Kernel](#13-sliding-window-distance-kernel)
   - [1.4 Persistent Homology Pipeline](#14-persistent-homology-pipeline)
   - [1.5 The Personality Vector](#15-the-personality-vector)
   - [1.6 Rust Implementation Blueprint](#16-rust-implementation-blueprint)
3. [2. Betti Numbers → Market Conditions](#2-betti-numbers--market-conditions)
   - [2.1 Homological Algebra of Markets](#21-homological-algebra-of-markets)
   - [2.2 β₀ — Connectivity Regime](#22-β₀--connectivity-regime)
   - [2.3 β₁ — The Hole as Arbitrage / Rotation Cycle](#23-β₁--the-hole-as-arbitrage--rotation-cycle)
   - [2.4 β₂+ — Higher-Order Hedging Manifolds](#24-β₂--higher-order-hedging-manifolds)
   - [2.5 Persistence Landscape Transformation](#25-persistence-landscape-transformation)
   - [2.6 Rust Implementation Blueprint](#26-rust-implementation-blueprint)
4. [3. Symmetry Alert System](#3-symmetry-alert-system)
   - [3.1 Topological Equivalence of Stock Rooms](#31-topological-equivalence-of-stock-rooms)
   - [3.2 Distance Between Persistence Diagrams](#32-distance-between-persistence-diagrams)
   - [3.3 Stability Guarantees](#33-stability-guarantees)
   - [3.4 Alert Triggers and Thresholds](#34-alert-triggers-and-thresholds)
   - [3.5 Rust Implementation Blueprint](#35-rust-implementation-blueprint)
5. [A. Dependency Graph](#a-dependency-graph)
6. [B. References](#b-references)

---

## Overview

The TDA subsystem treats financial time series not as sequences of numbers but as **point clouds in a reconstructed state space**. By computing the persistent homology of these point clouds, we recover topological invariants — **Betti numbers** and **persistence diagrams** — that encode the "shape" of a stock's behavior. These invariants serve as:

- A **fingerprint** uniquely identifying a stock's behavioral personality
- A **market-conditions classifier** mapping homology to portfolio context
- A **comparison lens** for detecting when distinct assets evolve identical topological structure

All of the below is designed for direct implementation in Rust, relying only on:
- Linear algebra (nalgebra / faer)
- Graph building (petgraph — for Vietoris–Rips filtration edge generation)
- Sorting and hashing (std)
- Optional: BLAS acceleration for distance matrix construction (cblas / accelerate)

---

## 1. Personality Fingerprinting of Stocks

### 1.1 The Shape of a Stock

A stock's "personality" is the **distribution of topological features across scales** in its reconstructed state space. Two stocks may have identical mean/variance/skew but radically different shapes — one may exhibit periodic cycles (loops in H₁), another may be purely noisy (only H₀ components that merge immediately).

### 1.2 Delay Embedding (Takens' Theorem)

**Theorem (Takens, 1981):**  
For a generic smooth observation function \( f: M \to \mathbb{R} \) on a compact manifold \( M \) of dimension \( d \), the map:

\[
\Phi_{f,\tau}(x) = \big(f(x),\, f(x+\tau),\, f(x+2\tau),\, \dots,\, f(x+(m-1)\tau)\big)
\]

is an embedding of \( M \) into \( \mathbb{R}^m \) for any \( m > 2d \).

**Applied:** For a stock's log-return series \( r_1, r_2, \dots, r_T \), we reconstruct the state space:

\[
\mathbf{v}_t = (r_t,\, r_{t+\tau},\, r_{t+2\tau},\, \dots,\, r_{t+(m-1)\tau}) \in \mathbb{R}^m
\]

| Parameter | Recommendation | Rationale |
|-----------|---------------|-----------|
| \( \tau \) (lag) | First zero of the autocorrelation function (or first minimum of mutual information) | Avoids redundancy; maximizes information per coordinate |
| \( m \) (embedding dimension) | Cao's method or False Nearest Neighbors | Typically 5–15 for daily financial returns |

**Default fallback** when autocorrelation estimates are noisy:
- \( \tau = 1 \) (consecutive returns for daily data)
- \( m = \lfloor \sqrt{N} \rfloor \) (rule-of-thumb), clamped to 5–20

The point cloud \( P = \{\mathbf{v}_t\}_{t=1}^{T - (m-1)\tau} \subset \mathbb{R}^m \) is the **attractor** of the stock's dynamics.

### 1.3 Sliding-Window Distance Kernel

Not all time windows are equally informative. The **distance kernel** defines how two windows compare:

\[
d(\mathbf{v}_i, \mathbf{v}_j) = \sqrt{ 1 - \big| \rho(\mathbf{v}_i, \mathbf{v}_j) \big| }
\]

where \( \rho \) is the Pearson correlation coefficient between the \( m \)-length windows.

**Alternative kernels (configurable):**

| Kernel | Formula | Use Case |
|--------|---------|----------|
| Correlation distance | \( \sqrt{1 - \|\rho\|} \) | Captures co-movement shape, ignores magnitude |
| Euclidean (normalized) | \( \|\mathbf{v}_i - \mathbf{v}_j\|_2 \) after z-scoring each window | Captures magnitude + shape |
| Dynamic Time Warping (DTW) | Warped path distance | Handles phase shifts; expensive O(m²) per pair |

**Default:** Correlation distance — invariant to scale, focuses on relative movements.

### 1.4 Persistent Homology Pipeline

Given the point cloud \( P \subset \mathbb{R}^m \):

1. **Build distance matrix** \( D \in \mathbb{R}^{n \times n} \) where \( D_{ij} = d(\mathbf{v}_i, \mathbf{v}_j) \).
2. **Construct Vietoris–Rips filtration.**  
   The VR complex at scale \( \varepsilon \) includes all simplices whose pairwise distances are \( \leq \varepsilon \).
3. **Compute persistence** for dimensions \( H_0, H_1, H_2 \) (optionally \( H_3 \) for deep manifolds).

**Algorithm: Union-Find with Edge Insertion (for H₀ + H₁ only)**

A more efficient approach than full simplex enumeration:

```
fn rips_persistence(D: Matrix, max_dim: u8) -> PersistenceResult {
    // 1. Extract all edges (i, j, D[i][j]), sort by distance
    let edges: Vec<Edge> = sorted_edges(D);

    // 2. Union-Find for H₀ tracking (connected components)
    let mut uf = UnionFind::new(n);

    // 3. Incremental H₁ tracking via cycle basis
    //    Use the "pairing" algorithm from the Ripser approach:
    //    For each edge, if uf.find(i) != uf.find(j):
    //      union → this edge births or merges H₀ components
    //    else:
    //      this edge creates a 1-cycle → track its birth/death
    //      using a compressed pivot matrix

    // 4. For H₂+: enumerate triangles (2-simplices) and apply
    //    the boundary matrix reduction via standard algorithm
    //    (only for datasets n < 5000; above that, subsample)
}
```

**Primary reference algorithm:** **Ripser** (Bauer, 2019) — O(n³) worst-case but practical for n ≤ 2000. For large universes (n > 2000), use **subsampling** (select 500–1000 landmarks via maxmin sampling).

### 1.5 The Personality Vector

For each stock \( S \), the **personality vector** is:

\[
\Pi_S = \big( \text{PD}_0^{(S)},\ \text{PD}_1^{(S)},\ \text{PD}_2^{(S)},\ \text{Stats} \big)
\]

Where:
- \( \text{PD}_k^{(S)} \) is the persistence diagram of dimension \( k \)
- **Stats** is a vector of scalar fingerprint features:

| Feature | Definition | Meaning |
|---------|-----------|---------|
| \( \beta_0^\text{max} \) | Max \( \beta_0 \) (most fragmented) | Peak number of disconnected clusters |
| \( \beta_1^\text{max} \) | Max \( \beta_1 \) (most cyclic) | Peak number of independent 1-cycles |
| \( \beta_2^\text{max} \) | Max \( \beta_2 \) (most voided) | Peak number of 2-cavities |
| \( \bar{\beta}_1 \) | Mean persistent \( \beta_1 \) | Average cyclic complexity |
| \( D_1^\text{max} \) | Max death time in \( H_1 \) | Strongest cycle persistence |
| **Persistence entropy** | \( E = -\sum p_i \log p_i \) where \( p_i = (d_i-b_i)/\sum(d_j-b_j) \) | Complexity of topological landscape |
| **Wasserstein-1 norm** | \( \sum_i (d_i - b_i) \) | Total topological "energy" |
| **Cardinality** | Number of significant (d > 1.5b) features | How many distinct topological events |
| **Bottleneck bound** | Max persistence ratio \( (d-b)/b \) | Most extreme topological anomaly |

**Normalization:** All features are z-scored against a rolling universe baseline (e.g., S&P 500 over the same window). This yields a **relative personality fingerprint** invariant to the overall market regime.

### 1.6 Rust Implementation Blueprint

```rust
// File: tda/fingerprint.rs

/// Configuration for a single stock personality computation
#[derive(Clone, Debug)]
pub struct PersonalityConfig {
    pub lag: usize,              // Takens embedding τ
    pub embedding_dim: usize,    // Takens embedding m
    pub window_size: usize,      // Lookback (number of points in the point cloud)
    pub max_homology_dim: u8,    // Usually 2
    pub persistence_threshold: f64, // ε_max for filtration
    pub subsample: Option<usize>, // If Some, use maxmin sampling
}

/// The complete topological identity of a stock
#[derive(Clone, Debug)]
pub struct StockPersonality {
    pub ticker: String,
    pub timestamp: NaiveDateTime,
    pub config: PersonalityConfig,
    pub persistence_diagrams: Vec<PersistenceDiagram>, // indexed by H₀, H₁, H₂
    pub features: FingerprintFeatures,
    pub entropy: f64,
    pub norm: f64,
}

#[derive(Clone, Debug)]
pub struct PersistenceDiagram {
    pub dimension: u8,
    pub pairs: Vec<(f64, f64)>, // (birth, death) pairs
}

#[derive(Clone, Debug)]
pub struct FingerprintFeatures {
    pub beta0_max: usize,
    pub beta1_max: usize,
    pub beta2_max: usize,
    pub mean_beta1: f64,
    pub max_death_h1: f64,
    pub card_significant: usize,
    pub bottleneck_bound: f64,
}

impl StockPersonality {
    /// Compute the personality from a raw log-return slice.
    /// Returns Err if there is insufficient data.
    pub fn compute(
        ticker: &str,
        log_returns: &[f64],
        config: &PersonalityConfig,
        timestamp: NaiveDateTime,
    ) -> Result<Self, PersonalityError> {
        // 1. Build Takens embedding point cloud
        let point_cloud = delay_embed(log_returns, config.lag, config.embedding_dim)?;

        // 2. Optionally subsample
        let points = match config.subsample {
            Some(k) => maxmin_sample(&point_cloud, k),
            None => point_cloud,
        };

        // 3. Compute distance matrix
        let dist_matrix = distance_matrix(&points, Kernel::Correlation);

        // 4. Run persistent homology
        let diagrams = rips_persistence(&dist_matrix, config.max_homology_dim, config.persistence_threshold);

        // 5. Extract scalar features
        let features = FingerprintFeatures::extract(&diagrams);
        let entropy = persistence_entropy(&diagrams);
        let norm = wasserstein1_norm(&diagrams);

        Ok(Self {
            ticker: ticker.to_string(),
            timestamp,
            config: config.clone(),
            persistence_diagrams: diagrams,
            features,
            entropy,
            norm,
        })
    }
}
```

**Key Rust crates required:**

| Crate | Role |
|-------|------|
| `nalgebra` (or `faer`) | `DMatrix<f64>` for distance matrix + embedding |
| `petgraph` | `UnionFind` for incremental H₀ tracking |
| `rayon` | Parallelize over stock universe |
| `serde` | Serialize fingerprints for storage / comparison |
| `sprs` (sparse) | Sparse distance storage for large n |
| `approx` | Float comparison in tests |

---

## 2. Betti Numbers → Market Conditions

### 2.1 Homological Algebra of Markets

A **Betti number** \( \beta_k \) counts the number of independent \( k \)-dimensional holes in a simplicial complex.

In the persistent setting, we track how Betti numbers change as the scale parameter \( \varepsilon \) increases:

\[
\beta_k(\varepsilon) = \text{rank } H_k(\text{VR}_\varepsilon(P))
\]

Each Betti number speaks to a different structural property of the market.

### 2.2 β₀ — Connectivity Regime

**What it measures:** Number of connected components in the stock correlation manifold at scale \( \varepsilon \).

| β₀ pattern | Market condition | Portfolio signal |
|-----------|-----------------|------------------|
| **Low β₀**, fast decay to 1 | All stocks tightly correlated (risk-on/risk-off) | Diversification difficult; factor-hedge preferred |
| **High β₀**, slow decay | Fragmented market — sectors acting independently | Stock picking viable; sector rotation active |
| **Sudden β₀ spike** | Regime change — correlations breaking down | Reduce beta exposure; increase idiosyncratic bets |
| **Bimodal β₀** (two plateaus) | Two-cluster market (e.g., growth vs value divergence) | Long-short pair candidates across clusters |

**Quantitative regime classifier:**

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectivityRegime {
    SingleCluster,      // β₀ → 1 by ε < 0.3
    Fragmented,         // β₀ > 3 at ε = 0.5
    Bimodal,            // β₀ stays at 2 for ε ∈ [0.2, 0.6]
    Collapsing,         // β₀ spikes then suddenly drops
    Normal,             // Moderate structure
}

impl ConnectivityRegime {
    pub fn classify(births: &[(f64, f64)], epsilons: &[f64]) -> Self {
        let b0_at = |eps: f64| -> usize {
            // count components alive at this epsilon
            births.iter().filter(|(b, d)| *b <= eps && eps < *d).count()
        };

        // Heuristic rules over the epsilon grid
        if b0_at(0.3) <= 1 { return Self::SingleCluster; }
        if b0_at(0.5) >= 3 { return Self::Fragmented; }
        // ... more rules
    }
}
```

**Rust method:** The persistence diagram \( \text{PD}_0 \) gives birth/death pairs for each H₀ component. Count components alive at epsilon \( \varepsilon \) = number of pairs with birth ≤ ε < death (the final death = ∞ is virtual).

### 2.3 β₁ — The Hole as Arbitrage / Rotation Cycle

**What it measures:** Number of independent 1-cycles (loops) in the correlation manifold.

**The hole in portfolio context:**

A **hole** in \( H_1 \) means there exists a cycle of stocks \( S_1 \xrightarrow{\text{corr}} S_2 \xrightarrow{\text{corr}} \dots \xrightarrow{\text{corr}} S_k \xrightarrow{\text{corr}} S_1 \) where each edge has strong correlation but the cycle as a whole is not "filled in" by a simplex. In financial terms:

| H₁ feature | Interpretation | Actionable signal |
|------------|---------------|-------------------|
| **Long-lived 1-cycle** (high persistence) | Structural arbitrage pattern — a closed loop of correlations that doesn't decompose to a single factor | Triangular FX arbitrage; sector rotation cycle; missing cross-hedge |
| **Many short-lived 1-cycles** | Noise — ephemeral correlation patterns | No action; or market making opportunity |
| **β₁ increases suddenly** | New cyclic dependencies forming | Rebalance toward pairs that traverse the cycle |
| **β₁ collapses to 0** | Market becomes "tree-like" — all correlations hierarchical, no loops | Standard factor model works well |

**Concrete example — the FX triangle:**

Given USD, EUR, JPY:
- USD/EUR and EUR/JPY strongly correlated
- USD/JPY correlation weaker
- → A hole exists: the triangle contains a 1-cycle

**Portfolio implication:** A 3-asset portfolio with weights summing to zero along the cycle is a **topological arbitrage** — market-neutral in the cycle, exposed to the "hole."

**Mathematically precise:**  
A persistent 1-cycle detected at scale \( \varepsilon \) corresponds to a set of assets whose correlation submatrix has a **non-trivial kernel** at threshold \( \varepsilon \). The cycle boundary:

\[
\partial([S_1, S_2, S_3]) = [S_2, S_3] - [S_1, S_3] + [S_1, S_2]
\]

is the algebraic sum of pairwise edges. The hole is the difference between the space spanned by pairwise correlations and the space of triples.

**Implementation for cycle extraction:**

```rust
impl CycleExtractor {
    /// Given a persistent H₁ class that lives (b, d),
    /// extract the set of edges that form the representative cycle.
    pub fn extract_cycle(
        edges: &[Edge],
        birth_index: usize,
        death_index: usize,
    ) -> Vec<Edge> {
        // The Ripser-derived cycle basis gives us the "compressed"
        // representation. We expand it to the actual vertex set
        // using the pivot matrix.
    }

    /// Map cycle to a portfolio: weights that sum to zero along the cycle.
    pub fn cycle_portfolio(&self, cycle: &[Edge], correlation: &DMatrix<f64>) -> Vec<f64> {
        // Solve for weights w_i such that the portfolio variance
        // is minimized subject to: sum w_i = 0, correlation to cycle = 1
        // This yields a long-short portfolio exposed to the hole.
    }
}
```

### 2.4 β₂+ — Higher-Order Hedging Manifolds

| Homology | Feature | Market meaning |
|----------|---------|---------------|
| \( H_2 \) | 2-cavities (voids) | Triple correlations — three assets that pairwise covary but not jointly. Indicates 3-factor hedging gaps. |
| \( H_3+ \) | Higher voids | Complex derivative hedging structures. Rare in liquid markets. |

**Practical limit:** For most single-name equity universes (n ≤ 500), computing past H₂ is unreliable. Set `max_homology_dim = 2` by default.

### 2.5 Persistence Landscape Transformation

The persistence diagram \( \text{PD}_k \) is a multiset. For statistical work (regression, clustering), convert to **persistence landscape** \( \lambda_k(t) \):

\[
\lambda_k(t) = \max \{ \min(b, d - t, t - b) \mid (b, d) \in \text{PD}_k, b < t < d \}
\]

The landscape is **Lipschitz** (1-Lipschitz), **stable** (bottleneck distance ≤ L¹ distance between landscapes), and lives in a **Banach space** — ideal for feeding into downstream ML.

**Rust struct:**

```rust
/// A persistence landscape in L^p space.
/// λ_k(t) is the k-th landscape function, evaluated on a grid.
pub struct PersistenceLandscape {
    pub dimension: u8,
    pub grid: Vec<f64>,         // t values
    pub values: Vec<f64>,       // λ_k(t) for each t
}

impl PersistenceLandscape {
    /// From a persistence diagram, compute the landscape
    /// on a grid from t_min to t_max with n_points.
    pub fn from_diagram(pd: &PersistenceDiagram, t_min: f64, t_max: f64, n_points: usize) -> Self {
        let grid = linspace(t_min, t_max, n_points);
        let mut values = vec![0.0; n_points];

        for (b, d) in &pd.pairs {
            let peak = (d - b) / 2.0;
            let mid = (b + d) / 2.0;
            for (i, t) in grid.iter().enumerate() {
                let v = peak - (t - mid).abs();
                values[i] = values[i].max(v.max(0.0));
            }
        }

        Self { dimension: pd.dimension, grid, values }
    }
}
```

### 2.6 Rust Implementation Blueprint

```rust
// File: tda/market_conditions.rs

#[derive(Debug)]
pub struct MarketTopologySnapshot {
    pub timestamp: NaiveDateTime,
    pub tickers: Vec<String>,
    pub universe_size: usize,

    // Per-stock fingerprints
    pub personalities: Vec<StockPersonality>,

    // Aggregated market invariants
    pub connectivity_regime: ConnectivityRegime,
    pub betti_curves: BettiCurveBundle,
    pub cycles: Vec<TopologicalCycle>,
    pub voids: Vec<TopologicalVoid>,
}

#[derive(Debug)]
pub struct BettiCurveBundle {
    pub beta0: Vec<(f64, usize)>,  // (ε, β₀(ε))
    pub beta1: Vec<(f64, usize)>,
    pub beta2: Vec<(f64, usize)>,
}

#[derive(Debug)]
pub struct TopologicalCycle {
    pub assets: Vec<String>,
    pub birth_epsilon: f64,
    pub death_epsilon: f64,
    pub persistence: f64,
    pub portfolio_weights: Vec<f64>,  // long-short weights
}

#[derive(Debug)]
pub struct TopologicalVoid {
    pub assets: Vec<String>,
    pub birth_epsilon: f64,
    pub death_epsilon: f64,
}

impl MarketTopologySnapshot {
    /// Full pipeline: compute personalities for all tickers,
    /// then aggregate to market-level topology.
    pub fn snapshot(
        log_returns_matrix: HashMap<String, Vec<f64>>,
        config: &PersonalityConfig,
    ) -> Result<Self, MarketTopologyError> {
        let mut personalities = Vec::with_capacity(log_returns_matrix.len());
        for (ticker, returns) in &log_returns_matrix {
            let p = StockPersonality::compute(ticker, returns, config, Utc::now())?;
            personalities.push(p);
        }

        // Build universe-wide correlation manifold
        let corr_matrix = build_correlation_matrix(&log_returns_matrix);
        let dist_matrix = correlation_to_distance(&corr_matrix);
        let diagrams = rips_persistence(&dist_matrix, 2, 2.0);
        let betti_curves = compute_betti_curves(&diagrams, 0.0, 2.0, 100);

        let connectivity_regime = ConnectivityRegime::classify(
            &diagrams[0].pairs,
            &betti_curves.beta0.iter().map(|(e, _)| *e).collect::<Vec<_>>(),
        );

        let cycles = extract_cycles(&dist_matrix, &diagrams, &tickers);
        let voids = extract_voids(&diagrams, &tickers);

        Ok(Self {
            timestamp: Utc::now(),
            tickers: tickers.into_iter().cloned().collect(),
            universe_size: personalities.len(),
            personalities,
            connectivity_regime,
            betti_curves,
            cycles,
            voids,
        })
    }
}
```

---

## 3. Symmetry Alert System

### 3.1 Topological Equivalence of Stock Rooms

Two stocks exhibit **topological symmetry** when their persistence diagrams are close under a suitable metric. This means the reconstructed attractors have the same "shape" — identical cyclic structures, identical clustering dynamics — even if their raw price trajectories are unrelated.

**Why this matters:**
- Two stocks with the same topological shape react to the same latent factors
- If stock A's topology changes before stock B's → **leading indicator**
- If two unrelated stocks share a shape → hidden sector membership

### 3.2 Distance Between Persistence Diagrams

**Primary metric: 2-Wasserstein distance**

\[
W_2(\text{PD}_1, \text{PD}_2) =
\left( \inf_{\gamma: \text{PD}_1 \to \text{PD}_2} \sum_{x \in \text{PD}_1} \| x - \gamma(x) \|_2^2 \right)^{1/2}
\]

where the infimum is over bijections \( \gamma \) between the two multisets (with diagonal augmentation for unmatched points).

**Implementation: Hungarian algorithm**

Since each persistence diagram has at most ~100 points, the O(n³) Hungarian algorithm is acceptable:

```rust
fn wasserstein_2(
    dg1: &PersistenceDiagram,
    dg2: &PersistenceDiagram,
) -> f64 {
    // 1. Augment both diagrams with diagonal projections
    let mut p1 = dg1.pairs.clone();
    let mut p2 = dg2.pairs.clone();
    let n1 = p1.len();
    let n2 = p2.len();

    // Each point (b,d) projects to diagonal at ((b+d)/2, (b+d)/2)
    // Cost = Euclidean distance to diagonal
    let diag_proj = |(b, d): (f64, f64)| ((b + d) / 2.0, (b + d) / 2.0);

    // Pad the smaller diagram with diagonal projections to make equal cardinality
    while p1.len() < p2.len() {
        p1.push(diag_proj(p1[p1.len() % n1.max(1)]));
    }
    while p2.len() < p1.len() {
        p2.push(diag_proj(p2[p2.len() % n2.max(1)]));
    }

    // 2. Build n×n cost matrix (Euclidean²)
    let n = p1.len();
    let mut cost = DMatrix::<f64>::zeros(n, n);
    for i in 0..n {
        for j in 0..n {
            cost[(i, j)] = (p1[i].0 - p2[j].0).powi(2) + (p1[i].1 - p2[j].1).powi(2);
        }
    }

    // 3. Run Hungarian algorithm for minimum-cost perfect matching
    let matching = hungarian(&cost);
    matching.total_cost.sqrt()
}
```

**Lightweight alternative: Sliced Wasserstein**

\[
SW_2(\text{PD}_1, \text{PD}_2) = \frac{1}{L} \sum_{\ell=1}^L W_2(\pi_{\theta_\ell}(\text{PD}_1),\, \pi_{\theta_\ell}(\text{PD}_2))
\]

where \( \pi_\theta \) projects points onto the line through the origin at angle θ, then computes 1D Wasserstein (O(n log n)). Much faster for online monitoring.

### 3.3 Stability Guarantees

The bottleneck distance is **stable** under perturbations of the original function:

**Stability Theorem** (Cohen-Steiner et al., 2007):  
If two functions \( f, g: X \to \mathbb{R} \) are \( C^0 \)-close, their persistence diagrams are close:

\[
W_\infty(\text{Dgm}(f), \text{Dgm}(g)) \leq \|f - g\|_\infty
\]

**Applied to stock data:** If two stocks' return time series are close in \( L^\infty \), their topological fingerprints are close. The converse does not hold — stocks can have different returns but identical topological structure.

**For the Symmetry Alert:** This means we can set a threshold \( \delta \) on \( W_2 \) and start from:
- Strict: \( \delta = 0.05 \) (very close, probably same sector)
- Moderate: \( \delta = 0.15 \) (similar topology, worth investigating)
- Loose: \( \delta = 0.30 \) (rough similarity, drift detection)

### 3.4 Alert Triggers and Thresholds

**Online monitoring algorithm:**

```
For each pair of stocks (A, B) in the universe:
  1. Compute PD_A (sliding window of recent N days)
  2. Compute PD_B (same window)
  3. Compute D = W₂(PD_A, PD_B) [separately per homology dimension H₁]
  4. Compute D_rolling = EMA(D, α = 0.1)
  5. If D_rolling < δ and lasted > T_stable periods:
     → emit SymmetryAlert(A, B, D_rolling, homology_dim)
  6. If D_rolling was < δ and now > δ:
     → emit SymmetryBreakAlert(A, B, D_rolling, homology_dim)
```

**Parameter tuning:**

| Parameter | Default | Tuning |
|-----------|---------|--------|
| \( \delta \) (H₁) | 0.10 | Per-universe: median pairwise W₂ distance ÷ 3 |
| \( T_\text{stable} \) | 20 trading days | Short-term (5) for fast alerts, long-term (63) for confirmed structure |
| \( \alpha \) (EMA) | 0.1 | Higher α for faster reactions at cost of noise |
| Homology dims | \( H_1 \) | \( H_0 \) for regime similarity, \( H_2 \) for structural depth |

**Alert severity levels:**

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum AlertSeverity {
    /// W₂ < 0.05 — near-identical topological structure.
    /// Potentially redundant stocks or synthetic twins.
    Critical,

    /// 0.05 ≤ W₂ < 0.10 — strong symmetry. Sector peers likely.
    Important,

    /// 0.10 ≤ W₂ < 0.20 — moderate symmetry. Monitor for convergence.
    Informational,

    /// W₂ ≥ 0.20 — no alert.
    None,
}
```

### 3.5 Rust Implementation Blueprint

```rust
// File: tda/symmetry.rs

/// A detected topological symmetry between two stocks
#[derive(Debug, Clone, Serialize)]
pub struct SymmetryAlert {
    pub stock_a: String,
    pub stock_b: String,
    pub timestamp: NaiveDateTime,
    pub homology_dim: u8,
    pub wasserstein_distance: f64,
    pub severity: AlertSeverity,
    pub stable_since: NaiveDateTime, // when symmetry first crossed threshold
    pub is_break: bool,               // true if this is a *break* alert (symmetry lost)
}

/// Manages the rolling symmetry detection for the universe
pub struct SymmetryMonitor {
    /// Rolling history of personalities per stock
    history: HashMap<String, VecDeque<StockPersonality>>,
    /// Current EMA of pairwise W₂ distances
    pairwise_ema: HashMap<(String, String), f64>,
    /// How long each pair has been below threshold
    stable_duration: HashMap<(String, String), Duration>,
    config: SymmetryConfig,
}

#[derive(Debug, Clone)]
pub struct SymmetryConfig {
    pub wasserstein_threshold: f64,    // δ
    pub stable_min_days: u32,          // T_stable
    pub ema_alpha: f64,                // α
    pub homology_dims: Vec<u8>,        // which H_k to compare
    pub window_size: usize,            // lookback for personalities
    pub universe: Vec<String>,         // known tickers
}

impl SymmetryMonitor {
    pub fn new(config: SymmetryConfig) -> Self { /* ... */ }

    /// Feed in a new day of personalities for the whole universe.
    /// Returns any alerts triggered.
    pub fn ingest(
        &mut self,
        personalities: HashMap<String, StockPersonality>,
    ) -> Vec<SymmetryAlert> {
        let mut alerts = Vec::new();
        let now = Utc::now().naive_utc();

        // Update rolling history
        for (ticker, personality) in personalities {
            self.history.entry(ticker.clone())
                .or_default()
                .push_back(personality);
            // Trim to window_size
            while self.history[&ticker].len() > self.config.window_size {
                self.history.get_mut(&ticker).unwrap().pop_front();
            }
        }

        // Compute pairwise comparisons
        let tickers: Vec<&String> = self.history.keys().collect();
        for i in 0..tickers.len() {
            for j in (i+1)..tickers.len() {
                let a = tickers[i];
                let b = tickers[j];

                let latest_a = self.history[a].back().unwrap();
                let latest_b = self.history[b].back().unwrap();

                // Compute W₂ in each homology dimension
                for &dim in &self.config.homology_dims {
                    let pd_a = &latest_a.persistence_diagrams[dim as usize];
                    let pd_b = &latest_b.persistence_diagrams[dim as usize];
                    let w2 = wasserstein_2(pd_a, pd_b);

                    // Update EMA
                    let key = (a.clone(), b.clone());
                    let ema = self.pairwise_ema.entry(key.clone())
                        .and_modify(|e| *e = self.config.ema_alpha * w2 + (1.0 - self.config.ema_alpha) * *e)
                        .or_insert(w2);

                    // Check duration
                    let duration = self.stable_duration.entry(key.clone())
                        .and_modify(|d| if *ema < self.config.wasserstein_threshold {
                            *d += Duration::days(1);
                        } else {
                            *d = Duration::zero();
                        })
                        .or_insert(Duration::zero());

                    let is_symmetry = *ema < self.config.wasserstein_threshold
                        && duration.num_days() >= self.config.stable_min_days as i64;

                    if is_symmetry {
                        let severity = AlertSeverity::from_distance(w2);
                        alerts.push(SymmetryAlert {
                            stock_a: a.clone(),
                            stock_b: b.clone(),
                            timestamp: now,
                            homology_dim: dim,
                            wasserstein_distance: *ema,
                            severity,
                            stable_since: now - *duration,
                            is_break: false,
                        });
                    }
                }
            }
        }

        alerts
    }
}
```

**Scaling optimization — locality-sensitive hashing (LSH):**

For a universe of 1000+ stocks, O(n²) pairwise comparisons is too expensive. Use LSH on the **persistence landscapes**:

```rust
/// LSH hash for a persistence landscape — two stocks with similar
/// topological shapes hash to the same bucket with high probability.
fn landscape_lsh(landscape: &[f64], projection: &[f64]) -> u64 {
    // Randomized projection: sign(〈landscape, projection〉)
    let dot: f64 = landscape.iter().zip(projection).map(|(a, b)| a * b).sum();
    if dot >= 0.0 { 1 } else { 0 }
}

/// Candidate pairs = all pairs within the same LSH bucket.
/// Only compute W₂ for these candidates.
fn lsh_candidates<K: Hash>(
    personalities: &HashMap<K, &PersistenceLandscape>,
    num_hashes: usize,
    num_bands: usize,
) -> HashSet<(K, K)> {
    // Standard minhash LSH: split hash into bands, bucket by band signature,
    // return all pairs sharing a bucket in any band.
}
```

---

## A. Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                   tda/fingerprint.rs                  │
│  StockPersonality::compute()                          │
│  └─ delay_embed()                                     │
│  └─ maxmin_sample()                                   │
│  └─ distance_matrix()                                 │
│  └─ rips_persistence()   ─────────────────────────┐   │
└──────────────────────────────────────────────────┘   │
                                                       │
┌─────────────────────────────────────────────────────┐│
│               tda/persistence.rs                      ││
│  rips_persistence()                                   ││
│  ├─ edges_from_dist_matrix()                          ││
│  ├─ union_find_ph()          [H₀ + cycle detection]   ││
│  ├─ boundary_matrix_reduce() [H₂+]                    ││
│  └─ birth_death_pairs()                               ││
└───────────────────────────────────────────────────────┘│
                                                         │
┌──────────────────────────────────────────────────────┐ │
│  tda/market_conditions.rs                             │ │
│  MarketTopologySnapshot::snapshot()                    │ │
│  ├─ uses fingerprint                                  │ │
│  ├─ build_correlation_matrix()                        │ │
│  ├─ rips_persistence() (universe-level) ◄─────────────┘ │
│  ├─ compute_betti_curves()                             │   │
│  ├─ extract_cycles() / extract_voids()                │   │
│  └─ ConnectivityRegime::classify()                    │   │
└────────────────────────────────────────────────────┘   │
                                                         │
┌────────────────────────────────────────────────────┐    │
│  tda/symmetry.rs                                     │   │
│  SymmetryMonitor::ingest()                            │   │
│  ├─ wasserstein_2() (Hungarian / Sliced)              │   │
│  ├─ landscape_lsh()                                  │   │
│  └─ SymmetryAlert / SymmetryBreakAlert               │   │
└──────────────────────────────────────────────────────┘
```

---

## B. References

1. **Takens, F.** (1981). *Detecting strange attractors in turbulence.* Dynamical Systems and Turbulence, Lecture Notes in Mathematics, 898, 366–381.
2. **Cohen-Steiner, D., Edelsbrunner, H., & Harer, J.** (2007). *Stability of persistence diagrams.* Discrete & Computational Geometry, 37(1), 103–120.
3. **Bauer, U.** (2019). *Ripser: Efficient computation of Vietoris–Rips persistence barcodes.* Journal of Applied and Computational Topology, 5, 391–423.
4. **Bubenik, P.** (2015). *Statistical topological data analysis using persistence landscapes.* JMLR, 16(1), 77–102.
5. **Chazal, F., Cohen-Steiner, D., & Mérigot, Q.** (2009). *Geometric inference for measures with application to landmark-based distance.* SoCG 2009.
6. **Gidea, M. & Katz, Y.** (2018). *Topological data analysis of financial time series: Landscapes of crashes.* Physica A, 491, 820–834.
7. **Carlsson, G.** (2009). *Topology and data.* Bulletin of the American Mathematical Society, 46(2), 255–308.

---

*End of TDA Subsystem Specification*
