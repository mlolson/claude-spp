---
description: Initialize STP in the current project
---

# STP Init Skill

Initialize STP mode in the current project. This creates the `.stp/` directory with configuration and state tracking.

## Steps

1. First, check if STP is already initialized:
   ```bash
   stp status
   ```

2. If already initialized, inform the user and ask if they want to reinitialize. Use a select dialog with options "yes" and "no".

3. Run the init command with their chosen mode:
   ```bash
   stp init
   ```

4. Show the user mode options using:
  ```bash
   stp modes
   ```

5. Ask user which mode they would like. Ask the question as follows: "Which mode would you like to use?" Use a free form text input

6. Set the mode using:
  ```bash
   stp mode $users_selected_mode
   ```

7. Confirm initialization was successful and explain what was created:
   - `.stp/config.json` - Configuration file

