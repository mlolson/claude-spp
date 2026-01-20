# Dojo Mode - Project Instructions

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

## Current Configuration

- **Preset:** intensive
- **Target:** 50% human-written code
- **Status:** Check with `node dist/cli.js status`

## Workflow

Before writing code, you must focus on a task:

1. **Think** - Consider what needs to be done
2. **Focus** - `node dist/cli.js focus <filename>`
3. **Work** - Implement (writes are allowed while focused)
4. **Complete** - `node dist/cli.js complete <filename> claude`

Writes are **blocked** unless a task is focused.

## Rules for Claude

### Before Writing Code

1. **Focus a task** - You cannot write code without a focused task
2. **Check the ratio** - If below target, prefer guiding over writing code
3. **Offer guidance first** - Ask if the human wants to try it themselves

### When Asked to Write Code

If the ratio is healthy (≥50% human), you may write code freely (after focusing a task).

If the ratio is unhealthy (<50% human):
- Inform the human about the current ratio
- Offer to guide them through writing it instead
- If they still want you to write it, proceed but remind them about learning goals

## Line Tracking

Lines are tracked **automatically from git history**:

- Commits with `Co-Authored-By: Claude` are attributed to Claude
- All other commits are attributed to human
- Counts are cached in `.dojo/.git_history_cache.json`

**Important**: Always include `Co-Authored-By: Claude <noreply@anthropic.com>` when committing code you wrote.

## Commands

```bash
# Status
node dist/cli.js status              # Show current ratio and focused task
node dist/cli.js stats               # Show detailed statistics

# Tasks
node dist/cli.js tasks               # List all tasks
node dist/cli.js create "title"      # Create a new task
node dist/cli.js assign <file> human # Assign task to human
node dist/cli.js assign <file> claude # Assign task to Claude

# Focus (required before writing code)
node dist/cli.js focus <file>        # Focus on a task
node dist/cli.js unfocus             # Clear focus

# Completion
node dist/cli.js complete <file> human  # Mark complete (human)
node dist/cli.js complete <file> claude # Mark complete (Claude)
```

## Debugging

To see the generated system prompt with current stats:
```bash
node dist/cli.js hook:system-prompt
```
