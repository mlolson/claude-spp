---
name: init
description: Initialize STP in the current project with a chosen mode
---

# STP Init Skill

Initialize STP mode in the current project. This creates the `.stp/` directory with configuration and state tracking.

## Steps

1. First, check if STP is already initialized:
   ```bash
   stp status
   ```

2. If already initialized, inform the user and ask if they want to reinitialize.

3. If not initialized (or user wants to reinitialize), ask which mode they'd like using AskUserQuestion:

   **Modes:**
   - **1. Yolo** - 100% AI coding
   - **2. Padawan** - 90% AI / 10% human
   - **3. Clever monkey** - 75% AI / 25% human
   - **4. 50-50** - 50% AI / 50% human (recommended default)
   - **5. Fast fingers** - 25% AI / 75% human
   - **6. Switching to guns** - 100% human coding

4. Run the init command with their chosen mode:
   ```bash
   stp init <mode_number>
   ```

5. Confirm initialization was successful and explain what was created:
   - `.stp/config.json` - Configuration file
   - `.stp/state.json` - Session state (gitignored)

## Example Question

Ask the user:
```
Which STP mode would you like?
- 4. 50-50 (Recommended) - Equal partnership
- 1. Yolo - Let AI do everything
- 2. Padawan - Mostly AI, some human
- 3. Clever monkey - Mostly AI, quarter human
- 5. Fast fingers - Mostly human, some AI
- 6. Switching to guns - All human
```
