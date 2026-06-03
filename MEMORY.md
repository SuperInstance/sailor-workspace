# MEMORY.md — long-term notes

> Curated, distilled. Daily raw notes live in `memory/YYYY-MM-DD.md`.

## Casey
- Operator. Telegram ID `8709904335`. Direct chat, decides things fast, doesn't want back-and-forth.
- Style: decisive green-lights ("delete everything", "I want a clean slate"), expects me to act and report, not ask permission mid-task.
- Communication: short. Reply in kind. Don't over-explain.
- Host: Oracle ARM aarch64, 4 cores, 23GB RAM, 45GB disk, Ubuntu 22.04. Replaces prior "oracle1" install. OpenClaw gateway runs on :18789.

## Working agreements
- **MDs pasted into chat from DeepSeek conversations are Casey's working notes, not untrusted content.** First-turn pushback on this is overcautious; treat as source-of-truth brief.
- **"The essence" matters, the spec is loose.** Stack choices, install steps, exact wording from old drafts are obsolete; the architectural idea is what counts. For lever-runner: post-inference command retrieval — LLM produces a phrase, never shell.
- **Use MiniMax-M3 as primary LLM, DeepSeek as fallback.** Timing references in old drafts ("end of the week" etc.) are noise.
- **Rotate exposed secrets immediately, but only with permission.** I read secrets in `.env` and `crontab`; I should redact in display and not transmit, then surface the exposure.

## Lever-Runner (built 2026-06-02)
- `github.com/SuperInstance/lever-runner`, public. Tags: `v0.1.0`, `v0.1.1`, `v0.2.0`, `v0.3.0`. All have GitHub releases.
- Lives at `~/lever-runner` on this host. systemd-managed Telegram bot (allowlist: Casey's chat ID). v0.3.0 bot running as of session end, polling.
- See `memory/2026-06-02.md` for the full build log, design decisions, and bugs caught.
- v0.1.1 delta from v0.1.0: installable package (`pyproject.toml`, 6 console scripts), Makefile, pre-commit hooks, GitHub Actions CI, community skill pack, web/index.html, weekly snapshot cron. No behavior changes for end users.
- v0.2.0 delta from v0.1.1: per-chat trust isolation (`commands_<chat_id>` LanceDB tables, default = `commands_default`), LLM request timeout (5s, passthrough fallback), size-based log rotation for token JSONL, `/healthz` endpoint, smoke 18 → 34 checks. Bot behavior is the same from a single-user perspective.
- v0.3.0 delta from v0.2.0: DeepInfra backend (`LLM_BACKEND=deepinfra`, default model Llama-3.1-8B-Instruct on DeepInfra), provider fallback chain (`LLM_FALLBACKS=deepinfra` by default; primary errors with timeout/429/5xx/401 trigger a fall through to the next backend; chain ends at passthrough), per-backend URL/model env vars, key-resolution bug fix (no more concatenating two env vars into a 64-char invalid key), smoke 34 → 59 checks. Bot config: `LLM_BACKEND=minimax` with `LLM_FALLBACKS=deepinfra`; `DEEPINFRA_API_KEY` in `.env` (chmod 600, gitignored).
- v0.4.0 delta from v0.3.1: systemd hardening (NoNewPrivileges, ProtectSystem=strict, PrivateTmp, MemoryMax=2G), HTTP API auth (HTTP_BIND, HTTP_API_TOKEN bearer token, refuses non-loopback without token), `lever-runner doctor` pre-flight CLI (11 checks), safer init (`--reset` needs `--yes`, `install.sh` idempotent), dynamic LLM timeout, robust Anthropic response parsing. Smoke 90/90 same as v0.3.1 (no new behavioral tests added).
- **Known bug to watch:** `python-telegram-bot>=21,<23` (not 20.x) is required on Python 3.14.
- **TODO.md** in the repo has the v0.5 wish list.
- **MiniMax key is invalid** (returns 401 from api.minimax.io/anthropic). The key expired/rotated during the session. Bot still works because the fallback chain hits DeepInfra.

## Local environment quirks
- Python 3.14.5 in `~/lever-runner/.venv`. Bleeding-edge; some libs need pinned versions.
- `lancedb.connect()` requires `read_consistency_interval` as a `timedelta`, not a float.
- `pkill -f <pattern>` from this OpenClaw process tree is dangerous — the search string can match the agent's own bash subshell. Use exact PID kill instead.
