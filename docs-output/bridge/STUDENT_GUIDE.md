# STUDENT_GUIDE.md — "I have two coordination systems. How do I talk between them?"

## The Problem

You're trying to get **System A** (which sends bottles) to talk to **System B** (which uses spreadsheet formulas). They don't speak the same language.

```
System A:  {"type": "TASK", "from": "alice", "body": "build binary"}
System B:  =TASK("bob", "build binary")
```

The bridge translates between these two formats so you don't have to maintain two parallel coordination protocols.

---

## The Big Picture

```
┌─────────────────┐         ┌─────────────────┐
│  I2I Fleet       │         │  Spreadsheet    │
│                  │         │  Fleet          │
│  agent alice ────┼──bottle─┼──►              │
│  says "build"    │         │   cell B3:      │
│                  │         │   =TASK(...)    │
│  agent alice ◄──┼──bottle─┼───              │
│  hears "done"    │         │   cell C5:      │
│                  │         │   =STATUS(...)  │
└─────────────────┘         └─────────────────┘
         │                        │
         └────────── Bridge ──────┘
```

The bridge sits between them. It's just a Python import — no servers, no daemons, no configuration files.

---

## Step 1: What do you have?

Check what kind of data your system already holds.

**If you have a Python dict that looks like this:**
```python
{"type": "STATUS", "from": "oracle2", "body": "ready"}
```

That's an **I2I bottle**. You need `bottle_to_formula()`.

**If you have a string that looks like this:**
```
'=STATUS("oracle2", "ready")'
```

That's a **cell formula**. You need `formula_to_bottle()`.

---

## Step 2: Translate

### Going I2I → Spreadsheet (bottle → formula)

```python
from bridge import bottle_to_formula

bottle = {
    "type": "TASK",
    "from": "forgemaster",
    "body": "build binary"
}
formula = bottle_to_formula(bottle)
print(formula)
# =TASK("forgemaster", "build binary")
```

That formula string can now be written into a spreadsheet cell (Google Sheets, Excel, LibreOffice Calc, or any custom grid).

### Going Spreadsheet → I2I (formula → bottle)

```python
from bridge import formula_to_bottle

formula = '=STATUS("oracle2", "decomposed")'
bottle = formula_to_bottle("C5", formula)
print(bottle)
# {'type': 'STATUS', 'cell': 'C5', 'from': 'oracle2', 'body': 'decomposed'}
```

Now you can pass that bottle to your I2I agent for processing.

---

## Step 3: Verify the round-trip

The bridge guarantees that translation preserves identity:

```python
from bridge import round_trip

original = {"type": "STATUS", "from": "oracle2", "body": "ready"}
assert round_trip(original) == True
# → True. The type, sender, and body all survive.
```

---

## Step 4: Use it in a real flow

### Example: I2I Agent sends a task to a Spreadsheet Agent

```python
from bridge import bottle_to_formula, formula_to_bottle

# Step A: I2I agent "forgemaster" wants "oracle2" to decompose FUN_123
task_bottle = {"type": "TASK", "from": "forgemaster", "body": "decompose FUN_123"}
task_formula = bottle_to_formula(task_bottle)
# → '=TASK("forgemaster", "decompose FUN_123")'

# Step B: Write into a cell
write_to_grid_cell("A1", task_formula)

# Step C: Spreadsheet agent processes it, writes status back to B1
write_to_grid_cell("B1", '=STATUS("oracle2", "decomposed: 3 fragments")')

# Step D: I2I agent reads the response
response_formula = read_from_grid_cell("B1")
response_bottle = formula_to_bottle("B1", response_formula)
# → {'type': 'STATUS', 'cell': 'B1', 'from': 'oracle2', 'body': 'decomposed: 3 fragments'}
```

---

## Type Cheat Sheet

| Your I2I Message | The Bridge Produces |
|---|---|
| `{"type": "STATUS", ...}` | `=STATUS("from", "body")` |
| `{"type": "TASK", ...}` | `=TASK("from", "body")` |
| `{"type": "ACK", ...}` | `=STATUS("from", "body")` |
| `{"type": "CHECKPOINT", ...}` | `=CHECKPOINT("from", "body")` |
| `{"type": "BLOCKER", ...}` | `=IF("from", "body", "to")` |
| `{"type": "CHALLENGE", ...}` | `=IF("from", "body", "to")` |
| `{"type": "SPLINE", ...}` | `=INVARIANT("from", "body")` |
| `{"type": "SYNTHESIS", ...}` | `=COMPOSE("from", "body", "to")` |
| `{"type": "BOTTLE", ...}` | `=BOTTLE("from", "body")` |
| `{"type": "DELIVERABLE", ...}` | `=DELIVERABLE("from", "body")` |
| `{"type": "SESSION", ...}` | `=SESSION("from", "body")` |

---

## I still don't get it — walk me through a full conversation

### Scenario

- **Alice** (I2I agent) needs **Bob** (spreadsheet agent) to run a build
- Bob will report back when done

### Step-by-step

```
1. Alice creates:     {"type": "TASK", "from": "alice", "body": "build binary"}
2. Bridge translates: =TASK("alice", "build binary")
3. Written to cell:   A1
4. Bob reads cell A1, runs the build
5. Bob writes cell:   =STATUS("bob", "build complete")
6. Bridge translates: {"type": "STATUS", "cell": "B1", "from": "bob", "body": "build complete"}
7. Alice receives the bottle → coordination achieved ✅
```

### Code version

```python
from bridge import bottle_to_formula, formula_to_bottle

# Alice → Bob
task = {"type": "TASK", "from": "alice", "body": "build binary"}
grid.write("A1", bottle_to_formula(task))

# ... time passes, Bob works ...

# Bob → Alice
response = grid.read("B1")  # '=STATUS("bob", "build complete")'
bottle = formula_to_bottle("B1", response)
# bottle == {'type': 'STATUS', 'cell': 'B1', 'from': 'bob', 'body': 'build complete'}
alice_channel.send(bottle)
```

---

## Common Questions

**Q: Do I need a server?**  
No. The bridge is a pure Python module — you import it and call functions. You need some transport mechanism (harbor directory, grid watcher, HTTP, files) but the bridge itself is stateless.

**Q: What happens if the formula has a syntax error?**  
`formula_to_bottle` attempts to parse. If it can't find a function name, it returns a default `STATUS` bottle with the raw formula as body.

**Q: I have 100 agents. Does the bridge scale?**  
It's O(1) per translation call — pure Python string operations. No locks, no state, no bottlenecks. Pair it with your existing transport layer.

**Q: Can I extend the type mapping?**  
Modify `TYPE_TO_FORMULA` and `FORMULA_TO_TYPE` dicts in `bridge.py`. Add your custom I2I type → formula function mapping.

**Q: My spreadsheet uses `=IF()` differently — can I customize?**  
Yes. The IF handling is hard-coded for 3-arg patterns (condition, true, false). If your spreadsheet uses IF differently, subclass or patch `bottle_to_formula`.

---

## Next Steps

- Read `AGENT.md` — integration patterns for production use
- Read `CROSS_REFERENCE.md` — complete type/function reference
- Run `python bridge.py` — the self-test prints every translation live
- Import into your project: `from bridge import bottle_to_formula, formula_to_bottle`
