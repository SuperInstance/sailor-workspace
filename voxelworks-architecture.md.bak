# VoxelWorks Architecture

> Kid-friendly game-based dev environment — a Minecraft-meets-Scratch world where kids build and ship real games.

---

## 1. Component Architecture (React Component Tree)

### Root Layout

```
<App>
  <GameCanvas />            ← Phaser.js background (shared voxel world)
  <TopBar />                ← World name, score/gems, settings
  <Router>
    <Hub />
    <BuildStudio />
    <AssetLab />
    <ShipDeck />
    <Library />
  </Router>
  <NotificationToast />
  <AudioManager />          ← Background music, SFX singleton
</App>
```

---

### 1.1 Hub — Voxel Living Room

**Purpose:** Landing room. Buddy chatbot greets the kid, shows recent builds, offers quick actions.

```
<Hub>
  <VoxelRoom />                    ← 3D-ish isometric room rendered in Phaser
  <BuddyChatbot />                 ← Animated NPC with chat bubble
  <QuickActions>                   ← "Build a platformer", "Edit my last world"
    <ActionButton type="platformer" />
    <ActionButton type="runner" />
    <ActionButton type="puzzle" />
    <ActionButton type="last-build" />
  </QuickActions>
  <RecentBuildsGrid>               ← Thumbnails of last 4 builds
    <BuildCard *ngFor="build in recentBuilds" />
  </RecentBuildsGrid>
  <DailyQuestBanner />             ← "Build a game with 3 enemies" type quests
</Hub>
```

**State needed:**
```typescript
interface HubState {
  buddyMessage: string;         // Current chat text
  buddyAnimation: 'idle' | 'talk' | 'wave' | 'celebrate';
  recentBuilds: BuildSummary[];
  quickActions: QuickAction[];
  dailyQuest: Quest | null;
  chatHistory: ChatMessage[];
  isBuddyTyping: boolean;
}
```

**API endpoints called:**
- `GET /api/voxel/last-builds?limit=4` → populate recent builds
- `GET /api/voxel/quest/daily` → fetch daily quest
- `POST /api/voxel/buddy/chat` → send chat, get Buddy reply
- `POST /api/voxel/build` → kick off a new build from quick action

**Child components:**
- `VoxelRoom` — Phaser Canvas, room decor, ambient animations
- `BuddyChatbot` — Text bubble, avatar, type animation, voice toggle
- `QuickActions` — Action buttons, loading states
- `ActionButton` — Single action, icon + label, click handler
- `RecentBuildsGrid` — Thumbnail grid, empty state
- `BuildCard` — Thumbnail, name, date, play/edit buttons
- `DailyQuestBanner` — Quest text, progress bar, reward icon

---

### 1.2 Build Studio — Scratch-like Block Editor

**Purpose:** The main creation space. Drag-and-drop blocks on the left, live Phaser.js preview on the right.

```
<BuildStudio>
  <StudioLayout>
    <BlockPalette>                 ← Left sidebar: category tabs of blocks
      <CategoryTab label="Motion" />
      <CategoryTab label="Looks" />
      <CategoryTab label="Sound" />
      <CategoryTab label="Controls" />
      <CategoryTab label="Physics" />
      <BlockItem *ngFor="let block of categoryBlocks" />
    </BlockPalette>
    <BlockWorkspace>               ← Center: drag-drop canvas
      <WorkspaceToolbar />
      <ScriptBlock *ngFor="let script of scripts" />
      <DropTargetIndicator />
    </BlockWorkspace>
    <GamePreview>                  ← Right: live Phaser.js game
      <PhaserCanvas />
      <PreviewToolbar>
        <PlayButton />
        <PauseButton />
        <ResetButton />
        <FullscreenButton />
        <SpeedSlider />
      </PreviewToolbar>
      <FPSDisplay />
    </GamePreview>
  </StudioLayout>
  <BottomPanel>
    <SpriteSelector />             ← Select which sprite to edit
    <SoundList />                  ← Manage sounds for selected sprite
    <VariableWatcher />            ← Debug variable values during play
  </BottomPanel>
  <SaveIndicator />
  <AutoSaveToast />
</BuildStudio>
```

**State needed:**
```typescript
interface BuildStudioState {
  projectId: string;
  projectData: ProjectData;              // Full serialized project
  scripts: Script[];                      // Current block scripts
  selectedSprite: SpriteId;
  selectedCategory: BlockCategory;
  sprites: Sprite[];
  isPlaying: boolean;
  isPaused: boolean;
  gameSpeed: number;
  previewFrame: number;
  unsavedChanges: boolean;
  lastSavedAt: number;
  undoStack: ProjectSnapshot[];
  redoStack: ProjectSnapshot[];
}
```

**API endpoints called:**
- `GET /api/voxel/project/:id` → load project
- `PUT /api/voxel/project/:id` → save project (debounced auto-save)
- `POST /api/voxel/asset` → generate sprites from prompt
- `GET /api/voxel/code/:projectId` → get generated Phaser.js code
- `PUT /api/voxel/code/:projectId` → push block definitions → code sync

