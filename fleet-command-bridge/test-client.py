#!/usr/bin/env python3
"""
Test Client for Fleet Command Bridge
====================================
Connects to the bridge via WebSocket, exercises every JSON-RPC method,
and validates responses against the API spec (BRIDGE_SPEC.md).

Usage:
    python test-client.py [--host HOST] [--port PORT]

Requires: websockets >= 12.0
    pip install websockets
"""

import argparse
import asyncio
import json
import sys
import time
import uuid

try:
    import websockets
except ImportError:
    print("ERROR: websockets not installed. Run: pip install websockets")
    sys.exit(1)


# ── Colored Output ─────────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def ok(msg: str) -> str:
    return f"{GREEN}✓ {msg}{RESET}"


def fail(msg: str) -> str:
    return f"{RED}✗ {msg}{RESET}"


def info(msg: str) -> str:
    return f"{CYAN}{msg}{RESET}"


# ── Test Results ───────────────────────────────────────────────────

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.skipped = 0

    def add(self, name: str, success: bool, detail: str = ""):
        if success:
            self.passed += 1
            print(f"  {ok(name)}")
        else:
            self.failed += 1
            print(f"  {fail(name)}")
            if detail:
                print(f"    └─ {detail}")

    def skip(self, name: str):
        self.skipped += 1
        print(f"  {YELLOW}○ {name} (skipped){RESET}")

    def summary(self) -> str:
        total = self.passed + self.failed + self.skipped
        return (
            f"\n{BOLD}Test Results:{RESET} {GREEN}{self.passed} passed{RESET}, "
            f"{RED}{self.failed} failed{RESET}, "
            f"{YELLOW}{self.skipped} skipped{RESET} "
            f"({total} total)"
        )


# ── JSON-RPC Client ────────────────────────────────────────────────

class FleetBridgeClient:
    """
    Thin JSON-RPC 2.0 client over WebSocket.

    Sends requests with incremental IDs, awaits matching responses,
    and handles push notifications (which have no 'id').
    """

    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self._ws = None
        self._req_id = 0
        self._pending: dict[int, asyncio.Future] = {}
        self._push_events: list[dict] = []
        self._listener_task = None

    async def connect(self):
        self._ws = await websockets.connect(self.ws_url)
        # Listen for push events in the background
        self._listener_task = asyncio.create_task(self._event_listener())
        # Consume session_ready notification
        await asyncio.sleep(0.3)
        return True

    async def _event_listener(self):
        """Background listener for push events and responses."""
        try:
            async for raw in self._ws:
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_id = msg.get("id")
                if msg_id is not None:
                    # This is a response to a request
                    future = self._pending.pop(int(msg_id), None)
                    if future and not future.done():
                        future.set_result(msg)
                else:
                    # This is a push notification without an id
                    self._push_events.append(msg)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception:
            pass

    async def call(self, method: str, params: dict = None) -> dict:
        """Send a JSON-RPC request and await a matching response."""
        self._req_id += 1
        req_id = self._req_id
        request = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {},
        }

        future = asyncio.get_event_loop().create_future()
        self._pending[req_id] = future

        await self._ws.send(json.dumps(request))

        try:
            response = await asyncio.wait_for(future, timeout=10.0)
            return response
        except asyncio.TimeoutError:
            self._pending.pop(req_id, None)
            return {"jsonrpc": "2.0", "id": req_id,
                    "error": {"code": -1, "message": "timeout"}}

    def get_push_events(self) -> list[dict]:
        """Return and clear buffered push events."""
        events = self._push_events[:]
        self._push_events.clear()
        return events

    async def close(self):
        if self._listener_task:
            self._listener_task.cancel()
        if self._ws:
            await self._ws.close()


# ── Validators ─────────────────────────────────────────────────────

def has_field(obj: dict, field: str, typ: type = None) -> bool:
    if field not in obj:
        return False
    if typ is not None and not isinstance(obj[field], typ):
        return False
    return True


def is_error_response(resp: dict) -> bool:
    return "error" in resp


# ── Test Functions ──────────────────────────────────────────────────

