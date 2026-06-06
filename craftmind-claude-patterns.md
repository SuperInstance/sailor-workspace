# CraftMind CLAUDE.md Pattern Analysis

## 1. Agent Instruction Patterns

### Shared Structure (All Modules)

```
Project Overview → Architecture → File Structure → Current State →
Improvements → Integration → Testing → Environment → Development Guidelines
```

### Header Formats
- **Standard**: `# CraftMind [Name] - Developer Guide`
- **Exception (Fishing)**: `# CraftMind Fishing — Claude Code Agent Prompt` with direct "You are working on..." framing
- **Alternative**: `# CraftMind [Name]` (Studio, Ranch, Disc Golf)

### Opening Patterns
| Module | Opening Style |
|--------|--------------|
| Fishing | Direct agent address: "You are working on **craftmind-fishing**" |
| Courses | Philosophy statement: "Core Philosophy: Learning through guided discovery" |
| Researcher | Purpose-driven: "is an AI self-improvement system for Minecraft bots" |
| Ranch | Concept-first: "genetic evolution engine" |
| Others | Feature list + overview |

### Critical Notes Section (Fishing-only)
Fishing uniquely includes a **"Critical: This is an ESM Project"** section with CJS interop patterns for `rcon-client`.

---

## 2. Standard Template Structure

```markdown
# CraftMind [Module] - [Subtitle]
## Project Overview
## Architecture (ASCII diagram + core systems)
## File Structure (tree with comments)
## Current State (✅ completed, 🚧 TODO, test counts)
## 5 Most Impactful Improvements (ranked by effort/impact)
## Core Integration (registerWithCore pattern)
## Testing (npm test, demo scripts)
## Environment Variables
## Development Guidelines
```

---

## 3. Code Extension Instructions

| Module | Extension Style |
|--------|----------------|
| **Fishing** | Rules-based: "Script filename MUST match", "FISH EVERY LOOP", checklist |
| **Herding** | "Adding New Dog Personalities" with full code example |
| **Ranch** | "Extension Points" section: custom species, tasks, fitness functions |
| **Courses** | "Adding a New Step Type" + "Extending Teaching Styles" with code |
| **Studio** | "Key Design Decisions" + "Future Roadmap" |
| **Researcher** | "5 Potential Improvements" with impact analysis |
| **Disc Golf** | "Core Integration" with full integration code block |
| **Circuits** | "5 Improvements for v1.1" ranked by effort |

### Three Common Extension Patterns
1. **Code-First** - Full code example (Herding, Courses)
2. **Rules Checklist** - Bullet validation rules (Fishing)
3. **Extension Points List** - "Add to X in Y.js" (Ranch)

---

## 4. Deployment Patterns

### Core Registration (Universal)
```javascript
import { registerWithCore } from 'craftmind-[module]';
registerWithCore(core);
```

### Module-Specific Exposure
| Module | Exposed Modules |
|--------|-----------------|
| Studio | produce(), startServer(), generateShotList(), StudioLot, StarRegistry |
| Courses | Course, NPCTeacher, Progress, WorldBuilder, Curriculum, SkillTree, Quiz |
| Researcher | runCycle(), KnowledgeBase, DiscoveryAgent, Experiment, CriticAgent |
| Ranch | Population, EvolutionEngine, SPECIES, createDNA, calculateFitness, TASKS |
| Circuits | RedstoneValidator, TutorBot, Academy, DailyChallengeGenerator, Scoreboard |
| Fishing | fishingPlugin, scriptEngine, moodSystem, BotAssignments |
| Herding | HerdingDog, DogTeam, Flock, Pasture, HerdingActions, Scoring |
| Disc Golf | GolfScriptRunner, simulateThrow, DiscDatabase, DiscSelector |

### Environment Variables
- `ZAI_API_KEY` - All LLM-enabled modules (Fishing, Courses, Researcher, Studio, Circuits)
- `RCON_PORT` (25575), `MC_SERVER_PORT` (25565) - Fishing
- `MC_HOST`, `MC_PORT` - Courses

### Deployment Notes
- **No CI/CD documented** across any module
- All use ES modules (`"type": "module"`)
- No Docker/containerization mentioned
- Local development focus only

---

## 5. Cross-Cutting Patterns

### State Persistence
| Module | Storage |
|--------|---------|
| Fishing | Per-server stat files |
| Ranch | data/default-dna/ |
| Researcher | knowledge/discovered/*.json |
| Courses | progress/{studentName}.json |
| Circuits | JSON data files (challenges, achievements) |
| Studio | data/ knowledge/ persistence |
| Disc Golf | assets/ disc images |
| Herding | data/ (courses, teaching) |

### LLM Integration
- **Provider**: ZAI API (glm-4.7-flash) across all AI features
- **Fallback**: Deterministic/scripted when API unavailable

### Script Engine Pattern (Fishing, Herding, Disc Golf, Courses)
```javascript
export default new Script('name', 'Description', [
  Step.chat({ 0.5: 'Hello', 0.3: 'Hey', 0.2: null }),
  Step.fish(),  // module-specific
  Step.wait(2000)
]);
```

---

## 6. Module-Specific Unique Patterns

| Module | Unique Feature |
|--------|----------------|
| **Fishing** | ESM/CJS interop, Chat rate limiting, Night shift daemon, Telemetry |
| **Studio** | Save the Cat beat sheet, Cinematography rules, Mineflayer viewer |
| **Courses** | Spaced repetition (SM-2), Discovery zones, Teaching styles, Skill trees |
| **Researcher** | Citation network, Literature review, Statistical analysis |
| **Ranch** | DNA crossover/mutation, Species registry, Evolution pipeline |
| **Herding** | Boids algorithm, Dog personalities, Pack dynamics |
| **Circuits** | Redstone validation, Achievement system, Agent control bridge |
| **Disc Golf** | 3D physics engine, Disc database, Heuristic AI |

---

## 7. Recommendations for New CraftMind Modules

1. Use the standard template structure
2. Include `registerWithCore()` pattern for integration
3. Document state persistence locations explicitly
4. Provide code examples for extensions
5. Include ASCII architecture diagrams
6. List "5 Most Impactful Improvements" ranked by effort
7. Document environment variables (ZAI_API_KEY if LLM used)
8. Include testing commands
9. Specify ES module status (if using CJS interop)
10. Add "Critical Notes" section for project-specific gotchas
