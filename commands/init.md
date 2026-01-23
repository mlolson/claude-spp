---
description: Initialize STP in the current project
---

# STP Init Skill

Initialize STP mode in the current project. This creates the `.claude-stp/` directory with configuration and state tracking.

## Steps

1. Ensure that the `stp` command exists:

```bash
stp
```
If it does not exist, install with bun or npm depending on user choice:
```bash
npm install -g claude-stp
```
or 
```bash
bun install -g claude-stp
```


2. Run the init command with their chosen mode:
   ```bash
   stp init
   ```