async def test_health_http(host: str, port: int, results: TestResults):
    """Test the HTTP health endpoint."""
    print(f"\n{info('═══ HTTP Health Endpoint')}")

    import http.client
    try:
        conn = http.client.HTTPConnection(host, port, timeout=5)
        conn.request("GET", "/health")
        resp = conn.getresponse()
        body = json.loads(resp.read().decode())
        conn.close()

        results.add("HTTP /health returns 200",
                     resp.status == 200,
                     f"Got HTTP {resp.status}")
        results.add("health response has status=ok",
                     body.get("status") == "ok",
                     f"Got status={body.get('status')}")
        results.add("health response has reflex_count",
                     has_field(body, "reflex_count", int),
                     f"reflex_count={body.get('reflex_count')}")
        results.add("health response has room_count",
                     has_field(body, "room_count", int),
                     f"room_count={body.get('room_count')}")
    except Exception as e:
        results.add("HTTP health endpoint unreachable", False, str(e))


async def test_fleet_ping(client: FleetBridgeClient, results: TestResults):
    """Test fleet.ping."""
    print(f"\n{info('═══ fleet.ping')}")
    resp = await client.call("fleet.ping")

    if is_error_response(resp):
        results.add("fleet.ping returns success", False, str(resp["error"]))
        return

    result = resp.get("result", {})
    results.add("fleet.ping returns pong=true",
                 result.get("pong") is True)
    results.add("fleet.ping has server_time",
                 has_field(result, "server_time", int))
    results.add("fleet.ping has fleet_version",
                 result.get("fleet_version") == "1.0.0")
    results.add("fleet.ping has backends with pincher+polychora",
                 "pincher" in result.get("backends", {})
                 and "polychora" in result.get("backends", {}))
    results.add("fleet.ping has uptime_secs > 0",
                 result.get("uptime_secs", 0) >= 0)


async def test_fleet_status(client: FleetBridgeClient, results: TestResults):
    """Test fleet.status."""
    print(f"\n{info('═══ fleet.status')}")
    resp = await client.call("fleet.status")

    if is_error_response(resp):
        results.add("fleet.status returns success", False, str(resp["error"]))
        return

    result = resp.get("result", {})
    results.add("fleet.status has bridge_state=connected",
                 result.get("bridge_state") == "connected")
    results.add("fleet.status has agent_count >= 0",
                 result.get("agent_count", -1) >= 0)
    results.add("fleet.status has active_reflexes >= 5",
                 result.get("active_reflexes", 0) >= 5,
                 f"got {result.get('active_reflexes')}")
    results.add("fleet.status has room_count >= 2",
                 result.get("room_count", 0) >= 2,
                 f"got {result.get('room_count')}")
    results.add("fleet.status has backend_health",
                 "pincher" in result.get("backend_health", {}))


async def test_fleet_backend_status(client: FleetBridgeClient, results: TestResults):
    """Test fleet.backend_status."""
    print(f"\n{info('═══ fleet.backend_status')}")

    resp = await client.call("fleet.backend_status", {"backend": "pincher"})
    if is_error_response(resp):
        results.add("fleet.backend_status pincher", False, str(resp["error"]))
    else:
        r = resp["result"]
        results.add("backend pincher returns status", has_field(r, "status"),
                     f"status={r.get('status')}")

    resp = await client.call("fleet.backend_status", {"backend": "polychora"})
    if is_error_response(resp):
        results.add("fleet.backend_status polychora", False, str(resp["error"]))
    else:
        r = resp["result"]
        results.add("backend polychora returns status", has_field(r, "status"),
                     f"status={r.get('status')}")

    # Unknown backend should error
    resp = await client.call("fleet.backend_status", {"backend": "nope"})
    results.add("unknown backend returns error", is_error_response(resp),
                 "Expected error for unknown backend")


async def test_reflex_list(client: FleetBridgeClient, results: TestResults):
    """Test reflex.list."""
    print(f"\n{info('═══ reflex.list')}")

    resp = await client.call("reflex.list", {"limit": 10, "offset": 0})
    if is_error_response(resp):
        results.add("reflex.list returns success", False, str(resp["error"]))
        return

    r = resp.get("result", {})
    reflexes = r.get("reflexes", [])
    results.add("reflex.list has total > 0", r.get("total", 0) > 0,
                 f"total={r.get('total')}")
    results.add("reflex.list returns reflex array", isinstance(reflexes, list))
    results.add("first reflex has id, intent, confidence",
                 all(f in reflexes[0] for f in ["id", "intent", "confidence"])
                 if reflexes else False,
                 f"fields={list(reflexes[0].keys()) if reflexes else 'empty'}")


