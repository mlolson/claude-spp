---
description: Initialize STP in the current project
---

# STP Init Skill

Initialize STP mode in the current project. This creates the `.claude-stp/` directory with configuration and state tracking.

## Steps

1. Check to see if the `stp` command exists:

```bash
command -v stp
```
If it does not exist, install with bun or npm depending on user choice:
```bash
npm i -g git+https://github.com/mlolson/claude-stp.git
```
or 
```bash
bun i -g git+https://github.com/mlolson/claude-stp.git
```


2. Run the init command:
   ```bash
   stp init
   ```
