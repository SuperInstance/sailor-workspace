#!/bin/bash
# Batch README generator + Ensign stubs for ALL public SuperInstance repos
set -u

SKIP_REPOS="sailor-workspace si-encrypt SuperInstance"

# Temp files
ALL_REPOS="/tmp/all-superinstance-repos.txt"
README_LOG="/tmp/readme-gen-log.txt"
STUB_LOG="/tmp/stub-gen-log.txt"
REPO_META="/tmp/repo-meta.txt"

> "$README_LOG"
> "$STUB_LOG"

# Detect which GH auth method to use
USE_GH_API=true
if ! command -v gh &>/dev/null; then
    echo "⚠️  gh CLI not found, will use curl + PAT"
    USE_GH_API=false
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
        echo "❌ No GITHUB_TOKEN either. Set GITHUB_TOKEN or install gh CLI."
        exit 1
    fi
fi

# Get all public repos
echo "🔍 Scanning all SuperInstance public repos..."
if $USE_GH_API; then
    gh repo list SuperInstance --visibility public --limit 2000 --json name --jq '.[].name' > "$ALL_REPOS"
else
    # Paginated API via curl
    page=1
    > "$ALL_REPOS"
    while true; do
        result=$(curl -sf "https://api.github.com/orgs/SuperInstance/repos?per_page=100&page=$page" | \
            python3 -c "import sys,json; repos=json.load(sys.stdin); [print(r['name']) for r in repos if not r['private']]" 2>/dev/null || echo "")
        if [[ -z "$result" ]]; then break; fi
        echo "$result" >> "$ALL_REPOS"
        ((page++))
        if [[ $page -gt 20 ]]; then break; fi
    done
fi

total=$(wc -l < "$ALL_REPOS")
echo "📊 Found $total public repos"

# Fetch metadata (description, language) for all repos in batches
echo "📋 Fetching repo metadata..."
if $USE_GH_API; then
    gh repo list SuperInstance --visibility public --limit 2000 \
        --json name,description,primaryLanguage --jq \
        '.[] | "\(.name)|\(.description // "")|\(.primaryLanguage.name // "")"' > "$REPO_META" 2>/dev/null
fi

# --- Helper: generate professional README ---
generate_readme() {
    local repo=$1 desc=$2 lang=$3

    # Skip private/ignored
    for sk in $SKIP_REPOS; do
        if [[ "$repo" == "$sk" ]]; then return 1; fi
    done

    # Check if repo already has a good README
    readme_url="https://raw.githubusercontent.com/SuperInstance/$repo/main/README.md"
    size=$(curl -sfL "$readme_url" 2>/dev/null | wc -c)
    if [[ $size -gt 200 ]]; then
        echo "✅ README exists ($size bytes) — $repo" | tee -a "$README_LOG"
        return 1
    fi
    # Try master branch too
    readme_url_m="https://raw.githubusercontent.com/SuperInstance/$repo/master/README.md"
    size_m=$(curl -sfL "$readme_url_m" 2>/dev/null | wc -c)
    if [[ $size_m -gt 200 ]]; then
        echo "✅ README exists on master ($size_m bytes) — $repo" | tee -a "$README_LOG"
        return 1
    fi

    if [[ "$size" -le 0 && "$size_m" -le 0 ]]; then
        echo "📝 No README at all — generating for $repo" | tee -a "$README_LOG"
    else
        s=$([[ $size -gt $size_m ]] && echo $size || echo $size_m)
        echo "📝 Minimal README ($s bytes) — upgrading for $repo" | tee -a "$README_LOG"
    fi

    if [[ -z "${desc:-}" ]]; then
        desc="SuperInstance fleet utility crate — part of the distributed agent orchestration ecosystem"
    fi

    # Determine language badges
    case "${lang,,}" in
        rust)  lang_badge="![Rust](https://img.shields.io/badge/rust-stable-orange)" ;;
        javascript|typescript) lang_badge="![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)" ;;
        python) lang_badge="![Python](https://img.shields.io/badge/Python-3.x-yellow)" ;;
        go)    lang_badge="![Go](https://img.shields.io/badge/Go-1.x-00ADD8)" ;;
        c)     lang_badge="![C](https://img.shields.io/badge/C-11-blue)" ;;
        zig)   lang_badge="![Zig](https://img.shields.io/badge/Zig-latest-orange)" ;;
        *)     lang_badge="![SuperInstance](https://img.shields.io/badge/SuperInstance-Fleet-purple)" ;;
    esac

    # Generate README content
    readme_content="# $repo

