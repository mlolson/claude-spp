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

SPP has three mode types:

| # | Mode | Description |
|---|------|-------------|
| 1 | **Weekly Goal** | Set a weekly human coding target (% of code). Default. |
| 2 | **Pair Programming** | Claude and human trade off driving/navigating in sessions. |
| 3 | **Learning Project** | Coming soon. |

Change modes anytime with `spp mode <1-3>`.

#### Weekly Goal

The default mode. You set a target percentage of code you want to write yourself (10%, 25%, 50%, or 100%). SPP tracks commits (or lines of code) over a rolling window and blocks Claude from writing code when your ratio drops below the target.

#### Pair Programming

Structured driver/navigator sessions. You start a session with a task description, then take turns driving (writing code) and navigating (reviewing, guiding). When the human is driving, SPP watches file changes and records a transcript. When Claude is driving, it writes code normally.

```bash
spp pair start "implement user auth"   # Start a session (human drives first)
spp pair rotate                        # Switch driver/navigator roles
spp pair end                           # End the session
spp pair                               # Show session status
```

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
| `spp mode [n]` | Show or change mode type (1-3) |
| `spp modes` | List all available mode types |
| `spp settings` | View and modify SPP settings |
| `spp drive` | Toggle drive mode |
| `spp pause` | Pause enforcement for 24 hours |
| `spp resume` | Resume enforcement |
| `spp reset` | Reset tracking to current commit |
| `spp pair start <task>` | Start a pair programming session |
| `spp pair rotate` | Rotate driver/navigator roles |
| `spp pair end` | End the current pair session |
| `spp pair` | Show pair session status |
| `spp transcript` | Show transcript of current driving turn |

## Configuration

Config is stored in `.claude-spp/config.json`:

| Option | Default | Description |
|--------|---------|-------------|
| `modeType` | `"weeklyGoal"` | Mode type: `"weeklyGoal"`, `"pairProgramming"`, `"learningProject"` |
| `targetPercentage` | `25` | Human coding target for weekly goal mode: `10`, `25`, `50`, `100` |
| `trackingMode` | `"commits"` | What to count: `"commits"` or `"lines"` |
| `statsWindow` | `"oneWeek"` | Time window: `"oneDay"`, `"oneWeek"`, `"allTime"` |
| `driveMode` | `false` | Block Claude regardless of ratio |
| `enabled` | `true` | Whether enforcement is active |

Example:

```json
{
  "enabled": true,
  "modeType": "weeklyGoal",
  "targetPercentage": 25,
  "statsWindow": "oneWeek",
  "trackingMode": "commits",
  "vcsType": "git"
}
```
