---
description: Assign a task to human or claude
---

# Assign Dojo Task

Assign a task to either human or claude. Arguments should be: `<filename> <human|claude>`

If arguments are provided:
```bash
node dist/cli.js assign $ARGUMENTS
```

If no arguments provided, first list available tasks:
```bash
node dist/cli.js tasks
```

Then ask the user which task to assign and to whom (human or claude).

After assignment, confirm the change and remind the user of the current work ratio.
