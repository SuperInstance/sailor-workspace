# The "Make Me A..." App — Viral Pattern for Conversation-as-Building

## The Insight

The viral loop isn't about the tool — it's about the *output being shareable*.

A CLI tool that builds crates is powerful but invisible. A URL you can send your mom is viral.

## The Pattern

```
User: "Make me a countdown timer for my Japan trip"
  → 30 seconds later
  → "Here: https://japan-timer.pages.dev"
  → User shares link with travel partner
  → Partner: "I want one too"
  → Loop repeats, zero friction
```

## Why This Goes Viral

1. **Zero friction**: Say what you want, get a URL. No account, no download, no tutorial
2. **Social proof**: "I made this by just asking" → screenshots → "how?" → "just ask this bot"
3. **Delight**: The first time someone says "make me an app" and it works, they're hooked
4. **Shareable output**: Every result is a URL that demonstrates the magic to someone new
5. **Network effects**: Each app is a billboard for the platform

## The Architecture

```
User: "Make me a...{description}"
    │
    ▼
Nebula (edge): matches "make me a" reflex
    │
    ▼
Sub-agent: picks template, customizes via Claude Code
    │
    ▼
Cloudflare Pages: deploys instantly (global CDN, free tier)
    │
    ▼
Returns: "Here's your app: https://{slug}.pages.dev"
    │
    ▼
User shares URL → virality loop
```

## Template Library (MVP)

| Template | Description | Customization |
|----------|-------------|---------------|
| Countdown | Timer to a date | Title, target date, theme |
| Checklist | Shareable to-do | Items, collaborators |
| Status page | Quick dashboard | Metrics, colors |
| RSVP page | Event response | Event details, date |
| Gallery | Photo showcase | Images, captions |
| Timer | Custom stopwatch | Title, intervals |

## The Viral Loop

1. User says "make me a {thing}"
2. App appears at a unique URL
3. User shares URL with friends
4. Friends see it, want their own
5. Friends say "make me a {their thing}"
6. Loop repeats, exponential growth

## Why It Works for "Everyday People"

- No signup. No download. No tutorial.
- Works in the messaging app they already use (Telegram, Signal, etc.)
- The result is a real, working web app — not a file or a screenshot
- They can customize it naturally: "make it blue" → "add a share button" → "make it count down to July 4th"

## Comparison

| Approach | Time to First App | Shareable | Needs Account | Viral Potential |
|----------|------------------|-----------|---------------|-----------------|
| Code it yourself | Hours-days | Yes | Yes | Low |
| App template | Minutes | Yes | Yes | Medium |
| Replit/AI | 1-5 min | Yes | Yes | Medium |
| **"Make me a..."** | **~30 sec** | **Yes (URL)** | **No** | **High** |