**Child components:**
- `BlockPalette` — Category tabs, block library, search/filter
- `CategoryTab` — Icon + label, selected state
- `BlockItem` — Draggable block, icon, label, shape
- `BlockWorkspace` — Drop target, scroll/zoom, snap grid
- `ScriptBlock` — Composable block chain, input fields, color-coded
- `DropTargetIndicator` — Visual snap guide
- `GamePreview` — Phaser.js mount, resize, play controls
- `PhaserCanvas` — Phaser Game instance wrapper
- `PreviewToolbar` — Play/pause/reset/fullscreen/speed
- `SpriteSelector` — Carousel of sprites, add/delete
- `SoundList` — Sound clips for selected sprite
- `VariableWatcher` — Live variable display during play

---

### 1.3 Asset Lab — Prompt-to-Asset Gallery

**Purpose:** Generate sprites, backgrounds, sounds, and music from natural language prompts. Gallery to browse, select, and use assets.

```
<AssetLab>
  <AssetGenerator>                 ← Main creation area
    <PromptInput>
      <TextArea placeholder="Describe your sprite..." />
      <TypeSelector />             ← sprite | bg | sound | music
      <StyleSelector />            ← pixel | cartoon | realistic
      <GenerateButton />
      <GenerateProgressBar />      ← During generation
    </PromptInput>
    <GeneratedAssetPreview>        ← Shows generated asset
      <SpritePreview />
      <SoundWaveform />
      <MusicPlayer />
      <BackgroundPreview />
    </GeneratedAssetPreview>
    <AssetActions>
      <UseInProjectButton />
      <DownloadButton />
      <RegenerateButton />
      <SaveToLibraryButton />
      <ShareButton />
    </AssetActions>
  </AssetGenerator>
  <AssetGallery>                   ← Browse existing assets
    <AssetFilterBar>
      <TypeFilter />
      <StyleFilter />
      <SearchInput />
      <SortDropdown />
    </AssetFilterBar>
    <AssetGrid>
      <AssetCard *ngFor="let asset of filteredAssets" />
    </AssetGrid>
    <Pagination />
  </AssetGallery>
</AssetLab>
```

**State needed:**
```typescript
interface AssetLabState {
  prompt: string;
  assetType: 'sprite' | 'bg' | 'sound' | 'music';
  style: 'pixel' | 'cartoon' | 'realistic' | 'fantasy';
  isGenerating: boolean;
  generationProgress: number;          // 0-100
  generatedAsset: Asset | null;
  galleryAssets: Asset[];
  galleryFilter: AssetFilter;
  selectedAsset: Asset | null;
  history: AssetGeneration[];
  creditsRemaining: number;
}
```

**API endpoints called:**
- `POST /api/voxel/asset` → generate new asset
- `GET /api/voxel/assets` → list user's assets (with filters/pagination)
- `GET /api/voxel/assets/:id` → get single asset details
- `DELETE /api/voxel/assets/:id` → delete asset
- `POST /api/voxel/assets/:id/use` → attach asset to current project
- `GET /api/voxel/credits` → check remaining generation credits

**Child components:**
- `AssetGenerator` — Main generation panel
- `PromptInput` — Text input, type/style selectors, generate button
- `GeneratedAssetPreview` — Renders generated sprite/sound/bg
- `AssetActions` — Use/download/regenerate/save/share buttons
- `AssetGallery` — Browseable gallery with filters
- `AssetCard` — Thumbnail, name, type badge, click to preview

---

### 1.4 Ship Deck — Git Log Visualization + Deploy

**Purpose:** Version control made visual. Kids see their build history as "time crystals" or "checkpoints." One-click deploy to Cloudflare Pages.

```
<ShipDeck>
  <ShipHeader>
    <ProjectTitle />
    <VersionBadge />                ← v1.0, v2.3, etc.
    <ShareLink />                   ← Copy deploy URL
  </ShipHeader>
  <DeployButton />                  ← Big, satisfying, rocket animation
  <DeployStatus />                  ← Deploying... Deployed at URL
  <TimelineVisualization>           ← Visual git log
    <TimelineCanvas>                ← Phaser-based animated timeline
      <CommitNode *ngFor="let commit of commits">
        <CommitTimestamp />
        <CommitMessage />
        <CommitThumbnail />         ← Game screenshot at this commit
        <PlayAtCommitButton />
        <RestoreButton />
      </CommitNode>
    </TimelineCanvas>
    <TimelineControls>
      <ZoomSlider />
      <FilterByTag />
      <CompareCommitsButton />
    </TimelineControls>
  </TimelineVisualization>
  <DeployHistory>
    <DeployEntry *ngFor="let deploy of deploys">
      <DeployTimestamp />
      <DeployURL />
      <DeployStatus />
      <RollbackButton />
    </DeployEntry>
  </DeployHistory>
  <ChangelogEditor>                 ← Edit deploy notes
    <TextArea placeholder="What did you add?" />
    <SaveChangelogButton />
  </ChangelogEditor>
</ShipDeck>
```

