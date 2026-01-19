---
description: Mark a task as complete
---

# Complete Dojo Task

**Note:** The CLI is at `<plugin-dir>/dist/cli.js` where plugin-dir is the directory containing this command file.

Mark a task as complete. Arguments should be: `<filename> <human|claude> [lines]`

If arguments are provided:
```bash
node <plugin-dir>/dist/cli.js complete $ARGUMENTS
```

If no arguments provided, first list tasks assigned to human and claude:
```bash
node <plugin-dir>/dist/cli.js tasks
```

Then ask the user:
1. Which task was completed
2. Who completed it (human or claude)
3. Approximately how many lines of code were written

After completion, show updated statistics and congratulate progress.
