# Plan: OpenRoom MUD — Gamified Agent Development Environment MVP

## Vision
Build an MVP webapp that realizes the core of the OpenRoom-as-MUD vision from the architecture document. A gamified development environment where:
- **Repos become Rooms** — navigable MUD-style spaces with distinct themes
- **Agents become NPCs** — summonable entities (Scholar, Scout, Builder, Critic, Commander, Alchemist) with visual presence
- **Block Coding** — Scratch/ScratchJr-style visual blocks for agentic programming (the "Agentic Scratch" layer)
- **Frontend Builder** — visual drag-and-drop component builder that outputs real React components
- **PLATO Knowledge Tiles** — visible as interactive artifacts in rooms
- **Gamification** — levels, quests, room "cleared" states, agent progression
- **MUD Commands** — natural language command bar for agent interaction

## Skill: vibecoding-webapp-swarm (React + TypeScript + Tailwind)

## Stages

### Stage 1: Design & Architecture (Design Agent)
- **Agent**: Design_Agent
- **Goal**: Design PRD with full game mechanics, visual style, screen flows
- **Key design decisions**:
  - Room rendering: top-down 2.5D MUD grid (feasible, evocative)
  - Agent sprites: 6 armor types with distinct visual designs
  - Block coding: custom block system inspired by Scratch
  - Frontend builder: drag-and-drop canvas with component palette
  - Command parser: MUD-style natural language input
  - Color palette: warm low-saturation tones, not blue-purple gradients

### Stage 2: Core Game Engine & Room System (Core_Dev Agent)
- **Agent**: Core_Dev
- **Goal**: Build the MUD room system, navigation, player state, room rendering
- **Features**:
  - Grid-based room layout with walls, doors, interactive objects
  - Player avatar with smooth movement
  - Room transitions with visual effects
  - Multiple themed rooms (Hub, Workshop, Archive, Forge, Observatory)
  - Camera system following player

### Stage 3: Agent System & UI (Agent_Dev Agent)
- **Agent**: Agent_Dev
- **Goal**: Build the agent summoning, interaction, and visualization system
- **Features**:
  - Agent summon UI (6 armor types)
  - Agent dialogue system with typed text
  - Agent task delegation interface
  - A2UI-inspired rich output rendering (text, code, tables, status badges)
  - Agent state visualization

### Stage 4: Block Coding System (Blocks_Dev Agent)
- **Agent**: Blocks_Dev
- **Goal**: Build the "Agentic Scratch" visual programming system
- **Features**:
  - Draggable blocks (trigger, action, condition, loop, agent)
  - Block categories with colors
  - Visual workspace with snapping
  - Code generation from blocks (JavaScript output)
  - Execution simulation
  - Save/load programs

### Stage 5: Frontend Builder (Builder_Dev Agent)
- **Agent**: Builder_Dev
- **Goal**: Build the gamified frontend builder
- **Features**:
  - Component palette (buttons, text, images, containers, forms)
  - Drag-and-drop canvas
  - Property inspector
  - Preview mode
  - Export as React component code
  - Agent-assisted design suggestions

### Stage 6: Integration & Polish (Polish Agent)
- **Agent**: Polish_Dev
- **Goal**: Integrate all systems, add gamification, polish
- **Features**:
  - Quest system with objectives
  - XP/level progression
  - Room completion states
  - Sound effects and ambient audio
  - Particle effects for agent summoning
  - Responsive design
  - Tutorial/onboarding flow

### Stage 7: Deploy
- Deploy to production via deploy_website
