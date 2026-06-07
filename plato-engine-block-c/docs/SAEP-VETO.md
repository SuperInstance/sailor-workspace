# SAEP Veto Hierarchy

## The 4-Tier Model

SAEP governance enforces safety through a 4-tier veto hierarchy:

```
Market ─────── Global override (fleet-wide kill switch)
  ▲
Portfolio ──── All sensors on this device
  ▲
Sector ─────── Group of related sensors
  ▲
Room ───────── Single sensor
```

### How Vetoes Work

1. Each veto is checked on every tick
2. A veto at any tier blocks all actions *below* it
3. Market-level vetoes block everything
4. Room-level vetoes block a single sensor's alarm

### Physical Veto Switches

```c
// Market-level kill switch — blocks ALL alarms
plato_gate_add_veto(&eng, "emergency-stop", 8, PLATO_VETO_LEVEL_MARKET);

// Room-level override — blocks temperature alarm
plato_gate_add_veto(&eng, "temp-override", 9, PLATO_VETO_LEVEL_ROOM);
```

### Veto Flow

```
Tick start
  ↓
Read sensors
  ↓
Compute ternary states
  ↓
Check Room veto ──?── blocked → skip alarm
  ↓
Check Sector veto ─?── blocked → skip group alarm
  ↓
Check Portfolio ───?── blocked → skip all alarms
  ↓
Check Market veto ─?── blocked → skip everything
  ↓
Fire alarm
```
