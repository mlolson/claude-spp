# Simian Programmer Plugin (SPP) for Claude Code

**Keep your coding skills sharp while using AI.**

SPP is a Claude Code plugin that ensures you write a minimum percentage of the code yourself. You choose the balance - from 10% human / 90% AI up to 100% human coding.

## Why?

Over-reliance on AI coding tools leads to skill atrophy. [A study from Anthropic](https://www.anthropic.com/research/AI-assistance-coding-skills) found that:

> AI use impairs conceptual understanding, code reading, and debugging abilities... Participants who fully delegated coding tasks showed some productivity improvements, but at the cost of learning.

SPP lets you use AI as a collaborator rather than a crutch. When you've let Claude write too much code, SPP blocks Claude from writing more until you catch up. Instead of writing code for you, Claude switches to a coaching mode - giving you guidance, code pointers, and reviewing your work.

## Quick Start

```bash
# 1. Install the CLI
npm i -g claude-spp

# 2. Initialize in your project
cd /path/to/your/project
spp init

# 3. Add the plugin to Claude Code
claude
> /plugin marketplace add mlolson/claude-spp
> /plugin install spp@mlolson
```

## How It Works

### Tracking

SPP tracks your commits. Commits with `Co-Authored-By: Claude` in the message count as Claude commits; commits without it count as human commits.

- Tracking starts from when you run `spp init` (previous commits are ignored)
- By default, looks at the last 7 days of commits
- Can optionally track by lines of code instead of commits

### Enforcement

When your human coding ratio drops below your target, Claude is **blocked** from writing code. Instead of writing code for you, Claude uses a "help human code" skill that provides:

- A high-level overview of the task
- Specific file and line number references
- Step-by-step guidance
- Code review after you write it

### Modes

| Mode | Human / AI | Description |
|------|------------|-------------|
| Lazy monkey | 0% / 100% | Claude does everything |
| Curious monkey | 10% / 90% | Light human involvement |
| Clever monkey | 25% / 75% | Default - balanced assistance |
| Wise monkey | 50% / 50% | Equal partnership |
| Crazy monkey | 100% / 0% | You write everything, Claude advises |

Change modes anytime with `spp mode <1-5>`.

## Features

### Status Line

See your current ratio at a glance in Claude Code's status line:

```
🟢 Claude can write 9 more commits 🤖 > 🐵 > 🤖 > 🐵 > 🐵 ...
🔴 Human needs to write 2 more commits 🤖 > 🤖 > 🤖 > 🐵 ...
```

Enable by adding to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "spp hook:status-line"
  }
}
```

### Drive Mode

Want to write code yourself without changing your mode? Toggle drive mode:

```bash
spp drive
```

Claude is blocked from writing code but remains available for guidance, code review, and questions. Toggle off when done.

### Pause / Resume

Need Claude to write freely for a bit? Pause enforcement for 24 hours:

```bash
spp pause    # Pause for 24 hours
spp resume   # Resume immediately
```

### Reset

Behind on commits and want a fresh start? Reset tracking:

```bash
spp reset
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `spp init` | Initialize SPP in the current project |
| `spp stats` | Show current ratio and statistics |
| `spp mode [n]` | Show or change mode (1-5) |
| `spp modes` | List all available modes |
| `spp drive` | Toggle drive mode |
| `spp pause` | Pause enforcement for 24 hours |
| `spp resume` | Resume enforcement |
| `spp reset` | Reset tracking to current commit |

## Configuration

Config is stored in `.claude-spp/config.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `mode` | `3` | Coding mode (1-5) |
| `statsWindow` | `"oneWeek"` | Time window: `"oneDay"`, `"oneWeek"`, `"allTime"` |
| `trackingMode` | `"commits"` | What to count: `"commits"` or `"lines"` |
| `driveMode` | `false` | Block Claude regardless of ratio |
| `enabled` | `true` | Whether enforcement is active |

Example:

```json
{
  "enabled": true,
  "mode": 3,
  "statsWindow": "oneWeek",
  "trackingMode": "commits",
  "vcsType": "git"
}
```