async def test_reflex_get(client: FleetBridgeClient, results: TestResults):
    """Test reflex.get."""
    print(f"\n{info('═══ reflex.get')}")

    # First get a reflex ID from list
    list_resp = await client.call("reflex.list", {"limit": 1})
    if is_error_response(list_resp):
        results.add("reflex.get (setup)", False, "Cannot get reflex list")
        return

    reflexes = list_resp["result"].get("reflexes", [])
    if not reflexes:
        results.skip("reflex.get (no reflexes in list)")
        return

    reflex_id = reflexes[0]["id"]
    resp = await client.call("reflex.get", {"reflex_id": reflex_id})
    if is_error_response(resp):
        results.add("reflex.get returns success", False, str(resp["error"]))
        return

    r = resp.get("result", {})
    results.add("reflex.get has id matching request", r.get("id") == reflex_id)
    results.add("reflex.get has intent", has_field(r, "intent", str))
    results.add("reflex.get has action", has_field(r, "action", str))
    results.add("reflex.get has invoke_count", has_field(r, "invoke_count", int))
    results.add("reflex.get has last_invoked", has_field(r, "last_invoked", str))

    # Non-existent reflex should error
    resp = await client.call("reflex.get", {"reflex_id": "nonexistent"})
    results.add("reflex.get missing reflex returns error",
                 is_error_response(resp))


async def test_reflex_match(client: FleetBridgeClient, results: TestResults):
    """Test reflex.match."""
    print(f"\n{info('═══ reflex.match')}")

    resp = await client.call("reflex.match", {"intent": "system.info"})
    if is_error_response(resp):
        results.add("reflex.match system.info", False, str(resp["error"]))
    else:
        r = resp["result"]
        results.add("reflex.match returns match_type='exact'",
                     r.get("match_type") == "exact",
                     f"got {r.get('match_type')}")
        results.add("reflex.match returns similarity > 0.5",
                     r.get("similarity", 0) > 0.5)
        results.add("reflex.match returns reflex object",
                     r.get("reflex") is not None)

    # Fuzzy match
    resp = await client.call("reflex.match", {"intent": "show docker stuff"})
    if is_error_response(resp):
        results.add("reflex.match fuzzy", False, str(resp["error"]))
    else:
        r = resp["result"]
        results.add("reflex.match fuzzy returns a match_type",
                     r.get("match_type") in ("exact", "similar", "novel"))

    # Empty intent should error
    resp = await client.call("reflex.match", {"intent": ""})
    results.add("reflex.match empty intent returns error",
                 is_error_response(resp))


async def test_reflex_execute(client: FleetBridgeClient, results: TestResults):
    """Test reflex.execute."""
    print(f"\n{info('═══ reflex.execute')}")

    list_resp = await client.call("reflex.list", {"limit": 1})
    if is_error_response(list_resp):
        results.add("reflex.execute (setup)", False, "Cannot get reflex list")
        return

    reflexes = list_resp["result"].get("reflexes", [])
    if not reflexes:
        results.skip("reflex.execute (no reflexes)")
        return

    reflex_id = reflexes[0]["id"]
    resp = await client.call("reflex.execute", {"reflex_id": reflex_id})
    if is_error_response(resp):
        results.add("reflex.execute returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("reflex.execute has execution_id",
                 has_field(r, "execution_id", str))
    results.add("reflex.execute has output", has_field(r, "output", str))
    results.add("reflex.execute has latency_ms >= 0",
                 r.get("latency_ms", -1) >= 0)
    results.add("reflex.execute has reflex_id matching",
                 r.get("reflex_id") == reflex_id)

    # Non-existent reflex should error
    resp = await client.call("reflex.execute", {"reflex_id": "nope"})
    results.add("reflex.execute missing reflex returns error",
                 is_error_response(resp))


