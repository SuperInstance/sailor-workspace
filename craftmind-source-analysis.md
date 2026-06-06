# CraftMind Source Structure & Architecture Analysis

## Overview

Analysis of 8 craftmind repos covering the codebase landscape.

## 1. Repository Size & Complexity

| Repo | src/ files | src/ lines | Total JS | Tests | Docs |
|------|-----------|-----------|---------|-------|------|
| **craftmind-fishing** | 152 | 42,480 | 49,546 | 12 | 5 |
| **craftmind-studio** | 39 | 9,647 | 13,123 | 11 | 6 |
| **craftmind-courses** | 31 | 7,529 | 9,292 | 4 | 1 |
| **craftmind-researcher** | 23 | 5,496 | 6,828 | 3 | 2 |
| **craftmind-herding** | 22 | 5,420 | 6,812 | 3 | 2 |
| **craftmind-ranch** | 21 | 4,563 | 5,325 | 3 | 1 |
| **craftmind-circuits** | 18 | 3,340 | 4,189 | 3 | 0 |
| **craftmind-discgolf** | 11 | 3,132 | 3,723 | 1 | 0 |
| **TOTAL** | **317** | **81,607** | **98,838** | **40** | **17** |

### Key finding: Fishing dominates — 52% of all source code. The ecosystem is lopsided.

## 2. Architectural Module Categories

### Tier 1: Full Open-World Simulators
These repos have the most complex architectures, with world simulation, NPC systems, and gameplay mechanics.

**craftmind-fishing** (152 src files):
- **AI Layer**: agent-manager, behavior-tree, decision-engine, personality, story-generator, script-evolver, multi-agent coordination
- **World Layer**: weather, tides, biomes, fish spawning, ecosystem, seasonal cycles
- **Economy**: market simulation, permit system, CFEC data, ex-vessel prices, financial tracking
- **Minecraft Integration**: mineflayer plugin (2038 lines), script engine, resilient controller, vision, survival, stuck detection
- **Personality Scripts**: 33 scripts across v1-v5 (aggressive, social, stoic, veteran, troller, etc.)
- **Town Simulation**: NPC system, harbor, radio, town events, buildings
- **Wildlife**: bears, birds, marine mammals, predation
- **Regulations**: Alaska fishing regulations, game warden enforcement

**craftmind-studio** (39 src files):
- **Production Pipeline**: camera, composition, director, post-production, sound design, renders
- **Script Systems**: script engine, dialogue beats, storyboard, takes, timeline
- **AI Agents**: director evaluator, script evolver, studio interactions, story generator
- **Meta Systems**: audience, awards, competitor studios, crisis events, era progression, star system
- **Economics**: finance, studio lot management

### Tier 2: AI-Powered Game Systems
These are focused gameplay modules with deep AI integration.

**craftmind-courses** (31 src files):
- **Education Systems**: course/lesson flow, adaptive difficulty, spaced repetition (SM-2), quizzes
- **AI Teachers**: 4 teacher personalities, socratic engine, teaching styles, teaching evaluator
- **Peer Learning**: NPC classmates, peer teaching mechanics
- **Progress Tracking**: skill trees, achievements, student tracker, progress persistence
- **Script Engine**: stochastic step system (v1-socrates, v1-encourager, v1-tough-love)
- **World Building**: classroom world, programmatic building

**craftmind-researcher** (23 src files):
- **Knowledge Systems**: knowledge base, knowledge transfer, literature review, citation network
- **Discovery Pipeline**: discovery agent, experiment engine, hypothesis tracker, paper generation
- **Agent Layer**: research agents, critic agent, teacher agent, distiller agent, peer review
- **Validation**: experiment evaluator, validator, statistics

**craftmind-ranch** (21 src files):
- **Evolution Engine**: DNA system, species, population, fitness, evolution engine
- **Farm Systems**: farm tasks, routing, simulation, experiments
- **Visualization**: dashboard, species display, visualization
- **AI Layer**: animal agents, genetics evaluator, ranch NPCs, story generator

### Tier 3: Focused Game Modules
Smaller, more contained repos with clear scope.

**craftmind-herding** (22 src files):
- **Flock Simulation**: boids algorithm (separation, alignment, cohesion), terrain
- **Dog AI**: herding dog state machine, pack dynamics, dog trust, personality axes
- **Script Engine**: stochastic behavior scripts (v1-biscuit, old-blue, rex, thunder)
- **Game Systems**: courses, scoring, seasons, teachings, multi-dog coordination

**craftmind-circuits** (18 src files):
- **Challenge System**: 34 challenges across 5 tiers, adaptive difficulty
- **AI Agents**: Sparky, Professor Ohm, Debug Fairy, Competitor Chip
- **Tutor System**: ZAI-powered tutor bot, debug assistant, circuit optimizer
- **Cross-Game Bridge**: agent control bridge (circuits → fishing/herding/ranch)
- **Progression**: academy, achievements, power-ups, scoreboard
- **Minecraft**: redstone validator, sandbox, world editing

**craftmind-discgolf** (11 src files):
- **Physics Engine**: 3D disc flight simulation (drag, lift, spin decay, wind)
- **Disc Database**: 70+ real discs with authentic flight numbers
- **Script Engine**: personality scripts (stoic, showboat, caddy, veteran)
- **AI**: heuristic disc selector (distance, wind, obstacles → disc recommendation)
- **Course System**: course builder, scorecard

