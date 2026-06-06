# DevPulse CLI

Sync local AI coding tool sessions to your DevPulse team dashboard.

## Supported tools

| Tool | Source | Token usage |
| --- | --- | --- |
| **Claude Code** | `~/.claude/projects/**/*.jsonl` | ✅ full |
| **Codex** | `~/.codex/sessions/**/rollout-*.jsonl` | ✅ full |
| **OpenClaw** | `~/.openclaw/agents/*/sessions/*.jsonl` | ✅ full |
| **Cursor** | `ai-code-tracking.db` + `state.vscdb` + `agent-transcripts` | ⚠️ tokens not available locally |

Each machine syncs whatever tools it has; absent tools are skipped automatically.

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

**No transcript content, code, or prompts are uploaded** — only derived metadata and cleaned `summaryNotes` for server-side LLM summarization (when `OPENROUTER_API_KEY` is set on the dashboard).

## Requirements

Node.js **22+** (the Cursor adapter uses the built-in `node:sqlite`; on older Node the Cursor tool is simply skipped).

## Config

Stored in `~/.devpulse/`:

- `config.json` — dashboard URL + token (chmod 600)
- `state.json` — per-session fingerprints for dedupe
- `schedule.json` — automatic sync schedule (when installed)
- `schedule.log` — stdout/stderr from scheduled `devpulse sync` runs

Set `DEVPULSE_API_URL=http://localhost:3000` (or `devpulse login --api-url http://localhost:3000`) when developing against a local Next.js server. By default the CLI points at the hosted dashboard at `https://7aj5nkyd.insforge.site`.
