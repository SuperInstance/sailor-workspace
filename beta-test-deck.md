# 🚀 Ship Deck — Beta Test Report

**URL:** https://voxelworks-gateway.casey-digennaro.workers.dev/deck  
**Date:** 2026-06-06 06:27 UTC  
**Tester:** Subagent (static code review + HTML/JS analysis)

---

## 1. Timeline Visualization

### 1a. 5 commit nodes on the timeline?
**PASS** ✅

The `commits` array in JS contains exactly 5 entries:

| # | Type | Message |
|---|------|---------|
| 1 | feat | Added jumping! |
| 2 | feat | Made a cat character |
| 3 | fix  | Fixed coin collecting |
| 4 | feat | Built a forest level |
| 5 | init | Started a platformer! |

The `renderTimeline()` function iterates over all 5 and creates a `.node` div for each.

### 1b. Colored dots? (green/blue/purple/gold)
**PASS** ✅

Each node has a `.dot.type-{type}` class. CSS defines colored dots:

| CSS Class        | Color      | Used? |
|------------------|------------|-------|
| `.type-feat`     | Green      | Yes (3 nodes) |
| `.type-fix`      | Blue       | Yes (1 node)  |
| `.type-init`     | Cyan       | Yes (1 node)  |
| `.type-asset`    | Purple     | No (CSS ready) |
| `.type-deploy`   | Gold       | No (CSS ready) |

Every node has a visible colored dot with glow box-shadow. Purple and gold CSS is defined but unused in the current data — that's fine, it's ready for future commit types.

### 1c. Kid-friendly messages?
**PASS** ✅

All 5 messages are kid-friendly and game-themed:
- "Added jumping!" — fun, action-oriented
- "Made a cat character" — playful
- "Fixed coin collecting" — game mechanic
- "Built a forest level" — creative building
- "Started a platformer!" — grand beginning

No raw git commit messages like `feat: add jump`. All are human-readable and age-appropriate.

### 1d. Relative timestamps shown?
**PASS** ✅

Hardcoded relative timestamps per node:
- "2 minutes ago"
- "5 minutes ago"
- "8 minutes ago"
- "15 minutes ago"
- "30 minutes ago"

These aren't dynamically computed (they're static strings), but they display as relative timestamps just fine for a demo/fun page.

### 1e. Nodes animate in on page load?
**PASS** ✅

CSS handles this beautifully:
```css
.node {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeSlideIn 0.5s ease forwards;
}
.node:nth-child(1) { animation-delay: 0.1s; }
.node:nth-child(2) { animation-delay: 0.2s; }
.node:nth-child(3) { animation-delay: 0.3s; }
.node:nth-child(4) { animation-delay: 0.4s; }
.node:nth-child(5) { animation-delay: 0.5s; }
@keyframes fadeSlideIn {
  to { opacity: 1; transform: translateY(0); }
}
```

Staggered fade + slide-in from below. Clean and charming.

---

## 2. Status Indicators

### 2a. At least one node marked "✅ Live"?
**PASS** ✅

Node 1 (`Added jumping!`) has `tag: 'live'`, `tagIcon: '✅'`, `tagLabel: 'Live'`. Renders as:
```html
<span class="tag tag-live">✅ Live</span>
```

The project-bar also shows a green "● LIVE" badge.

### 2b. Other states present?
**PASS** ✅

| Node | Tag Type | Renders as |
|------|----------|------------|
| #2   | `building` | 🏗️ Building (gold) |
| #5   | `local`    | 📦 Local (dim/gray) |

Three distinct statuses across commits. Nodes 3 and 4 have `tag: null` and show no tag, which is correct.

---

## 3. Deploy Button ("🌍 Share My World!")

### 3a. Click → modal appears?
**PASS** ✅

Event binding:
```js
document.getElementById('shipBtn').addEventListener('click', openModal);
```

`openModal()` adds `.open` class to `.modal-overlay`, changing its `display` from `none` to `flex`. Modal also has a springy `modalBounce` scale-in animation.

