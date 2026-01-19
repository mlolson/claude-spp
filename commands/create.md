---
description: Create a new Dojo task
---

# Create Dojo Task

Create a new task with the provided title. The argument should be the task title.

```bash
node dist/cli.js create "$ARGUMENTS"
```

If no title is provided, ask the user what task they want to create.

After creating, open the file, fill in all of the fields (Metadata, description, hints, acceptance criteria)

Show the task filename and suggest next steps (like assigning it).
