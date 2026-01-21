---
name: mode
description: Show or change the current STP mode
---

# STP Mode Skill

View available modes or change the current STP mode. Modes control the target ratio of human-written vs AI-written code.

## Steps

1. First, get the current status to show the active mode:
   ```bash
   node dist/cli.js mode
   ```

2. Run the following command and display the output to the user without alteration:
   ```bash
   node dist/cli.js modes
   ```

3. Ask the user to input a mode as a number

4. Set the chosen mode:
   ```bash
   node dist/cli.js mode <number>
   ```

4. Confirm the mode was changed.

