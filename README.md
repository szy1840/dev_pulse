<div align="center">

<h1>
  <img src="assets/logo.svg" alt="" width="40" height="40" valign="middle" />
  DevPulse AI
</h1>

**Lightweight AI work intelligence for small and AI-native engineering teams.**

Turn local AI coding sessions into a unified team dashboard — see how your team actually uses **Cursor**, **Claude Code**, **OpenClaw**, and other agents, without uploading code or transcripts.

[![Dashboard](https://img.shields.io/badge/Dashboard-Live-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://7aj5nkyd.insforge.site)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

**[→ Open Dashboard](https://7aj5nkyd.insforge.site)** · **[Quick Start](#quick-start)** · **[CLI Docs](cli/README.md)**

</div>

---

## Table of Contents

- [Why DevPulse](#why-devpulse)
- [Quick Start](#quick-start)
- [Daily Workflow](#daily-workflow)
- [Automatic Sync](#automatic-sync-optional)
- [Dashboard Views](#what-you-see-in-the-dashboard)
- [Supported AI Tools](#supported-ai-tools)
- [CLI Commands](#cli-commands)
- [Privacy](#privacy)
- [Roadmap](#whats-next)
- [License](#license)

---

## Why DevPulse

### Fragmented visibility across AI agents

Engineers rarely stick to one AI coding tool. A typical day might span **Cursor** for quick edits, **Claude Code** for multi-file refactors, and other agents for specialized tasks. Each tool ships its own usage dashboard — but none of them show the **full picture** across tools, projects, or teammates.

### Small and AI-native teams lack a shared alignment layer

Standups, Slack threads, and Jira tickets capture intent — not how work was actually done with AI. For **small engineering teams** and **AI-native teams** especially, there is no lightweight way to:

- [ ] See whether everyone is on the same page about daily progress
- [ ] Understand how AI fits into real delivery (not just token counts)
- [ ] Spot uneven adoption or runaway costs before they become a problem
- [ ] Align when the team is **AI-native** — most work runs through local agents, but visibility still lives inside each tool's silo

**DevPulse** fixes this with a simple loop:

```
Local AI tools  →  devpulse CLI  →  Team dashboard
(Cursor, Claude Code, OpenClaw)     (usage, summaries, trends)
```

---

## Quick Start

### Step 1 · Create an account & set up your team

- [ ] Open the [dashboard](https://7aj5nkyd.insforge.site) and **sign up**
- [ ] **Create a team** or **join** one with an invite code
- [ ] Share the invite code with teammates

### Step 2 · Install the CLI

> Requires **Node.js 22+**

```bash
npm install -g devpulse-ai
```

<details>
<summary>Install from this repo instead</summary>

```bash
cd cli
npm install && npm run build && npm link
```

</details>

### Step 3 · Log in on your machine

```bash
devpulse login
```

Opens your browser to authorize the CLI — similar to Claude Code device login. Each laptop only needs to do this **once**.

### Step 4 · Sync your sessions

```bash
devpulse sync
```

The CLI scans local AI tool logs, extracts lightweight metadata, and uploads only what's needed for the team dashboard. Unchanged sessions are skipped automatically.

Check pending work without uploading:

```bash
devpulse status
```

### Step 5 · Open the dashboard

- [ ] Go to **[Dashboard → Overview](https://7aj5nkyd.insforge.site/dashboard)**
- [ ] Explore team activity, per-member breakdowns, token trends, and daily AI summaries

---

## Daily Workflow

| When | What to run |
| :--- | :--- |
| **First time on a machine** | `devpulse login` |
| **After a coding session** | `devpulse sync` |
| **Check pending work** | `devpulse status` |
| **Set-and-forget** | `devpulse schedule install --every 6` or `--daily --at 09:00` |

> Most teams either run `devpulse sync` at end of day, or install a background schedule for automatic uploads.

---

## Automatic Sync (optional)

Schedule `devpulse sync` to run in the background:

```bash
# Every 6 hours
devpulse schedule install --every 6

# Once per day at 9:00 AM (local time)
devpulse schedule install --daily --at 09:00

# Check or remove the schedule
devpulse schedule status
devpulse schedule remove
```

| Platform | Scheduler |
| :--- | :--- |
| **macOS** | `launchd` |
| **Linux** | `cron` |

Logs are written to `~/.devpulse/schedule.log`.

---

## What You See in the Dashboard

| View | What it shows |
| :--- | :--- |
| **Overview** | Team activity, token trends, tool/model breakdown, daily summary |
| **Members** | Per-person sessions, active time, and what they worked on |
| **Sessions** | History of synced sessions with project, agent, model, and summary |
| **Settings** | CLI tokens — revoke devices or create manual tokens |

---

## Supported AI Tools

The CLI auto-detects whichever tools are installed on your machine. Missing tools are skipped.

| Tool | Token usage in dashboard |
| :--- | :--- |
| **Claude Code** | Full |
| **Codex** | Full |
| **OpenClaw** | Full |
| **Cursor** | Sessions & activity *(tokens not available locally)* |

---

## CLI Commands

| Command | Description |
| :--- | :--- |
| `devpulse login` | Authorize this machine via browser. `--no-browser` to paste a token manually. |
| `devpulse sync` | Upload new/changed sessions. `--dry-run` to preview, `--force` to re-sync all. |
| `devpulse status` | Show login state, detected tools, and pending sessions. |
| `devpulse schedule install` | Auto-sync on a timer. `--every <hours>` or `--daily [--at HH:MM]`. |
| `devpulse schedule status` | Show the installed schedule. |
| `devpulse schedule remove` | Uninstall auto-sync. |

More CLI details → [`cli/README.md`](cli/README.md)

---

## Privacy

DevPulse uploads **derived metadata only** — never full transcripts, prompts, or source code.

**What is uploaded per session:**

- [x] Tool, model, timestamps, message count
- [x] Token usage *(where the local tool exposes it)*
- [x] Project name and a **hashed** project path *(raw paths are never sent)*
- [x] A short local summary for daily recap generation

**What is NOT uploaded:**

- [ ] Full conversation transcripts
- [ ] Prompts or source code
- [ ] Raw filesystem paths

Config and sync state live in `~/.devpulse/` on your machine.

---

## What's Next

- [ ] **GitHub commit history** — correlate AI sessions with commits and PRs
- [ ] **Team lead review & scoring** — review daily summaries and leave lightweight feedback
- [ ] **Effective usage patterns** — surface which workflows and tools correlate with the best outcomes

---

## License

MIT
