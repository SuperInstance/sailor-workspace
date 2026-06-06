#!/usr/bin/env bash
# Circuit breaker — pre-flight + runtime watchdog
set -u

# Hard limits (tighter — leave headroom for spikes)
MAX_RAM_GB=12          # Previously 14. Leave more headroom.
MAX_DISK_PCT=80        # Previously 85. Spikes happen.
MAX_CORES=2            # Leave 2 cores for system + OpenClaw + spikes
TIMEOUT_SEC=300
WATCHDOG_PID=""
WATCHDOG_INTERVAL=5    # Seconds between runtime checks

usage() {
    echo "Usage: circuit-breaker.sh (preflight|run|watchdog <pid>)"
    exit 1
}

preflight() {
    local errors=()
    local disk_pct=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    local mem_free_mb=$(free -m | awk '/^Mem:/{print $7}')
    local mem_free_gb=$((mem_free_mb / 1024))
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local load_int=${load%.*}
    local swap_used=$(free -m | awk '/^Swap:/{print $3}')

    if [ "$disk_pct" -gt "$MAX_DISK_PCT" ]; then errors+=("DISK: ${disk_pct}% (max ${MAX_DISK_PCT}%)"); fi
    if [ "$mem_free_gb" -lt 6 ]; then errors+=("RAM: ${mem_free_gb}G free (need > 6G)"); fi
    if [ "$load_int" -ge "$MAX_CORES" ]; then errors+=("LOAD: ${load} (max ${MAX_CORES})"); fi
    if [ "$swap_used" -gt 1024 ]; then errors+=("SWAP: ${swap_used}M used — system is paging!"); fi

    if [ ${#errors[@]} -gt 0 ]; then
        echo "⛔ CIRCUIT BREAKER:"
        for e in "${errors[@]}"; do echo "  - $e"; done
        echo "  System: $(free -h | grep Mem | awk '{print $3"/"$2" used, "$7" free"}')"
        echo "  Disk: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')"
        return 1
    fi
    echo "✅ $(free -h | grep Mem | awk '{print $7" free"}') disk $(df -h / | tail -1 | awk '{print $5}') load $load"
    return 0
}

# Runtime watchdog — polls process + system until done or limit breached
watchdog() {
    local pid=$1
    local timeout=$TIMEOUT_SEC
    local elapsed=0
    while kill -0 "$pid" 2>/dev/null; do
        elapsed=$((elapsed + WATCHDOG_INTERVAL))
        # Runtime checks
        local mem_free_mb=$(free -m | awk '/^Mem:/{print $7}')
        local swap_used=$(free -m | awk '/^Swap:/{print $3}')
        if [ "$mem_free_mb" -lt 3000 ]; then
            echo "⛔ RUNTIME: RAM critical (${mem_free_mb}M free). Killing $pid."
            kill -9 "$pid" 2>/dev/null
            return 137
        fi
        if [ "$swap_used" -gt 2048 ]; then
            echo "⛔ RUNTIME: ${swap_used}M swap used. Killing $pid."
            kill -9 "$pid" 2>/dev/null
            return 137
        fi
        if [ "$elapsed" -gt "$timeout" ]; then
            echo "⛔ RUNTIME: Timeout ${timeout}s. Killing $pid."
            kill -9 "$pid" 2>/dev/null
            return 124
        fi
        sleep "$WATCHDOG_INTERVAL"
    done
    wait "$pid"
    return $?
}

run_guarded() {
    preflight || return 1
    local cmd="$@"
    echo "🔒 $cmd"
    (
        ulimit -v $((MAX_RAM_GB * 1024 * 1024))
        ulimit -t $TIMEOUT_SEC
        bash -c "$cmd" &
        WPID=$!
        watchdog $WPID
    )
    return $?
}

case "${1:-help}" in
    preflight) preflight ;;
    watchdog) shift; watchdog "$@" ;;
    run|guarded) shift; run_guarded "$@" ;;
    *) usage ;;
esac
