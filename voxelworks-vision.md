# VoxelWorks — Build Worlds, Not Code

> A game about making games. For kids who want to build, not learn syntax.

## The Core Insight

**Scratch proved that kids will program if the UI is visual and immediate.**
**Minecraft proved that kids will build entire worlds if the medium is voxels.**
**AI proved that kids will create anything if they can just *ask*.**

VoxelWorks is all three at once. A voxel world where every block is a tool, every room is a workspace, and every creation is a real, deployed, shareable web app.

## The Kid's Experience

### Enter the World
You open VoxelWorks and land in a cozy voxel room. A blocky AI buddy waves at you.

> **Buddy:** "Hey! What should we build today?"

### Say What You Want
You type (or speak):

> **You:** "Make me a platformer game with a cat character that collects coins."

The room changes. Blocks rearrange themselves. A platformer template appears.

### Build with Blocks
In the **Build Studio**, you see Scratch-like snap-together blocks:

```
🟩 when flag clicked
🟦 move 10 steps
🟪 say "Meow!"
🟨 if touching coin → collect it
```

You drag them. They snap. The game updates live.

### Generate Assets
In the **Asset Lab**, you type:

> **"Make the cat orange with stripes"**

The sprite changes. You're not drawing — you're *describing*.

> **"Add a forest background"**

The scenery appears. Every asset is prompt-generated, then tweakable.

### Ship It
In the **Ship Deck**, you see a git log of everything you've built:

```
feat: add player jump
feat: generate cat spritesheet
feat: create forest background
feat: add coin collect sound
```

One button: **🌍 Share World**

You get a URL. You send it to your friend. They open it in their browser — it works.

## The Rooms

| Room | Looks Like | You Do Here |
|------|-----------|-------------|
| **🏡 Hub** | Voxel living room | Chat with Buddy, see your worlds, pick a project |
| **🎨 Build Studio** | Workbench with block shelves | Snap Scratch-like logic blocks, game runs in preview |
| **✨ Asset Lab** | Gallery with generative frames | Prompt sprites, backgrounds, music, sounds, story |
| **🚀 Ship Deck** | Launch console with commit log | See version history, deploy, share, remix |
| **📦 Library** | Archived worlds on shelves | Browse published worlds, remix others' creations |

## The Tech Stack (Child-Proofed)

```
Kid: "make me a platformer with a cat"
  ↓
Nebula reflex: matches "make me a" → spawns builder
  ↓
Claude Code: generates Phaser.js game code
  ↓
Asset generator: creates sprites + sounds via AI
  ↓
Cloudflare Pages: deploys to {slug}.pages.dev
  ↓
GitHub: commits "feat: platformer with cat character"
  ↓
Kid sends URL to friend → friend opens → friend remixes
```

Everything is real. Every creation is a GitHub repo. Every "save" is a commit. Every "share" is a deploy. The kid never knows — they're just building.

## Why Kids Will Love It

| What they get | How it feels |
|---------------|-------------|
| A game that they made | "I built this" — the most powerful feeling for a kid |
| A URL to share | "Play my game" — no install, no download |
| Instant results | "I asked for a cat and it appeared" — magic |
| Room to grow | Start with click-and-drag, graduate to prompts, eventually read the code |
| Community | Browse the Library, remix friends' worlds, build together |

## Why It Goes Viral

1. **Make something → Share it → Someone else remixes it** — every creation is a seed
2. **The output is a real game** — not a tutorial, not a screenshot, not a file
3. **Zero onboarding** — open the site, Buddy greets you, start building
4. **Generative surprise** — "what if I ask for...?" is endlessly satisfying
5. **Social by default** — every world is a URL, every URL is shareable

## The Name

**VoxelWorks** — a workshop made of voxels. You build worlds using worlds.

## Running Prototype

The first template (countdown timer) is live:
- **https://make-japan-trip-countdown.pages.dev** — built by saying "make me a countdown"

Next templates needed for the platformer demo:
- [ ] Phaser.js game template (platformer, top-down, puzzle)
- [ ] Scratch-block renderer (drag-and-drop logic blocks)
- [ ] Asset generation pipeline (text → sprite via AI)
- [ ] Room navigation (voxel world with clickable rooms)
- [ ] Ship Deck UI (git log visualization for kids)

## Who Builds It

The same fleet that built everything else:
- **Nebula** — intent parsing, reflex matching
- **Claude Code** — game code generation
- **Kimi Code** — cross-template stitching, architecture
- **Mini-agents** — parallel asset generation, deploy, docs
- **Cloudflare** — hosting, KV, DO for multiplayer
- **GitHub** — versioning, CI, collaboration
- **Notion** — project dashboard, design docs
- **You** — the conversation is the building

---

*"A game about making games. Powered by the fleet. Built by conversation."*
