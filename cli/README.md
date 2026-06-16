# DevPulse CLI

Sync local AI coding tool sessions to your DevPulse team dashboard.

## Supported tools

| Tool | Source | Token usage |
| --- | --- | --- |
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | ✅ full |
| **Codex** | `~/.codex/sessions/**/rollout-*.jsonl` | ✅ full |
| **OpenClaw** | `~/.openclaw/agents/*/sessions/*.jsonl` | ✅ full |
| **Cursor** | `ai-code-tracking.db` + `state.vscdb` bubbles + optional API CSV | ✅ local bubbles + optional API billing |

Each machine syncs whatever tools it has; absent tools are skipped automatically.

### Cursor (two layers)

1. **Local (no extra login)** — composer sessions from `~/.cursor` + bubble `tokenCount` from `state.vscdb`.
2. **API (optional)** — official billing tokens via Cursor Dashboard cookie:

```bash
# 1. Paste WorkosCursorSessionToken from cursor.com/settings (see tokscale docs)
devpulse cursor login --name work

# 2. Download usage CSV to ~/.devpulse/cursor-cache/usage.csv
devpulse cursor sync

# 3. Upload everything (composer + API billing rows)
devpulse sync
```

Also reads tokscale cache at `~/.config/tokscale/cursor-cache/usage*.csv` if present.

API rows sync as daily billing sessions (`cursor:api:YYYY-MM-DD:model`) separate from composer sessions (`cursor:{convId}`).

## Install

Requires Node.js **22+**.

```bash
npm install -g devpulse-ai
```

## Usage

```bash
# 1. Log in (opens your browser to authorize this machine)
devpulse login

# 2. Scan every detected tool and upload new/changed sessions
devpulse sync

# 3. Inspect detected tools and pending sessions without uploading
devpulse status

# 4. (Optional) Auto-sync on a schedule — every 6 hours or daily at 9am
devpulse schedule install --every 6
devpulse schedule install --daily --at 09:00
```

## Commands

| Command | Description |
| --- | --- |
| `login` | Opens your browser to authorize the CLI (like Claude Code). `--token <t>` or `--no-browser` for manual paste. `--api-url <url>` for self-hosted dashboards. |
| `sync` | Parse local sessions and upload metadata. `--dry-run`, `--force`, `--dir <path>` (Claude Code), `--tool <name>` (claude-code/openclaw/cursor), `--limit <n>`. |
| `status` | Show login state, detected tools, synced count, and pending changes. `--tool <name>`, `--dir <path>`. |
| `cursor login` | Save Cursor `WorkosCursorSessionToken` for official usage API. `--name <label>`, `--token <token>`. |
| `cursor sync` | Download usage CSV to `~/.devpulse/cursor-cache/`. `--json`. |
| `cursor status` | Cursor API login + cache status (also detects tokscale cache). |
| `cursor switch <name>` | Set active Cursor account. |
| `cursor logout` | Remove Cursor credentials. `--purge-cache`. |
| `schedule install` | Install background auto-sync via macOS launchd or Linux cron. `--every <hours>` (1–24) or `--daily [--at HH:MM]`. |
| `schedule status` | Show the installed schedule and log file path. |
| `schedule remove` | Uninstall background auto-sync. |

## What it reads & uploads

For each session the CLI extracts **lightweight metadata only**:

- session id (used to dedupe), tool, model
- start/end time, message count
- input/output/cache token usage (where the tool exposes it)
- project name + a hashed project path (the raw path is never uploaded)
- a short rule-based summary (derived locally — Cursor uses composer title, first user query, or edited files)
- cleaned user intent messages for Dream Cycle task extraction

**No code or full transcripts are uploaded.** DevPulse uploads cleaned user-side intent messages, plus derived metadata and cleaned `summaryNotes`, so the dashboard can generate session summaries and semantic task spans.

## Requirements

Node.js **22+** (the Cursor adapter uses the built-in `node:sqlite`; on older Node the Cursor tool is simply skipped).

## Config

Stored in `~/.devpulse/`:

- `config.json` — dashboard URL + token (chmod 600)
- `state.json` — per-session fingerprints for dedupe
- `cursor-credentials.json` — optional Cursor API session token(s)
- `cursor-cache/usage.csv` — optional Cursor billing export
- `schedule.json` — automatic sync schedule (when installed)
- `schedule.log` — stdout/stderr from scheduled `devpulse sync` runs

Set `DEVPULSE_API_URL=http://localhost:3000` (or `devpulse login --api-url http://localhost:3000`) when developing against a local Next.js server. By default the CLI points at the hosted dashboard at `https://7aj5nkyd.insforge.site`.