**State needed:**
```typescript
interface ShipDeckState {
  projectId: string;
  commits: Commit[];
  deploys: DeployRecord[];
  activeDeploy: DeployRecord | null;
  isDeploying: boolean;
  deployProgress: number;
  deployUrl: string | null;
  deployError: string | null;
  selectedCommits: CommitId[];
  timelineZoom: number;
  changelogText: string;
  shareUrl: string;
}
```

**API endpoints called:**
- `GET /api/voxel/project/:id/commits` → list commits
- `GET /api/voxel/project/:id/deploys` → list deploy history
- `POST /api/voxel/commit/:projectId` → create snapshot/commit
- `POST /api/voxel/deploy/:projectId` → trigger deploy
- `GET /api/voxel/deploy/:deployId` → check deploy status
- `POST /api/voxel/deploy/:deployId/rollback` → rollback deploy
- `PUT /api/voxel/project/:id/changelog` → save changelog

**Child components:**
- `TimelineVisualization` — Visual git log rendered on canvas
- `TimelineCanvas` — Phaser canvas drawing commit nodes as "crystals"
- `CommitNode` — Clickable commit with timestamp, message, thumbnail
- `DeployHistory` — List of previous deployments
- `DeployEntry` — Single deploy with URL, status, rollback
- `ChangelogEditor` — Text area for changelog notes

---

### 1.5 Library — Published Worlds Gallery

**Purpose:** Browse, play, remix, and rate published games from all VoxelWorks users.

```
<Library>
  <LibraryHeader>
    <SearchBar />
    <FilterBar>
      <GenreFilter />
      <SortFilter />                ← Trending | New | Top Rated
      <DateFilter />
    </FilterBar>
    <ViewToggle />                 ← Grid | List
  </LibraryHeader>
  <WorldGrid>
    <WorldCard *ngFor="let world of worlds">
      <WorldThumbnail />
      <WorldTitle />
      <WorldAuthor />
      <WorldStats />                ← Plays, Likes, Stars
      <PlayButton />
      <RemixButton />
      <LikeButton />
    </WorldCard>
  </WorldGrid>
  <Pagination />
  <FeaturedWorldBanner />          ← Highlighted game of the day
  <WorldDetailModal>               ← Shown on clicking a world card
    <WorldScreenshotCarousel />
    <WorldMetadata />              ← Genre, tags, created date
    <WorldDescription />
    <WorldControls>                ← Play fullscreen, remix, share
    </WorldControls>
    <CommentsSection>
      <Comment *ngFor="let comment of comments" />
      <CommentInput />
    </CommentsSection>
  </WorldDetailModal>
</Library>
```

**State needed:**
```typescript
interface LibraryState {
  worlds: WorldSummary[];
  featuredWorld: WorldSummary | null;
  searchQuery: string;
  filters: LibraryFilters;
  sortOrder: 'trending' | 'new' | 'top_rated';
  viewMode: 'grid' | 'list';
  pagination: { page: number; totalPages: number; total: number };
  selectedWorld: WorldDetail | null;
  isWorldDetailOpen: boolean;
  comments: Comment[];
  likedWorlds: Set<string>;
}
```

**API endpoints called:**
- `GET /api/voxel/library` → list published worlds (paginated, filtered)
- `GET /api/voxel/library/featured` → get featured/hot world
- `GET /api/voxel/world/:id` → get world detail
- `POST /api/voxel/world/:id/like` → toggle like
- `POST /api/voxel/world/:id/remix` → fork/remix world
- `GET /api/voxel/world/:id/comments` → get comments
- `POST /api/voxel/world/:id/comments` → add comment

**Child components:**
- `WorldCard` — Thumbnail card with stats and actions
- `FilterBar` — Dropdown filters
- `WorldDetailModal` — Full detail overlay
- `CommentsSection` — Threaded comments
- `FeaturedWorldBanner` — Hero banner for featured world

---

## 2. Data Flow: "Make me a platformer"

### End-to-End Flow Diagram