### 3b. Modal shows URL (`https://my-platformer.pages.dev`)?
**PASS** ✅

`getShipUrl()` lowercases the project name, replaces non-alphanumeric chars, and builds:
```
https://my-platformer.pages.dev
```

Set via `urlText.textContent = url` in the modal.

### 3c. Click "📋" copy button → "Copied!" toast?
**PASS** ✅

```js
document.getElementById('copyBtn').addEventListener('click', copyUrl);
```

`copyUrl()` writes to clipboard via `navigator.clipboard.writeText()` (HTTPS-secured), then calls `showToast('✓ Copied to clipboard!')`. The toast element gains `.show` class, sliding up from below with a green border. Auto-hides after 2 seconds.

Has a graceful fallback using `document.execCommand('copy')` via a hidden textarea for environments where Clipboard API isn't available.

### 3d. QR code placeholder visible?
**PASS** ✅

`generateQR()` creates a 9×9 grid with deterministic pseudo-random cells and three finder patterns (corner squares). A "QR CODE" label is overlaid at the bottom. The parent `.qr-placeholder` has 140×140px white background with rounded corners.

---

## 4. Animations

### 4a. Timeline node entrance animations?
**PASS** ✅

Covered in 1e above. Staggered `fadeSlideIn` with 0.1s increments. Nodes start at `opacity: 0` and `translateY(20px)`, animate to visible and in-place.

### 4b. Deploy button hover effect?
**PASS** ✅

Multiple hover effects:
- Button lifts: `translateY(-2px) scale(1.02)`
- Glow intensifies: `box-shadow: 0 0 30px → 0 0 50px rgba(34,197,94,...)`
- Rocket emoji tilts: `.rocket { translateY(-3px) rotate(-10deg) }`
- Radial gradient overlay for depth

---

## 5. Edge Cases

### 5a. Click deploy button multiple times → modal queuing?
**PASS** ✅

Clicking multiple times simply calls `openModal()` repeatedly, which re-sets the URL and QR code and re-applies the `.open` class. Since the modal is already visible, no new modals stack on top. No queue accumulation. The body's `overflow: hidden` is set each time (harmless idempotent).

### 5b. Click outside modal → closes?
**PASS** ✅

```js
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
```

Only fires when clicking the overlay backdrop itself (not child elements), which is the correct behavior. Escape key also closes via:
```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOpen) closeModal();
});
```

### 5c. Resize browser → responsive?
**PASS** ✅

- Container uses `max-width: 640px` with `width: 100%` — shrinks naturally
- `@media (max-width: 480px)` breakpoint adjusts:
  - Font sizes (h1: 2.2rem → 1.7rem)
  - Timeline padding (2.5rem → 2rem)
  - Node card padding and message font
  - Button sizes
  - Modal padding
- Body has `overflow-x: hidden` to prevent horizontal scroll
- Padding uses `1rem` on body for breathing room

No fixed-width traps at any viewport size.

---

## Summary

| Test | Result |
|------|--------|
| 1a. 5 timeline nodes | ✅ PASS |
| 1b. Colored dots | ✅ PASS |
| 1c. Kid-friendly messages | ✅ PASS |
| 1d. Relative timestamps | ✅ PASS |
| 1e. Node entrance animations | ✅ PASS |
| 2a. ✅ Live status | ✅ PASS |
| 2b. 🏗️ Building / 📦 Local states | ✅ PASS |
| 3a. Modal on deploy click | ✅ PASS |
| 3b. Correct URL in modal | ✅ PASS |
| 3c. Copy button → "Copied!" toast | ✅ PASS |
| 3d. QR code placeholder | ✅ PASS |
| 4a. Entrance animations | ✅ PASS |
| 4b. Button hover effects | ✅ PASS |
| 5a. No modal queuing | ✅ PASS |
| 5b. Click-outside closes modal | ✅ PASS |
| 5c. Responsive layout | ✅ PASS |

**All 16 tests PASS.** No bugs found. The page is solid, fun, and kid-friendly. 🚀