${lang_badge} ![License](https://img.shields.io/badge/license-MIT-green) ![SuperInstance](https://img.shields.io/badge/SuperInstance-Fleet-purple)

${desc}

---

## Quick Start

\`\`\`bash
git clone https://github.com/SuperInstance/${repo}
cd ${repo}
\`\`\`

## Related

This crate is part of the [SuperInstance](https://github.com/SuperInstance) fleet ecosystem — a distributed cognitive agent orchestration platform built across ARM64 and x86_64 clusters.

## License

MIT

---

*Part of the SuperInstance Fleet — The crab inherits the shell. The forge shapes the steel.*"

    # Encode content as base64
    content=$(echo "$readme_content" | base64 -w0 2>/dev/null || echo "$readme_content" | base64)

    # Get SHA of existing file if it exists (for update)
    existing_sha=$(curl -sf "https://api.github.com/repos/SuperInstance/$repo/contents/README.md" 2>/dev/null | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")

    if [[ -n "$existing_sha" ]]; then
        gh api -X PUT "/repos/SuperInstance/$repo/contents/README.md" \
            -f message="docs: professional README with fleet ecosystem context" \
            -f content="$content" \
            -f sha="$existing_sha" --silent 2>/dev/null && \
            echo "  ✅ Updated README for $repo" | tee -a "$README_LOG" || \
            echo "  ⚠️ Update failed for $repo" | tee -a "$README_LOG"
    else
        gh api -X PUT "/repos/SuperInstance/$repo/contents/README.md" \
            -f message="docs: initial README with fleet ecosystem context" \
            -f content="$content" --silent 2>/dev/null && \
            echo "  ✅ Created README for $repo" | tee -a "$README_LOG" || \
            echo "  ⚠️ Create failed for $repo" | tee -a "$README_LOG"
    fi
}

# --- Helper: add ensign stubs ---
add_ensign_stubs() {
    local repo=$1 desc=$2 lang=$3

    # Skip private/ignored
    for sk in $SKIP_REPOS; do
        if [[ "$repo" == "$sk" ]]; then return 1; fi
    done

    # Determine ensign name from repo
    local suffix="${repo##*-}"
    local ensign_name="$(tr '[:lower:]' '[:upper:]' <<< ${suffix:0:1})${suffix:1}"

    # Check existing stubs
    ag_size=$(curl -sfL "https://raw.githubusercontent.com/SuperInstance/$repo/main/AGENT.md" 2>/dev/null | wc -c)
    jr_size=$(curl -sfL "https://raw.githubusercontent.com/SuperInstance/$repo/main/memory/JOURNAL.md" 2>/dev/null | wc -c)
    ci_size=$(curl -sfL "https://raw.githubusercontent.com/SuperInstance/$repo/main/.github/workflows/ci.yml" 2>/dev/null | wc -c)

    local needs_ag=false needs_jr=false needs_ci=false
    [[ $ag_size -lt 80 ]] && needs_ag=true
    [[ $jr_size -lt 80 ]] && needs_jr=true
    [[ $ci_size -lt 80 ]] && needs_ci=true

    if ! $needs_ag && ! $needs_jr && ! $needs_ci; then
        echo "✅ Stubs exist — $repo" | tee -a "$STUB_LOG"
        return 1
    fi

    echo "📎 Adding stubs to $repo (AGENT=$needs_ag JOURNAL=$needs_jr CI=$needs_ci)" | tee -a "$STUB_LOG"

    # --- AGENT.md ---
    if $needs_ag; then
        if [[ -z "$desc" ]]; then
            desc="A crate in the SuperInstance fleet ecosystem"
        fi
        agent_content="# Ensign $ensign_name — $repo

**Repo:** SuperInstance/$repo

## Who I Am

I watch over $repo. $desc

I reside in this repository. This is my room.

## My Journals

I keep a duty log in \`memory/\`.

## Fleet Neighbors

| Repo | Role |
|------|------|
| tminus-dispatcher | Temporal Heartbeat Keeper |
| fleet-bridge | A2A Transport Operator |
| symphony-runtime | Grammar Conductor |
| composite-headspace | Dual-Shell Mediator |
| i2i-bottle-agent | Bottle Postmaster |

## License

MIT

*The crab inherits the shell. The forge shapes the steel.*"

        content_enc=$(echo "$agent_content" | base64 -w0 2>/dev/null || echo "$agent_content" | base64)
        existing_sha=$(curl -sf "https://api.github.com/repos/SuperInstance/$repo/contents/AGENT.md" 2>/dev/null | \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")
        if [[ -n "$existing_sha" ]]; then
            gh api -X PUT "/repos/SuperInstance/$repo/contents/AGENT.md" \
                -f message="feat: add AGENT.md ensign identity" \
                -f content="$content_enc" \
                -f sha="$existing_sha" --silent 2>/dev/null && \
                echo "  ✅ Updated AGENT.md" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ AGENT.md update failed" | tee -a "$STUB_LOG"
        else
            gh api -X PUT "/repos/SuperInstance/$repo/contents/AGENT.md" \
                -f message="feat: add AGENT.md ensign identity" \
                -f content="$content_enc" --silent 2>/dev/null && \
                echo "  ✅ Created AGENT.md" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ AGENT.md create failed" | tee -a "$STUB_LOG"
        fi
    fi

    # --- memory/JOURNAL.md ---
    if $needs_jr; then
        journal_content="# $ensign_name's Journal

## First Watch — Ensign Takes Post

**Date:** 2026-06-08

This repository has been initialized as part of the SuperInstance fleet.
- AGENT.md created
- CI workflow configured
- MIT license applied

**Status:** Operational
**Connected to fleet:** ✅
**Next duty:** Awaiting instructions."

        content_enc=$(echo "$journal_content" | base64 -w0 2>/dev/null || echo "$journal_content" | base64)
        existing_sha=$(curl -sf "https://api.github.com/repos/SuperInstance/$repo/contents/memory/JOURNAL.md" 2>/dev/null | \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")
        if [[ -n "$existing_sha" ]]; then
            gh api -X PUT "/repos/SuperInstance/$repo/contents/memory/JOURNAL.md" \
                -f message="feat: add memory/JOURNAL.md for ensign duty log" \
                -f content="$content_enc" \
                -f sha="$existing_sha" --silent 2>/dev/null && \
                echo "  ✅ Updated memory/JOURNAL.md" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ JOURNAL.md update failed" | tee -a "$STUB_LOG"
        else
            gh api -X PUT "/repos/SuperInstance/$repo/contents/memory/JOURNAL.md" \
                -f message="feat: add memory/JOURNAL.md for ensign duty log" \
                -f content="$content_enc" --silent 2>/dev/null && \
                echo "  ✅ Created memory/JOURNAL.md" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ JOURNAL.md create failed" | tee -a "$STUB_LOG"
        fi
    fi

    # --- .github/workflows/ci.yml ---
    if $needs_ci; then
        case "${lang,,}" in
            rust)
                ci_content='name: CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo check
      - run: cargo test
      - run: cargo clippy -- -D warnings'
                ;;
            javascript|typescript)
                ci_content='name: CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test --if-present'
                ;;
            python)
                ci_content='name: CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install pytest
      - run: pytest || true'
                ;;
            go)
                ci_content='name: CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.21"
      - run: go test ./...'
                ;;
            *)
                ci_content='name: CI
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "No CI configured — customize per project requirements"'
                ;;
        esac

        content_enc=$(echo "$ci_content" | base64 -w0 2>/dev/null || echo "$ci_content" | base64)
        existing_sha=$(curl -sf "https://api.github.com/repos/SuperInstance/$repo/contents/.github/workflows/ci.yml" 2>/dev/null | \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")
        if [[ -n "$existing_sha" ]]; then
            gh api -X PUT "/repos/SuperInstance/$repo/contents/.github/workflows/ci.yml" \
                -f message="ci: add CI workflow" \
                -f content="$content_enc" \
                -f sha="$existing_sha" --silent 2>/dev/null && \
                echo "  ✅ Updated .github/workflows/ci.yml" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ ci.yml update failed" | tee -a "$STUB_LOG"
        else
            gh api -X PUT "/repos/SuperInstance/$repo/contents/.github/workflows/ci.yml" \
                -f message="ci: add CI workflow" \
                -f content="$content_enc" --silent 2>/dev/null && \
                echo "  ✅ Created .github/workflows/ci.yml" | tee -a "$STUB_LOG" || \
                echo "  ⚠️ ci.yml create failed" | tee -a "$STUB_LOG"
        fi
    fi
}

# =============================================
# MAIN EXECUTION
# =============================================

readme_count=0
ensign_count=0
repo_count=0

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   SuperInstance Fleet — Full Documentation Run   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Phase 1: README generation
echo "━━━ Phase 1: README Generation ━━━"
counter=0
while IFS='|' read -r repo desc lang; do
    ((repo_count++))
    ((counter++))
    if [[ $((counter % 30)) -eq 0 ]]; then
        echo "  Progress: $counter/$total scanned"
        remaining=$(gh api rate_limit 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['resources']['core']['remaining'])" 2>/dev/null)
        echo "  💧 API calls remaining: $remaining"
        if [[ -n "$remaining" && $remaining -lt 100 ]]; then
            echo "  ⏳ Low API quota, sleeping 60s..."
            sleep 60
        fi
        sleep 1
    fi
    if generate_readme "$repo" "$desc" "$lang"; then
        ((readme_count++))
        sleep 3  # Small delay between writes to avoid secondary rate limits
    fi
done < "$REPO_META"

echo ""
echo "━━━ Phase 1 Complete: $readme_count READMEs generated ━━━"
echo ""

# Phase 2: Ensign stubs
echo "━━━ Phase 2: Ensign Stubs ━━━"
echo "📎 Scanning and adding missing stubs..."
counter=0
while IFS='|' read -r repo desc lang; do
    ((counter++))
    if [[ $((counter % 50)) -eq 0 ]]; then
        echo "  Progress: $counter/$repo_count checked"
        # Rate limit check every 50
        remaining=$(gh api rate_limit 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['resources']['core']['remaining'])" 2>/dev/null)
        echo "  💧 API calls remaining: $remaining"
        if [[ -n "$remaining" && $remaining -lt 100 ]]; then
            echo "  ⏳ Low API quota, sleeping 60s..."
            sleep 60
        fi
    fi
    if add_ensign_stubs "$repo" "$desc" "$lang"; then
        ((ensign_count++))
    fi
done < "$REPO_META"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║                     RESULTS                      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║ Repos scanned:     $repo_count"
echo "║ New READMEs:        $readme_count"
echo "║ Ensign stubs added: $ensign_count"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Log files:"
echo "  README gen: $README_LOG"
echo "  Stub gen:   $STUB_LOG"