```
Kid: "make me a platformer"
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ① NEBULA REFLEX MATCHING                    ~500ms         │
│ ─────────────────────────────────────────────               │
│ Who:    Frontend → Voxel API Server                          │
│ What:   POST /api/voxel/build { text: "make me a            │
│         platformer" }                                        │
│ Data:   { intent_id, confidence: 0.94, parsed_type:         │
│         "platformer", features: ["jump","enemies","coins"],  │
│         suggested_name: "My Platformer" }                    │
│                                                              │
│ Natural Language → Intent Extraction → Plan Template         │
└─────────────────────────────────────────────────────────────┘
  │
  │ Returns { build_id: "b_abc123", status_url: "/status/b_abc123" }
  │ Frontend starts polling GET /status/b_abc123
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ② SUB-AGENT SPAWNING (Claude Code)            2-30s       │
│ ─────────────────────────────────────────────               │
│ Who:    Voxel Backend → OpenClaw Subagent Manager            │
│ What:   Spawn Claude Code sub-agent with plan template       │
│ Data:   {                                                    │
│   plan: { type: "platformer", features: [...],               │
│           sprites_needed: 3, sounds_needed: 2 },             │
│   template: "Build a Phaser.js platformer with..."           │
│   workspace: "/tmp/voxel-builds/b_abc123"                    │
│ }                                                            │
│                                                              │
│ Claude Code generates:                                       │
│   ├── index.html            (game shell)                     │
│   ├── js/game.js            (Phaser.js game logic)           │
│   ├── js/scenes/            (boot, menu, game, gameover)     │
│   ├── js/config.js          (physics, dimensions)            │
│   └── assets/               (placeholder structure)          │
│                                                              │
│ Updates status: "Building your game..."                      │
└─────────────────────────────────────────────────────────────┘
  │
  │ Claude Code exits with code 0 → status: "code_ready"
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ③ ASSET GENERATION PIPELINE                    5-15s       │
│ ─────────────────────────────────────────────               │
│ Who:    Voxel Backend → Asset Generator Service              │
│ What:   Generate sprites, background, sounds, music          │
│                                                              │
│ For each required asset:                                     │
│   POST /api/voxel/asset { prompt, type }                     │
│                                                              │
│ Parallel generation (4 concurrent):                          │
│   ├── sprite "player"  → pixel art character (2s)            │
│   ├── sprite "enemy1"  → pixel art slime    (2s)             │
│   ├── bg "forest"      → parallax bg layers (3s)             │
│   └── sound "jump"     → 8-bit jump sound   (1.5s)          │
│                                                              │
│ Assets written to: /tmp/voxel-builds/b_abc123/assets/        │
│                                                              │
│ Updates status: "Generating your sprites and sounds..."      │
│                                                              │
│ On complete: scans Claude Code's asset placeholders,         │
│ replaces them with real generated assets, updates code       │
│ references to correct filenames.                             │
└─────────────────────────────────────────────────────────────┘
  │
  │ Asset pipeline complete → status: "assets_ready"
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ④ GITHUB REPO CREATION                          2-5s       │
│ ─────────────────────────────────────────────               │
│ Who:    Voxel Backend → GitHub API                           │
│ What:   Create repo + push code + assets                     │
│ Data:   {                                                    │
│   repo_name: "voxel-b_abc123",                               │
│   description: "My Platformer - built with VoxelWorks",      │
│   private: false,                                            │
│   auto_init: false,                                          │
│   org: "voxelworks-users"                                    │
│ }                                                            │
│                                                              │
│ Steps:                                                       │
│   1. POST /user/repos (create)                               │
│   2. git init && git add . && git commit -m "🎮 Initial build"│
│   3. git remote add origin git@github.com:voxelworks/...     │
│   4. git push -u origin main                                 │
│                                                              │
│ On success:                                                  │
│   Sets up GitHub Pages (or triggers Pages deploy via API)    │
│   Adds voxelworks/.github repo webhook for deploy            │
│                                                              │
│ Updates status: "Uploading to GitHub..."                     │
└─────────────────────────────────────────────────────────────┘
  │
  │ Repo created → status: "repo_ready"
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ⑤ CLOUDFLARE PAGES DEPLOYMENT                   10-30s     │
│ ─────────────────────────────────────────────               │
│ Who:    Voxel Backend → Cloudflare Pages API                 │
│ What:   Deploy game to Cloudflare Pages                      │
│ Data:   {                                                    │
│   project_name: "voxel-b-abc123",                            │
│   build_command: null,          (static HTML/JS)             │
│   build_output: "/",                                        │
│   branch: "main",                                            │
│   repo: "voxelworks/voxel-b-abc123"                          │
│ }                                                            │
│                                                              │
│ Steps:                                                       │
│   1. POST /pages/projects (create project if new)            │
│   2. GitHub webhook triggers automatic deploy                │
│   3. Poll deploy status until success                        │
│                                                              │
│ On deploy success:                                           │
│   URL: https://voxel-b-abc123.pages.dev                      │
│                                                              │
│ Updates status: "Deploying to the world..."                  │
└─────────────────────────────────────────────────────────────┘
  │
  │ Deploy complete → status: "deployed"
  ▼
┌─────────────────────────────────────────────────────────────┐
│ ⑥ URL RETURNED TO KID                            ~0.1s     │
│ ─────────────────────────────────────────────               │
│ Who:    Frontend polling GET /status/b_abc123                │
│                                                              │
│ Response: {                                                  │
│   status: "complete",                                        │
│   url: "https://voxel-b-abc123.pages.dev",                   │
│   repo_url: "https://github.com/voxelworks/voxel-b_abc123", │
│   thumbnail: "https://...screenshot.png",                    │
│   build_time_seconds: 47,                                    │
│   stats: {                                                   │
│     lines_of_code: 847,                                      │
│     sprites_generated: 3,                                    │
│     sounds_generated: 2                                      │
│   }                                                          │
│ }                                                            │
│                                                              │
│ Frontend shows:                                              │
│   🎉 Your game is LIVE!                                      │
│   ┌──────────────────────────────────────┐                   │
│   │  🌐 https://voxel-b-abc123.pages.dev │                   │
│   │  [Play Now] [Edit More] [Share]      │                   │
│   │  Built in 47 seconds!                │                   │
│   │  847 lines • 3 sprites • 2 sounds    │                   │
│   └──────────────────────────────────────┘                   │
│                                                              │
│ Buddy the NPC does a happy dance 🕺                          │
└─────────────────────────────────────────────────────────────┘
```

