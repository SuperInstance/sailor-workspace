#!/bin/bash
# Batch README polisher for all SuperInstance public repos
REPO_LIST="public-repos.txt"
while IFS= read -r repo; do
  echo "🧹 Polishing README for SuperInstance/$repo"
  # Spawn a subagent to polish this repo's README
  sessions_spawn \
    --task "You are the README Polisher for SuperInstance/$repo. Create a professional, engineering-grade README for this project:
    1. Add a clear hero title + tagline
    2. 1-line Quick Start (copy-pasteable install/run command)
    3. What problem this solves
    4. Architecture diagram or high-level flow
    5. Key features/changes
    6. CLI/API references
    7. Test status badges
    8. Contributing guidelines
    9. License
    Use the existing source code, package.json, and any docs in the repo to build this. If there is an existing README, update it to be modern, clear, and engineering-focused." \
    --taskName "readme-$repo" \
    --model "deepseek-ai/DeepSeek-V4-Flash" \
    --context "isolated"
done < "$REPO_LIST"
