# DevPulse AI

**Lightweight AI work intelligence for small and AI-native engineering teams.**

DevPulse turns local AI coding sessions into a unified team dashboard — so you can see how your team actually uses Cursor, Claude Code, OpenClaw, and other agents, without uploading code or transcripts.

**Dashboard:** [https://7aj5nkyd.insforge.site](https://7aj5nkyd.insforge.site)

---

## Why DevPulse

### Fragmented visibility across AI agents

Engineers rarely stick to one AI coding tool. A typical day might span **Cursor** for quick edits, **Claude Code** for multi-file refactors, and other agents for specialized tasks. Each tool ships its own usage dashboard — but none of them show the **full picture** across tools, projects, or teammates.

### Small and AI-native teams lack a shared alignment layer

Standups, Slack threads, and Jira tickets capture intent — not how work was actually done with AI. For **small engineering teams** and **AI-native teams** especially, there is no lightweight way to:

- See whether everyone is on the same page about daily progress
- Understand how AI fits into real delivery (not just token counts)
- Spot uneven adoption or runaway costs before they become a problem
- Align when the team is **AI-native** — most work runs through local agents, but visibility still lives inside each tool’s silo

**DevPulse** fixes this with a simple loop:

```
Local AI tools  →  devpulse CLI  →  Team dashboard
(Cursor, Claude Code, OpenClaw)     (usage, summaries, trends)
```

---

## Quick start

### 1. Create an account & set up your team

1. Open the [dashboard](https://7aj5nkyd.insforge.site) and **sign up**.
2. **Create a team** or **join** one with an invite code.
3. Share the invite code with teammates so they can join the same team.

### 2. Install the CLI

Requires **Node.js 22+**.

```bash
npm install -g devpulse-ai
```

If installing from this repo:

```bash
cd cli
npm install && npm run build && npm link
```

### 3. Log in on your machine

```bash
devpulse login
```

This opens your browser to authorize the CLI — similar to how Claude Code handles device login. Each laptop only needs to do this once.

### 4. Sync your sessions

```bash
devpulse sync
```

The CLI scans local AI tool logs on your machine, extracts lightweight metadata, and uploads only what’s needed for the team dashboard. Run it again anytime — unchanged sessions are skipped automatically.

Check pending work without uploading:

```bash
devpulse status
```

### 5. Open the dashboard

Go to [Dashboard → Overview](https://7aj5nkyd.insforge.site/dashboard) to see team-wide activity, per-member breakdowns, token trends, and daily AI summaries.

---

## Daily workflow

| When | What to run |
| --- | --- |
| **First time on a machine** | `devpulse login` |
| **After a coding session** | `devpulse sync` |
| **Check if anything is pending** | `devpulse status` |
| **Set-and-forget** | `devpulse schedule install --every 6` or `--daily --at 09:00` |

Most teams either run `devpulse sync` at the end of the day, or install a background schedule so uploads happen automatically.

---

## Automatic sync (optional)

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

- **macOS** — uses `launchd`
- **Linux** — uses `cron`
- Logs are written to `~/.devpulse/schedule.log`

---

## What you see in the dashboard

| View | What it shows |
| --- | --- |
| **Overview** | Team activity, token trends, tool/model breakdown, daily summary |
| **Members** | Per-person sessions, active time, and what they worked on |
| **Sessions** | History of synced sessions with project, agent, model, and summary |
| **Settings** | CLI tokens — revoke devices or create manual tokens |

---

## Supported AI tools

The CLI auto-detects whichever tools are installed on your machine. Missing tools are skipped.

| Tool | Token usage in dashboard |
| --- | --- |
| **Claude Code** | Full |
| **Codex** | Full |
| **OpenClaw** | Full |
| **Cursor** | Sessions & activity (tokens not available locally) |

---

## CLI commands

| Command | Description |
| --- | --- |
| `devpulse login` | Authorize this machine via browser. `--no-browser` to paste a token manually. |
| `devpulse sync` | Upload new/changed sessions. `--dry-run` to preview, `--force` to re-sync all. |
| `devpulse status` | Show login state, detected tools, and pending sessions. |
| `devpulse schedule install` | Auto-sync on a timer. `--every <hours>` or `--daily [--at HH:MM]`. |
| `devpulse schedule status` | Show the installed schedule. |
| `devpulse schedule remove` | Uninstall auto-sync. |

More CLI details: [`cli/README.md`](cli/README.md).

---

## Privacy

DevPulse uploads **derived metadata only** — never full transcripts, prompts, or source code.

What is uploaded per session:

- Tool, model, timestamps, message count
- Token usage (where the local tool exposes it)
- Project name and a **hashed** project path (raw paths are never sent)
- A short local summary for daily recap generation

Config and sync state live in `~/.devpulse/` on your machine.

---

## What's next

- **GitHub commit history** — correlate AI sessions with commits and PRs
- **Team lead review & scoring** — review daily summaries and leave lightweight feedback
- **Effective usage patterns** — surface which workflows and tools correlate with the best outcomes

---

## License

MIT