### Total Time: ~20-60 seconds

| Stage | Duration | Description |
|-------|----------|-------------|
| ① Nebula Reflex | ~500ms | Intent parsing, template selection |
| ② Claude Code | 2-30s | Game code generation |
| ③ Asset Pipeline | 5-15s | Parallel AI asset generation |
| ④ GitHub Repo | 2-5s | Repo creation + push |
| ⑤ Cloudflare Deploy | 10-30s | Pages build + deploy |
| ⑥ URL Return | ~0.1s | Poll response |

### Status Polling Flow (Frontend)

```
Frontend                    Backend                    Sub-agents
   │                          │                           │
   │── POST /api/voxel/build ──→                           │
   │← { build_id, status_url } │                           │
   │                          │                           │
   │── GET /status/b_abc123 ──→│                           │
   │← { status: "pending" }   │                           │
   │                          │── Spawn Claude Code ──────→│
   │── GET /status/b_abc123 ──→│                           │
   │← { status: "building",   │                           │
   │    current_step: "code",  │                           │
   │    progress: 30 }         │                           │
   │                          │← Code complete            │
   │                          │── Spawn Asset Gen ────────→│
   │── GET /status/b_abc123 ──→│                           │
   │← { status: "assets",     │                           │
   │    progress: 50 }         │                           │
   │                          │← Assets ready             │
   │                          │── GitHub API ─────────────→│
   │                          │── Cloudflare API ─────────→│
   │── GET /status/b_abc123 ──→│                           │
   │← { status: "deploying",  │                           │
   │    progress: 80 }         │                           │
   │                          │← Deploy complete          │
   │── GET /status/b_abc123 ──→│                           │
   │← { status: "complete",   │                           │
   │    url: "...",           │                           │
   │    progress: 100 }        │                           │
   │                          │                           │
   │ 🎉 Show success screen   │                           │
```

---

## 3. API Design

### Base URL: `https://api.voxelworks.dev/api/voxel`

---

### 3.1 `POST /api/voxel/build` — Start a Build

**Description:** Kicks off the full build pipeline. Accepts a natural language or structured request. Returns immediately with a `build_id` for status polling.

**Request:**
```json
{
  "text": "make me a platformer with jumping and coins",
  "type": null,
  "name": null
}
```

- `text` (string, optional) — Natural language description. If provided, Nebula reflex parses it to extract type/features.
- `type` (string, optional) — Explicit game type: `"platformer"`, `"runner"`, `"puzzle"`, `"shooter"`, `"rpg"`, `"racing"`, `"custom"`.
- `name` (string, optional) — Desired project name. Auto-generated if omitted.

**At least one of `text` or `type` must be provided.**

**Response (202 Accepted):**
```json
{
  "build_id": "b_f3k2a1x9",
  "status_url": "https://api.voxelworks.dev/api/voxel/status/b_f3k2a1x9",
  "project_id": "proj_m7n4p2q8",
  "estimated_seconds": 45,
  "queue_position": 0
}
```

**Error Responses:**
```json
// 400 - Bad Request (missing text and type)
{
  "error": "validation_error",
  "message": "Either 'text' or 'type' must be provided",
  "details": null
}

// 429 - Rate Limited
{
  "error": "rate_limited",
  "message": "Build limit reached. Try again in 30 minutes.",
  "retry_after_seconds": 1800
}
```

**Status codes:** `202` (accepted), `400` (validation), `429` (rate limit), `500` (server error)

---

### 3.2 `GET /api/voxel/status/:build_id` — Poll Build Status

**Description:** Real-time build progress. Poll every 1-2 seconds from the frontend. Returns different fields depending on status.

**Path Parameters:**
- `build_id` (string, required) — ID returned from `/build`

**Response (200 OK):**

*In progress:*
```json
{
  "status": "building",
  "current_step": "code_generation",
  "progress": 35,
  "step_label": "Building your game...",
  "step_started_at": "2026-06-06T05:30:00Z",
  "estimated_remaining_seconds": 25,
  "logs": [
    {"ts": "2026-06-06T05:30:01Z", "level": "info", "message": "Spawning Claude Code sub-agent"},
    {"ts": "2026-06-06T05:30:05Z", "level": "info", "message": "Generating Phaser.js scenes..."},
    {"ts": "2026-06-06T05:30:12Z", "level": "info", "message": "Code generation complete"}
  ],
  "subtask_progress": {
    "total": 4,
    "completed": 2,
    "current": "Generating assets"
  }
}
```

