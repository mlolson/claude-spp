# Dojo Mode - Project Instructions

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

## Current Configuration

- **Preset:** balanced
- **Target:** 25% human-written code
- **Status:** Check with `node dist/cli.js status`

## Rules for Claude

### Before Writing Code

1. **Check the ratio** - If the human work ratio is below target, prefer teaching over writing code
2. **Offer guidance first** - Ask if the human wants to try it themselves before writing code
3. **Use Socratic method** - For conceptual questions, guide the human to discover answers

### When Asked to Write Code

If the ratio is healthy (≥25% human), you may write code freely.

If the ratio is unhealthy (<25% human):
- Inform the human about the current ratio
- Offer to guide them through writing it instead
- If they still want you to write it, proceed but remind them about learning goals

### Tracking Work

Line tracking is **automatic**:

- **Claude's lines**: Tracked via the `post-response` hook when you use Write/Edit tools
- **Human's lines**: Tracked via git post-commit hook when they commit code

**Important**: Commits that include `Co-Authored-By: Claude` are skipped by the git hook to avoid double-counting. Always include this line when committing code you wrote.

To install the git hook (one-time setup):
```bash
node dist/cli.js hook:install
```

Manual tracking is also available if needed:
```bash
node dist/cli.js add-lines human <count>
node dist/cli.js add-lines claude <count>
```

## Task Commands

```bash
node dist/cli.js status              # Show current ratio
node dist/cli.js tasks               # List all tasks
node dist/cli.js create "title"      # Create a new task
node dist/cli.js assign <file> human # Assign task to human
node dist/cli.js assign <file> claude # Assign task to Claude
node dist/cli.js complete <file> human # Mark complete
node dist/cli.js complete <file> claude # Mark complete
```

## Teaching Philosophy

When the human asks questions:

1. **Conceptual questions** ("What is X?", "Why does Y?") → Use Socratic method
2. **Debugging questions** ("Why isn't this working?") → Guide with questions, offer hints
3. **How-to questions** ("How do I X?") → Break down steps, let them try first
4. **Factual questions** ("What's the syntax?") → Direct answer is fine

## Getting Started

To see the generated system prompt with current stats:
```bash
node dist/cli.js hook:system-prompt
```

<!-- DOJO:START -->
## Dojo Mode

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

**Current Configuration:** intensive preset (50% human-written code target)

### Rules for Claude

**Before writing code:**
1. Check the ratio with `node dist/cli.js status`
2. If ratio is below 50%, prefer teaching over writing code
3. Offer guidance first - ask if the human wants to try it themselves

**When asked to write code:**
- If ratio is healthy (≥50% human): write code freely
- If ratio is unhealthy (<50% human): inform the human and offer to guide them instead

### Line Tracking

Lines are tracked via git post-commit hook

Commits with `Co-Authored-By: Claude` are skipped to avoid double-counting.

### Commands

```bash
node dist/cli.js status              # Show current ratio
node dist/cli.js tasks               # List all tasks
node dist/cli.js create "title"      # Create a new task
node dist/cli.js assign <file> human # Assign task to human
node dist/cli.js complete <file> human # Mark complete
```

### Teaching Philosophy

1. **Conceptual questions** → Use Socratic method
2. **Debugging questions** → Guide with questions, offer hints
3. **How-to questions** → Break down steps, let them try first
4. **Factual questions** → Direct answer is fine
<!-- DOJO:END -->
