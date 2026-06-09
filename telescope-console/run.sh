#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
#  🔭 TELESCOPE CONSOLE — START SCRIPT
#  The unified interface for all audio pipeline work
# ──────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   🔭 TELESCOPE CONSOLE V0.1.0                      ║"
echo "║   Unified Audio Pipeline Interface                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check dependencies
echo "=== Checking dependencies ==="
check_dependency() {
    if ! command -v "$1" &>/dev/null; then
        echo "❌ Missing dependency: $2"
        exit 1
    else
        echo "✅ $1: $($1 --version | head -1 || echo 'installed')"
    fi
}

check_dependency "python3.11" "Python 3.11+"
check_dependency "pip3" "pip"
check_dependency "uvicorn" "FastAPI Uvicorn" || pip3 install fastapi uvicorn websockets numpy >/dev/null 2>&1

# Check bridge connection
if ! nc -z localhost 8765; then
    echo ""
    echo "⚠️  WARNING: OpenSMILE bridge not running at ws://localhost:8765"
    echo "   Start with: sudo systemctl start fleet-opensmile"
    echo "   Continuing anyway..."
fi

# Start the console
echo "" 
echo "=== Starting Telescope Console ==="
echo "📡 Backend: FastAPI on http://localhost:9001"
echo "🎨 Frontend: Open your browser to:"
echo "                                                       "
echo "   🌐 http://localhost:9001                            "
echo "                                                       "
echo "✅ Ready to go. Aim the telescope. Drop audio files."
echo ""

cd "$(dirname "$0")"
export PYTHONPATH="$PWD:$PWD/backend":$PYTHONPATH
python3.11 backend/main.py