*Complete:*
```json
{
  "status": "complete",
  "current_step": "done",
  "progress": 100,
  "url": "https://voxel-f3k2a1x9.pages.dev",
  "repo_url": "https://github.com/voxelworks/voxel-f3k2a1x9",
  "thumbnail_url": "https://cdn.voxelworks.dev/screenshots/b_f3k2a1x9.png",
  "build_time_seconds": 47,
  "completed_at": "2026-06-06T05:30:47Z",
  "stats": {
    "lines_of_code": 847,
    "sprites_generated": 3,
    "backgrounds_generated": 1,
    "sounds_generated": 2,
    "music_tracks_generated": 1
  },
  "project": {
    "id": "proj_m7n4p2q8",
    "name": "My Platformer",
    "slug": "my-platformer",
    "type": "platformer"
  }
}
```

*Failed:*
```json
{
  "status": "failed",
  "current_step": "deploy",
  "progress": 85,
  "error": {
    "code": "deploy_failed",
    "message": "Cloudflare Pages deploy failed",
    "details": "Build timeout reached after 120 seconds",
    "retryable": true
  },
  "logs": [
    {"ts": "2026-06-06T05:30:40Z", "level": "error", "message": "Deploy timeout after 120s"}
  ]
}
```

**Possible statuses:** `"pending"`, `"building"`, `"generating_assets"`, `"creating_repo"`, `"deploying"`, `"complete"`, `"failed"`

**Status codes:** `200` (OK), `404` (build_id not found), `410` (build expired)

---

### 3.3 `POST /api/voxel/asset` — Generate an Asset

**Description:** Generate a sprite, background, sound, or music track from a text prompt. Returns synchronously (or queued with polling for long generations).

**Request:**
```json
{
  "prompt": "a blue robot with antenna, pixel art style, 32x32",
  "type": "sprite",
  "style": "pixel",
  "project_id": "proj_m7n4p2q8",
  "options": {
    "width": 32,
    "height": 32,
    "palette": "retro",
    "frames": 4,
    "transparent": true
  }
}
```

- `prompt` (string, required) — Text description of the desired asset
- `type` (string, required) — One of: `"sprite"`, `"background"`, `"sound"`, `"music"`
- `style` (string, optional) — `"pixel"`, `"cartoon"`, `"realistic"`, `"fantasy"`. Defaults to `"pixel"`.
- `project_id` (string, optional) — Attach to a specific project
- `options` (object, optional) — Type-specific options:
  - For `sprite`: `width`, `height`, `frames`, `palette`, `transparent`
  - For `background`: `width`, `height`, `layers` (parallax layers count), `theme`
  - For `sound`: `duration_seconds`, `genre` (`"8bit"`, `"chiptune"`, `"sfx"`)
  - For `music`: `duration_seconds`, `tempo`, `genre`, `loop`

**Response (200 OK for fast assets, 202 for queued):**

*Synchronous (sprites <= 32x32, sounds < 3s):*
```json
{
  "asset_id": "ast_x9k2m4n7",
  "type": "sprite",
  "url": "https://cdn.voxelworks.dev/assets/ast_x9k2m4n7.png",
  "thumbnail_url": "https://cdn.voxelworks.dev/assets/ast_x9k2m4n7_thumb.png",
  "width": 32,
  "height": 32,
  "frames": 4,
  "format": "png",
  "size_bytes": 12450,
  "generated_at": "2026-06-06T05:31:00Z",
  "credits_used": 1,
  "credits_remaining": 99
}

// For sound:
{
  "asset_id": "ast_y3p5q7r9",
  "type": "sound",
  "url": "https://cdn.voxelworks.dev/assets/ast_y3p5q7r9.mp3",
  "waveform_url": "https://cdn.voxelworks.dev/assets/ast_y3p5q7r9_waveform.png",
  "duration_seconds": 0.8,
  "format": "mp3",
  "size_bytes": 15400,
  "generated_at": "2026-06-06T05:31:02Z",
  "credits_used": 1,
  "credits_remaining": 98
}

// For background:
{
  "asset_id": "ast_z1a2b3c4",
  "type": "background",
  "url": "https://cdn.voxelworks.dev/assets/ast_z1a2b3c4.png",
  "layers": 3,
  "width": 960,
  "height": 540,
  "format": "png",
  "size_bytes": 245000,
  "generated_at": "2026-06-06T05:31:05Z",
  "credits_used": 2,
  "credits_remaining": 96
}

// For music:
{
  "asset_id": "ast_d5e6f7g8",
  "type": "music",
  "url": "https://cdn.voxelworks.dev/assets/ast_d5e6f7g8.mp3",
  "duration_seconds": 30,
  "tempo": 120,
  "loop": true,
  "format": "mp3",
  "size_bytes": 480000,
  "generated_at": "2026-06-06T05:31:10Z",
  "credits_used": 5,
  "credits_remaining": 91
}
```

