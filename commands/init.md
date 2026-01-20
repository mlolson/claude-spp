---
name: init
description: Initialize Dojo in the current project
---

# Dojo Init Skill

Initialize Dojo mode in the current project. This creates the `.dojo/` directory with configuration and state tracking.

## Steps

1. First, check if Dojo is already initialized:
   ```bash
   node dist/cli.js status
   ```

2. If already initialized, inform the user and ask if they want to reinitialize.

4. Run the init command with their chosen mode:
   ```bash
   node dist/cli.js init
   ```

3. Show user mode options using:
  ```bash
   node dist/cli.js modes
   ```

4. Ask user which mode they would like using AskUserQuestion

5. Set the mode using:
  ```bash
   node dist/cli.js mode $users_selected_mode
   ```

6. Confirm initialization was successful and explain what was created:
   - `.dojo/config.json` - Configuration file

