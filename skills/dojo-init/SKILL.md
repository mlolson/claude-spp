---
name: init
description: Initialize Dojo in the current project with a chosen preset
---

# Dojo Init Skill

Initialize Dojo mode in the current project. This creates the `.dojo/` directory with configuration, state tracking, and task directories.

## Steps

1. First, check if Dojo is already initialized:
   ```bash
   node dist/cli.js status
   ```

2. If already initialized, inform the user and ask if they want to reinitialize.

3. If not initialized (or user wants to reinitialize), ask which preset they'd like using AskUserQuestion:

   **Presets:**
   - **light** - 10% human-written code target (AI does most work)
   - **balanced** - 25% human-written code target (recommended default)
   - **intensive** - 50% human-written code target (equal partnership)
   - **training** - 75% human-written code target (human does most work)

4. Run the init command with their chosen preset:
   ```bash
   node dist/cli.js init <preset>
   ```

5. Confirm initialization was successful and explain what was created:
   - `.dojo/config.json` - Configuration file
   - `.dojo/state.json` - Session state (gitignored)
   - `.dojo/tasks/` - Task directories for tracking work

## Example Question

Ask the user:
```
Which Dojo preset would you like?
- balanced (Recommended) - 25% human code target
- light - 10% human code target
- intensive - 50% human code target
- training - 75% human code target
```