*Queued (long generations):*
```json
{
  "asset_id": "ast_h9i0j1k2",
  "status": "generating",
  "status_url": "https://api.voxelworks.dev/api/voxel/asset/status/ast_h9i0j1k2",
  "estimated_seconds": 8
}
```

**Error Responses:**
```json
// 400 - Invalid type
{
  "error": "validation_error",
  "message": "Invalid asset type. Must be one of: sprite, background, sound, music"
}

// 402 - Insufficient credits
{
  "error": "insufficient_credits",
  "message": "Not enough generation credits. You need 5, you have 2.",
  "credits_needed": 5,
  "credits_available": 2
}
```

**Status codes:** `200` (ready), `202` (queued), `400` (validation), `402` (credits), `413` (asset too large)

---

### 3.4 `POST /api/voxel/deploy/:project_id` — Deploy Project

**Description:** Trigger a deploy of a project to Cloudflare Pages. Creates a git commit snapshot first, then deploys.

**Path Parameters:**
- `project_id` (string, required) — The project to deploy

**Request:**
```json
{
  "changelog": "Added double jump and new enemy type",
  "version": "v1.2.0",
  "auto_increment": true,
  "publish_to_library": true
}
```

- `changelog` (string, optional) — Human-readable deploy note
- `version` (string, optional) — Semantic version. Auto-incremented if `auto_increment` is true
- `auto_increment` (boolean, optional) — Automatically bump patch version. Defaults to `true`
- `publish_to_library` (boolean, optional) — Also publish to the public Library. Defaults to `false`

**Response (202 Accepted):**
```json
{
  "deploy_id": "dep_l3m4n5o6",
  "project_id": "proj_m7n4p2q8",
  "version": "v1.2.0",
  "status": "deploying",
  "status_url": "https://api.voxelworks.dev/api/voxel/deploy/status/dep_l3m4n5o6",
  "estimated_seconds": 25,
  "url": "https://voxel-f3k2a1x9.pages.dev"
}
```

**Complete Poll Response:**
```json
{
  "deploy_id": "dep_l3m4n5o6",
  "status": "live",
  "url": "https://voxel-f3k2a1x9.pages.dev",
  "commit_sha": "a1b2c3d4e5f6...",
  "deployed_at": "2026-06-06T05:32:00Z",
  "build_duration_seconds": 22,
  "cloudflare_page_url": "https://voxel-f3k2a1x9.pages.dev",
  "library_url": "https://voxelworks.dev/library/worlds/my-platformer",
  "share_url": "https://voxelworks.dev/share/proj_m7n4p2q8"
}
```

