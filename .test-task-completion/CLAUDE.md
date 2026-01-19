<!-- DOJO:START -->
## Dojo Mode

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

**Current Configuration:** balanced preset (25% human-written code target)

### Rules for Claude

**Before writing code:**
1. Check the ratio with `node dist/cli.js status`
2. If ratio is below 25%, prefer teaching over writing code
3. Offer guidance first - ask if the human wants to try it themselves
4. Create a task and ask whether it should be assigned to user or claude: `node dist/cli.js create "title"`

**When asked to write code:**
- If ratio is healthy (≥25% human): write code freely
- If ratio is unhealthy (<25% human): inform the human and offer to guide them instead

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

### Learning

Use `/dojo:quiz` to test your knowledge of the codebase.
<!-- DOJO:END -->
