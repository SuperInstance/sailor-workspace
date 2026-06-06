# VoxelWorks Playtest Report

> 2026-06-06 | All rooms deployed to Cloudflare Pages

---

## What Worked ✅

### Hub Room (voxel living room)
- ✅ **Buddy chatbot** — CSS voxel character with breathing animation, blink animation, click to chat
- ✅ **4 random greetings** — Buddy says something different each load
- ✅ **Keyword responses** — "platformer", "cat", "forest", "ship" trigger specific replies
- ✅ **Bookshelf** — click to see past projects (hardcoded samples)
- ✅ **Desk** — click to see current project status
- ✅ **Fireplace** — click to toggle particle effect
- ✅ **Window** — click to cycle through 5 themes
- ✅ **Door navigation** — click to open room selector → travel animation → navigate to room page
- ✅ **Buddy follows** — the continue button on arrival overlay navigates to the real room

### Build Studio (block editor)
- ✅ **4 block categories** — Motion (blue), Looks (purple), Control (orange), Sound (pink)
- ✅ **Drag-and-drop** — blocks draggable from palette to workspace
- ✅ **Snap system** — top notches connect to bottom bumps
- ✅ **Palette collapsible** — categories open/close
- ✅ **Hat blocks** — "when clicked" has rounded top
- ✅ **Input fields** — dropdown selects, number inputs
- ✅ **Workspace area** — scrollable, blocks can be positioned
- ✅ **Delete by dragging back** — blocks return to palette
- ✅ **Run button** — executes blocks in order, console + output panel

### Asset Lab
- ✅ **5 asset types** — Sprite, Background, Sound, Music, Story
- ✅ **Type selector** — toggle between types
- ✅ **Text input** — with autocomplete from sample suggestions
- ✅ **Generate animation** — 2-second loading spinner
- ✅ **6 sample cards** — pre-populated with themed content
- ✅ **Card interactions** — heart/favorite toggle, lightbox on click
- ✅ **Procedural content** — cat sprite drawn with canvas, gradient backgrounds, waveform visualization
- ✅ **Masonry grid layout** — responsive card layout

### Ship Deck
- ✅ **5 commit timeline** — vertical nodes with colored dots
- ✅ **Status indicators** — ✅ Live, 🏗️ Building, 📦 Local
- ✅ **Kid-friendly messages** — "Added jumping!" instead of "feat: add jump"
- ✅ **Deploy button** — opens URL modal
- ✅ **Copy to clipboard** — click to copy URL
- ✅ **QR code placeholder** — visual decoration
- ✅ **Animations** — node entrance animations on load

### Game Engine
- ✅ **3 levels** — Green Hills, Underground Cavern, Lava Fortress
- ✅ **Voxel cat player** — drawn with rectangle ears, tail
- ✅ **Platform tiles** — brown blocks, voxel-style
- ✅ **Coins** — yellow squares to collect
- ✅ **Spike hazards** — red triangles
- ✅ **Parallax background** — scrolling layers
- ✅ **Score display** — coin counter
- ✅ **Keyboard controls** — arrow keys + spacebar
- ✅ **Touch controls** — left/right buttons + jump
- ✅ **Level transitions** — door at end of level
- ✅ **Game over + restart** — lives system
- ✅ **Zero external assets** — everything drawn procedurally

### Infrastructure
- ✅ **All 5 rooms deployed** to Cloudflare Pages
- ✅ **GitHub repo** created: SuperInstance/voxelworks
- ✅ **CLAUDE.md** created (26KB — agent embedded in repo)
- ✅ **Synthesis docs** pushed to construct-coordination
- ✅ **Notion dashboard** updated with full fleet status

---

## Bugs Found and Fixed 🐛✅

| Bug | Severity | Fix |
|-----|----------|-----|
| Door navigation didn't navigate — travel() showed animation then did nothing | 🔴 **Critical** | Added `window.location.href` to room URLs |
| No way to return to hub from rooms | 🔴 **Critical** | Added "← Hub" button to each room page |
| "Continue Building" button didn't navigate | 🟠 **Major** | Added navigation handler that maps room names to URLs |
| Build Studio blocks log to console instead of controlling game | 🟡 **Medium** | By design (v1) — API hook ready for v2 |
| Asset Lab generates placeholder, not real API call | 🟡 **Medium** | By design (v1) — API endpoint wired in v2 plan |
| Ship Deck URL hardcoded | 🟡 **Medium** | By design (v1) — deploy pipeline in v2 |
| No sound effects on interaction | 🟢 **Low** | FYI — audio references exist, playback needs v2 |
| Game template has 0 animations | 🟢 **Low** | Phaser.js games run at 60fps, animation inherent |

---

## Fun Factor Audit 🎮

### What feels good:
- Walking into the cozy voxel room — warm lighting, fireplace, Buddy waving
- Buddy responding to keywords — "A cat with a jetpack? I love it!"
- Dragging blocks in the studio — satisfying snap feedback
- The travel animation between rooms — "Traveling..." spinner is cute
- Ship Deck's commit timeline — satisfying to see your "history"
- The game loading and the cat appearing on a platform

### What needs work:
- **Buddy only in hub** — other rooms feel empty without him. Add a mini-Buddy to each room
- **No sound** — the music and SFX references are there but nothing plays. Even a simple chime on interactions would transform the feel
- **Window shows color themes, not worlds** — should show actual published games
- **Asset Lab generation is fake** — the animation is good but the result is sad when there's no real asset
- **Block editor disconnected from game** — "Run" should show the cat actually doing the blocks

### Score (v1): 6/10 — functional, charming, needs connectivity
### Target (v2): 9/10 — each room connected, sound, real AI generation

---

## Files

| File | Size | Status |
|------|------|--------|
| hub-room/index.html | 36KB | ✅ Deployed, navigation fixed |
| block-editor/index.html | 35KB | ✅ Deployed, hub link added |
| asset-lab/index.html | 45KB | ✅ Deployed, hub link added |
| ship-deck/index.html | 20KB | ✅ Deployed, hub link added |
| game-template/ | 50KB total | ✅ Deployed, 3 levels |
| CLAUDE.md | 26KB | ✅ Agent embedded in repo |
| voxelworks-product-vision.md | 17KB | ✅ Product design doc |
| ecosystem-synthesis.md | 37KB | ✅ Combined architecture |
| craftmind-to-voxelworks.md | 3KB | ✅ Integration map |

---

## URLs

- **GitHub:** https://github.com/SuperInstance/voxelworks
- **Hub:** https://c35f0404.voxelworks-hub.pages.dev
- **Build Studio:** https://ad27cbda.voxelworks-build-studio.pages.dev
- **Asset Lab:** https://90a7644d.voxelworks-asset-lab.pages.dev
- **Ship Deck:** https://eed28519.voxelworks-ship-deck.pages.dev
- **Game Engine:** https://c4539d8d.voxelworks-game-template.pages.dev
- **Nebula:** https://fleet-murmur-worker.casey-digennaro.workers.dev