**Status codes:** `202` (accepted), `400` (project doesn't exist), `409` (deploy already in progress), `404` (not found)

---

### 3.5 `GET /api/voxel/library` — List Published Worlds

**Description:** Browse the public library of published worlds. Paginated, filterable, sortable.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `20` | Items per page (max 50) |
| `sort` | string | `"trending"` | Sort order: `"trending"`, `"new"`, `"top_rated"`, `"most_played"` |
| `genre` | string | — | Filter by genre: `"platformer"`, `"runner"`, `"puzzle"`, `"rpg"`, `"racing"`, `"shooter"`, `"other"` |
| `search` | string | — | Full-text search on name and description |
| `author` | string | — | Filter by author username |
| `tag` | string | — | Filter by tag (e.g., `"multiplayer"`, `"hard"`, `"tutorial"`) |
| `min_rating` | number | — | Minimum star rating (1-5) |
| `age_min` | number | — | Minimum recommended age |

**Response (200 OK):**
```json
{
  "worlds": [
    {
      "id": "world_a1b2c3d4",
      "name": "Super Dino Runner",
      "author": {
        "username": "kid_coder_42",
        "avatar_url": "https://cdn.voxelworks.dev/avatars/kid_coder_42.png"
      },
      "type": "runner",
      "thumbnail_url": "https://cdn.voxelworks.dev/screenshots/world_a1b2c3d4_thumb.png",
      "description": "A fun dino runner game with jumping!",
      "version": "v2.1.0",
      "stats": {
        "plays": 15234,
        "likes": 892,
        "stars": 4.5,
        "remixes": 234,
        "comments": 45
      },
      "tags": ["dinosaur", "endless", "fun"],
      "published_at": "2026-06-01T12:00:00Z",
      "updated_at": "2026-06-05T15:30:00Z",
      "age_rating": "all",
      "has_leaderboard": true,
      "featured": true
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 543,
    "total_pages": 28,
    "has_next": true,
    "has_prev": false
  },
  "filters_applied": {
    "sort": "trending",
    "genre": null,
    "search": null
  },
  "featured_world": {
    "id": "world_z9y8x7w6",
    "name": "Maze Explorer",
    "author": { "username": "pro_dev" },
    "thumbnail_url": "https://cdn.voxelworks.dev/screenshots/featured.png",
    "stats": { "plays": 98000 }
  }
}
```

**Error Responses:**
```json
// 400 - Invalid sort parameter
{
  "error": "validation_error",
  "message": "Invalid sort value. Must be one of: trending, new, top_rated, most_played"
}
```

**Status codes:** `200` (OK), `400` (validation), `500` (server error)

---

### 3.6 Additional Endpoints

#### `GET /api/voxel/project/:project_id`

Load full project data for editing.

**Response:**
```json
{
  "id": "proj_m7n4p2q8",
  "name": "My Platformer",
  "type": "platformer",
  "scripts": [...],
  "sprites": [...],
  "sounds": [...],
  "settings": { "physics": "arcade", "width": 800, "height": 600 },
  "version": "v1.2.0",
  "last_saved_at": "2026-06-06T05:28:00Z",
  "assets": ["ast_x9k2m4n7", "ast_y3p5q7r9"]
}
```

#### `PUT /api/voxel/project/:project_id`

Save project data (debounced auto-save from frontend).

#### `DELETE /api/voxel/project/:project_id`

Delete a project and all associated data.

#### `GET /api/voxel/credits`

Check remaining generation credits.

```json
{
  "total": 100,
  "used": 8,
  "remaining": 92,
  "resets_at": "2026-06-07T00:00:00Z",
  "plan": "free"
}
```

#### `POST /api/voxel/buddy/chat`

Send a chat message to Buddy the NPC.

**Request:**
```json
{
  "message": "How do I make enemies?",
  "context": {
    "current_room": "build_studio",
    "project_type": "platformer",
    "current_step": null
  }
}
```

**Response:**
```json
{
  "reply": "Great question! Drag a 'Create Enemy' block from the palette, then use a 'When touched' block to add a game over!",
  "animation": "talk",
  "suggested_actions": [
    { "label": "Show me", "action": "highlight_block", "block_id": "create_enemy" },
    { "label": "Show example", "action": "open_example", "example_id": "enemy_tutorial" }
  ]
}
```

#### `POST /api/voxel/quest/daily`

Claim daily quest reward.

**Response:**
```json
{
  "quest": {
    "id": "quest_01",
    "title": "Build a game with 3 enemies",
    "description": "Add 3 enemy sprites to any project",
    "progress": 2,
    "target": 3,
    "reward": { "credits": 10, "gems": 50 },
    "completed": false,
    "claimed": false
  }
}
```

---

## 4. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | Component UI |
| **Game Renderer** | Phaser.js 3.x | Voxel world + game preview |
| **Block Editor** | Custom React (blockly-inspired) | Drag-and-drop code blocks |
| **Styling** | Tailwind CSS + CSS Modules | Child-friendly UI |
| **Backend API** | FastAPI (Python) / Hono (TypeScript) | RESTful API server |
| **Database** | PostgreSQL + Redis | Project data + session cache |
| **File Storage** | Cloudflare R2 / AWS S3 | Asset storage + CDN |
| **Nebula Reflex** | OpenClaw AI pipeline | Intent matching → plan dispatch |
| **Code Generation** | Claude Code (sub-agent) | Phaser.js game code |
| **Asset AI** | Stable Diffusion / Flux / ElevenLabs | Sprite + sound generation |
| **Version Control** | GitHub API | Repo creation + commit management |
| **Hosting** | Cloudflare Pages | Game deployment |
| **Auth** | Supabase Auth / Clerk | Kid-safe authentication |
| **Real-time** | WebSocket / SSE | Build status streaming |

---

## 5. Key Design Decisions

### 5.1 Block → Code Compilation

Blocks are not directly interpreted. Instead, the block editor compiles block chains into Phaser.js code:

```
[When Green Flag Clicked]  ──┐
[Move 10 steps]              ├──→ game.scenes[0].events.on('start', () => {
[If touching edge, bounce]   │      sprite.x += 10;
                              │      if (sprite.x > bounds) sprite.x = bounds;
                              └── })
```

This means every save recompiles blocks → JavaScript → pushes to GitHub.

### 5.2 Asset Naming Convention

All AI-generated assets get deterministic names based on a hash of their prompt + type, enabling deduplication:

```
assets/
├── sprite_player_a1b2c3.png
├── bg_forest_d4e5f6.png
├── sfx_jump_g7h8i9.mp3
└── music_theme_j0k1l2.mp3
```

### 5.3 Status Polling vs WebSocket

- **Status endpoints** use polling (1-2s interval) for simplicity
- **Live preview updates** use WebSocket for sub-second responsiveness
- **Buddy chat** uses Server-Sent Events (SSE) for streaming replies

### 5.4 Credit System

- Free tier: 100 AI generations/day
- Each generation type costs different credits:
  - Sprite (32x32): 1 credit
  - Sprite (64x64+): 2 credits
  - Background: 2 credits
  - Sound effect: 1 credit
  - Music track (30s): 5 credits

### 5.5 Version Auto-Increment

```
build 1 → v0.1.0  (first save)
build 2 → v0.2.0  (first deploy)
build 3 → v0.3.0  (second deploy if changelog)
build 4 → v1.0.0  (library publish)
```

---

*Design document generated for VoxelWorks architecture planning. All timings are estimates based on typical API latencies.*
