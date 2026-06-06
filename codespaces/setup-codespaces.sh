#!/usr/bin/env bash
#
# setup-codespaces.sh — One-time setup for Codespaces-as-Workers.
#
# Adds the missing 'codespace' scope to your gh auth token so that
# codespace-worker.sh can function.
#
# This requires an interactive browser flow. The script will:
#   1. Start `gh auth refresh` to get a device code
#   2. Print the code and URL
#   3. Wait for you to authorize in your browser
#   4. Confirm the new scopes are active
#

set -euo pipefail

echo "╔══════════════════════════════════════════════════╗"
echo "║  Codespaces-as-Workers — Auth Setup              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Ensure gh is available
if ! command -v gh &>/dev/null; then
    echo "✗ gh (GitHub CLI) is not installed."
    echo "  Install it from: https://cli.github.com/"
    exit 1
fi

# Check current scopes
CURRENT_SCOPES=$(gh auth status 2>&1 | grep -oP '(?<=Token scopes: ).*' || echo "")
echo "Current GitHub token scopes: $CURRENT_SCOPES"
echo ""

if echo "$CURRENT_SCOPES" | grep -qw 'codespace'; then
    echo "✓ The 'codespace' scope is already present."
    echo "  No setup needed."
    exit 0
fi

echo "The 'codespace' scope is missing. Adding it requires a one-time"
echo "interactive browser authorization."
echo ""

# Run the auth refresh
echo "Starting device code flow..."
echo ""
gh auth refresh -h github.com -s codespace 2>&1
REFRESH_RC=$?
echo ""

if [ "$REFRESH_RC" -eq 0 ]; then
    echo "✓ Auth refresh complete!"
    gh auth status 2>&1 | grep 'Token scopes:'
    echo ""
    echo "You can now use codespace-worker.sh."
else
    echo "✗ Auth refresh failed (exit code $REFRESH_RC)."
    echo "  Try running: gh auth refresh -h github.com -s codespace"
    exit 1
fi