## 3. Shared Architectural Patterns

### Pattern A: Script Engine (Universal)
Every game module has a script engine for NPC personality/behavior:

```
script-engine.js → v1-*.js personality scripts
  - Stochastic step types (chat, wait, action, fish/throw/herd/etc.)
  - Weighted random selection for natural variety
  - Mood/energy/chattiness tracking
  - Goto/loop for perpetual behavior cycles
```

Used in: Fishing, Herding, Disc Golf, Courses, Studio, Circuits

### Pattern B: registerWithCore() (Universal)
Every module exposes a standard plugin registration:

```javascript
export function registerWithCore(core) {
  core.registerPlugin('module-name', {
    name: 'CraftMind Module',
    version: '1.0.0',
    modules: { ... },
  });
}
```

### Pattern C: AI Agent Layer (6/8 repos)
```
src/ai/  ← dedicated AI subdirectory
  - personality.js / agent-configs.js
  - action-schema / action-executor / action-planner
  - evaluator.js (comparative evaluation)
  - story-generator.js
```

Used in: Fishing, Studio, Courses, Researcher, Herding, Circuits, Ranch

### Pattern D: ZAI API Integration (5/8 repos)
```
ZAI API (glm-4.7-flash) → LLM-powered dialogue/hints/teaching
Fallback: deterministic/scripted responses when API unavailable
```

Used in: Fishing, Studio, Courses, Researcher, Circuits

### Pattern E: Stochastic Behavior Scripts (5/8 repos)
```
Step.chat() + Step.action() + Step.wait() + goto loop
Weighted probability pickers for natural variation
Null returns for silence (20-40% of the time)
```

### Pattern F: Mineflayer Minecraft Integration (5/8 repos)
```
mineflayer bot → connect to Minecraft server
Bot pathfinding, block placement, chat, inventory
RCON for server-side commands
```

Used in: Fishing, Courses, Circuits, Herding, Disc Golf

## 4. Key Architectural Differences

### Memory/State Management
| Repo | State Structure | Persistence |
|------|----------------|-------------|
| Fishing | Per-server stat files + progress | File system |
| Courses | progress/{student}.json | File system |
| Researcher | knowledge/*.json + citation network | File system |
| Ranch | data/default-dna/ + population state | File system |
| Circuits | JSON data files (challenges, achievements) | Static data |
| Herding | Course definitions + dog state | In-memory + static data |
| Studio | Production scripts + studio state | In-memory + static data |
| Disc Golf | Disc database (static) | In-memory |

### Testing Coverage
| Repo | Tests | Coverage Pattern |
|------|-------|-----------------|
| Fishing | 226 tests | Unit + integration |
| Studio | 134 tests | Unit + integration |
| Courses | ~33 tests | Unit + integration |
| Researcher | 43 tests | Unit + integration |
| Ranch | 38 tests | Unit + integration |
| Circuits | 31 tests | Unit + integration |
| Herding | ~30 tests | Unit + integration |
| Disc Golf | 45 tests | Unit + integration |

### Event/Message Bus
- **Fishing**: Built-in chat rate limiter + command system
- **Circuits**: AgentControlBridge with conditional rules (AND/OR/NOT/XOR)
- **Courses**: Core events emitted (`courses:lesson_completed`)
- **Studio**: Event bus integration with cross-game triggers
- **Others**: No explicit event bus (direct function calls)

## 5. Module Dependency Graph

```
                    craftmind-core (hypothetical)
                    /   |   |   |   |   \   \
                   /    |   |   |   |    \   \
                  /     |   |   |   |     \   \
        circuits  courses fishing herding  ranch researcher studio
             \       |       |       |       |       |       |
              \      |       |       |       |       |       |
               → AgentControlBridge (circuits → fishing/herding/ranch)
               → CrossGameKnowledgeBridge (courses → fishing/researcher/ranch)
               → Event Bus (studio ↔ all)
               → Script Engine compatibility (fishing ↔ herding)
```

## 6. Architectural Observations

### Strengths
1. **Consistent plugin pattern** — Every module has `registerWithCore()`, making integration straightforward
2. **Self-contained** — Most modules work standalone with `node examples/demo.js`
3. **Data-driven** — AI behaviors are data-defined, making them easy to inspect and modify
4. **Rich AI personalities** — Stochastic scripts + weighted choices create surprisingly organic NPC behavior
5. **Test coverage is healthy** — All modules have test suites

### Weaknesses
1. **No shared runtime** — Each repo has its own package.json, no monorepo structure
2. **No CI/CD** — Zero documented deployment pipelines
3. **No containerization** — Everything runs raw on Node.js
4. **LLM provider lock-in** — All AI features hardcoded to ZAI API (glm-4.7-flash)
5. **No stats/schema system** — Data is raw JSON, not validated or typed
6. **Shallow mineflayer integration** — Most modules use mineflayer for bot control but don't have real Minecraft server testing
7. **Fishing dominates** — 52% of all source code is in one module, creating maintenance asymmetry
8. **No cross-module communication standard** — Circuits has AgentControlBridge, Courses has CrossGameKnowledgeBridge, but no unified protocol