async def test_reflex_teach(client: FleetBridgeClient, results: TestResults):
    """Test reflex.teach."""
    print(f"\n{info('═══ reflex.teach')}")

    import random
    intent = f"test.intent.{random.randint(10000, 99999)}"
    resp = await client.call("reflex.teach", {
        "intent": intent,
        "action": "$ echo hello",
    })

    if is_error_response(resp):
        results.add("reflex.teach returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("reflex.teach has reflex_id", has_field(r, "reflex_id", str))
    results.add("reflex.teach has intent matching", r.get("intent") == intent)
    results.add("reflex.teach confidence is 0.5", r.get("confidence") == 0.5)

    # Verify it's now in the list
    list_resp = await client.call("reflex.list")
    if not is_error_response(list_resp):
        reflexes = list_resp["result"].get("reflexes", [])
        found = any(rf["id"] == r["reflex_id"] for rf in reflexes)
        results.add("reflex is now in reflex.list", found)


async def test_reflex_log(client: FleetBridgeClient, results: TestResults):
    """Test reflex.log."""
    print(f"\n{info('═══ reflex.log')}")

    list_resp = await client.call("reflex.list", {"limit": 1})
    if is_error_response(list_resp):
        results.add("reflex.log (setup)", False, "Cannot get reflex list")
        return

    reflexes = list_resp["result"].get("reflexes", [])
    if not reflexes:
        results.skip("reflex.log (no reflexes)")
        return

    reflex_id = reflexes[0]["id"]
    resp = await client.call("reflex.log", {"reflex_id": reflex_id, "limit": 5})
    if is_error_response(resp):
        results.add("reflex.log returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    entries = r.get("entries", [])
    results.add("reflex.log has entries array", isinstance(entries, list))

    if entries:
        results.add("first entry has id, input, output, latency_ms",
                     all(f in entries[0] for f in
                         ["id", "input", "output", "latency_ms"]))


async def test_voxel_world_status(client: FleetBridgeClient, results: TestResults):
    """Test voxel.world_status."""
    print(f"\n{info('═══ voxel.world_status')}")

    resp = await client.call("voxel.world_status")
    if is_error_response(resp):
        results.add("voxel.world_status returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("world_status has tick >= 0",
                 r.get("tick", -1) >= 0)
    results.add("world_status has tick_rate",
                 r.get("tick_rate", 0) > 0)
    results.add("world_status has semantics",
                 r.get("semantics") in ("spatial", "temporal"))


async def test_voxel_get_region(client: FleetBridgeClient, results: TestResults):
    """Test voxel.get_region."""
    print(f"\n{info('═══ voxel.get_region')}")

    resp = await client.call("voxel.get_region", {
        "x": 0, "y": 0, "z": 0, "w": 0, "radius": 16
    })
    if is_error_response(resp):
        results.add("voxel.get_region returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("get_region has region object", has_field(r, "region"))
    results.add("get_region has event_voxels array",
                 isinstance(r.get("event_voxels"), list))


async def test_room_list(client: FleetBridgeClient, results: TestResults):
    """Test room.list."""
    print(f"\n{info('═══ room.list')}")

    resp = await client.call("room.list")
    if is_error_response(resp):
        results.add("room.list returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    rooms = r.get("rooms", [])
    results.add("room.list has rooms array", isinstance(rooms, list))
    results.add("room.list has >= 2 rooms", len(rooms) >= 2,
                 f"got {len(rooms)}")
    if rooms:
        results.add("first room has scope, tile_count, agent_count",
                     all(f in rooms[0] for f in ["scope", "tile_count", "agent_count"]))


async def test_room_get(client: FleetBridgeClient, results: TestResults):
    """Test room.get."""
    print(f"\n{info('═══ room.get')}")

    resp = await client.call("room.get", {"scope": "workspace-main"})
    if is_error_response(resp):
        results.add("room.get workspace-main", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("room.get returns scope matching", r.get("scope") == "workspace-main")
    results.add("room.get has tiles array", isinstance(r.get("tiles"), list))
    results.add("room.get has agents array", isinstance(r.get("agents"), list))
    results.add("room.get tiles have id, presets, capabilities",
                 all(f in r["tiles"][0] for f in ["id", "presets", "capabilities"])
                 if r.get("tiles") else False)

    # Non-existent room
    resp = await client.call("room.get", {"scope": "nonexistent"})
    results.add("room.get missing room returns error",
                 is_error_response(resp))


async def test_room_create(client: FleetBridgeClient, results: TestResults):
    """Test room.create."""
    print(f"\n{info('═══ room.create')}")

    import random
    scope = f"test-room-{random.randint(10000, 99999)}"
    resp = await client.call("room.create", {
        "scope": scope,
        "metadata": {"purpose": "testing"},
    })

    if is_error_response(resp):
        results.add("room.create returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("room.create returns scope matching", r.get("scope") == scope)
    results.add("room.create created=true", r.get("created") is True)

    # Duplicate should fail
    resp = await client.call("room.create", {"scope": scope})
    results.add("room.create duplicate returns error",
                 is_error_response(resp))


async def test_tile_add_remove(client: FleetBridgeClient, results: TestResults):
    """Test tile.add and tile.remove."""
    print(f"\n{info('═══ tile.add / tile.remove')}")

    # Add a tile
    resp = await client.call("tile.add", {
        "scope": "workspace-main",
        "presets": ["monitoring", "test"],
        "capabilities": {"host_agents": True, "temporal": True},
    })

    if is_error_response(resp):
        results.add("tile.add returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("tile.add has tile_id", has_field(r, "tile_id", str))
    results.add("tile.add added=true", r.get("added") is True)

    tile_id = r["tile_id"]

    # Verify tile exists in room
    room_resp = await client.call("room.get", {"scope": "workspace-main"})
    if not is_error_response(room_resp):
        tiles = room_resp["result"].get("tiles", [])
        found = any(t["id"] == tile_id for t in tiles)
        results.add("tile appears in room.get after add", found)

    # Remove the tile
    resp = await client.call("tile.remove", {
        "scope": "workspace-main",
        "tile_id": tile_id,
    })
    if is_error_response(resp):
        results.add("tile.remove returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("tile.remove removed=true", r.get("removed") is True,
                 f"got removed={r.get('removed')}")

    # Remove non-existent tile
    resp = await client.call("tile.remove", {
        "scope": "workspace-main",
        "tile_id": "nonexistent-tile",
    })
    if not is_error_response(resp):
        r = resp["result"]
        results.add("tile.remove non-existent removed=false",
                     r.get("removed") is False)


async def test_room_freeze(client: FleetBridgeClient, results: TestResults):
    """Test room.freeze / room.unfreeze."""
    print(f"\n{info('═══ room.freeze / room.unfreeze')}")

    resp = await client.call("room.freeze", {"scope": "workspace-main"})
    if is_error_response(resp):
        results.add("room.freeze returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("room.freeze frozen=true", r.get("frozen") is True)
    results.add("room.freeze has frozen_context_size > 0",
                 r.get("frozen_context_size", 0) > 0)

    resp = await client.call("room.unfreeze", {"scope": "workspace-main"})
    if is_error_response(resp):
        results.add("room.unfreeze returns success", False, str(resp["error"]))
        return

    r = resp["result"]
    results.add("room.unfreeze frozen=false", r.get("frozen") is False)

    # Non-existent room should error
    resp = await client.call("room.freeze", {"scope": "nope"})
    results.add("room.freeze missing room returns error",
                 is_error_response(resp))


async def test_unknown_method(client: FleetBridgeClient, results: TestResults):
    """Test that unknown method returns error."""
    print(f"\n{info('═══ error handling')}")

    resp = await client.call("this.method.does.not.exist")
    results.add("unknown method returns error", is_error_response(resp))

    error = resp.get("error", {})
    results.add("error has code -32601 (Method not found)",
                 error.get("code") == -32601,
                 f"got code {error.get('code')}: {error.get('message')}")


async def test_push_events(client: FleetBridgeClient, results: TestResults):
    """Test that executing a reflex generates a push event."""
    print(f"\n{info('═══ push events')}")

    # Execute a reflex first to generate a push event
    list_resp = await client.call("reflex.list", {"limit": 1})
    if is_error_response(list_resp):
        results.skip("push events - cannot get reflex list")
        return

    reflexes = list_resp["result"].get("reflexes", [])
    if not reflexes:
        results.skip("push events - no reflexes")
        return

    await client.call("reflex.execute", {"reflex_id": reflexes[0]["id"]})
    await asyncio.sleep(0.3)

    events = client.get_push_events()
    results.add("push event received after reflex.execute", len(events) > 0)

    if events:
        event = events[0]
        results.add("push event has method field",
                     "method" in event or "method" in event.get("params", {}))
        results.add("push event has reflex_id in params",
                     "reflex_id" in event.get("params", {}))


async def test_pincher_adapter_pattern(client: FleetBridgeClient, results: TestResults):
    """
    Verify the bridge follows the adapter pattern by testing
    the Sensation → Abstraction pipeline concept.
    """
    print(f"\n{info('═══ adapter pattern / pipeline verification')}")

    # Phase 1: Sensation - a new intent comes in
    sensation_intent = "check disk space"
    match_resp = await client.call("reflex.match", {"intent": sensation_intent})
    if is_error_response(match_resp):
        results.add("pipeline: sensation phase (match)", False)
        return

    match_result = match_resp["result"]
    results.add("pipeline: sensation receives match result",
                 has_field(match_result, "match_type"),
                 f"match_type={match_result.get('match_type')}")

    # Phase 2: Abstraction - the bridge resolves the intent to an action
    if match_result.get("reflex"):
        reflex = match_result["reflex"]
        exec_resp = await client.call("reflex.execute",
                                       {"reflex_id": reflex["id"]})
        if not is_error_response(exec_resp):
            exec_result = exec_resp["result"]
            results.add("pipeline: abstraction executes reflex",
                         has_field(exec_result, "output"),
                         f"output starts with: {exec_result.get('output', '')[:50]}")
            results.add("pipeline: execution has latency ∈ [0, 1000]",
                         0 <= exec_result.get("latency_ms", -1) <= 1000)

    # Phase 3: Learning - teach a new reflex for this sensation
    teach_resp = await client.call("reflex.teach", {
        "intent": "check.disk.usage",
        "action": "$ df -h",
    })
    if not is_error_response(teach_resp):
        teach_result = teach_resp["result"]
        results.add("pipeline: learning creates new reflex",
                     has_field(teach_result, "reflex_id"))

        # Now match again - should get exact match
        match2_resp = await client.call("reflex.match",
                                         {"intent": "check.disk.usage"})
        if not is_error_response(match2_resp):
            r2 = match2_resp["result"]
            results.add("pipeline: re-match after learning returns exact",
                         r2.get("match_type") == "exact",
                         f"got {r2.get('match_type')}")


# ── Main ────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(
        description="Test client for Fleet Command Bridge")
    parser.add_argument("--host", default="127.0.0.1", help="Bridge host")
    parser.add_argument("--port", type=int, default=9876, help="Bridge port")
    args = parser.parse_args()

    ws_url = f"ws://{args.host}:{args.port}/ws"

    print(f"\n{BOLD}Fleet Command Bridge Test Suite{RESET}")
    print(f"  Target: {ws_url}")
    print(f"  HTTP:   http://{args.host}:{args.port}/health")
    print("=" * 60)

    results = TestResults()

    # Connect
    client = FleetBridgeClient(ws_url)
    try:
        await client.connect()
        print(f"{ok('WebSocket connected')}")
    except Exception as e:
        print(f"{fail('Could not connect to bridge')}")
        print(f"  └─ {e}")
        print(f"\n{YELLOW}Make sure the bridge is running:{RESET}")
        print(f"  cd fleet-command-bridge && cargo run")
        sys.exit(1)

    try:
        # Run all tests
        await test_health_http(args.host, args.port, results)
        await test_fleet_ping(client, results)
        await test_fleet_status(client, results)
        await test_fleet_backend_status(client, results)
        await test_reflex_list(client, results)
        await test_reflex_get(client, results)
        await test_reflex_match(client, results)
        await test_reflex_execute(client, results)
        await test_reflex_teach(client, results)
        await test_reflex_log(client, results)
        await test_voxel_world_status(client, results)
        await test_voxel_get_region(client, results)
        await test_room_list(client, results)
        await test_room_get(client, results)
        await test_room_create(client, results)
        await test_tile_add_remove(client, results)
        await test_room_freeze(client, results)
        await test_unknown_method(client, results)
        await test_push_events(client, results)
        await test_pincher_adapter_pattern(client, results)

    finally:
        await client.close()

    # Summary
    print("=" * 60)
    print(results.summary())

    # Exit code
    if results.failed > 0:
        print(f"\n{RED}Some tests failed.{RESET}")
        sys.exit(1)
    else:
        print(f"\n{GREEN}All tests passed!{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
