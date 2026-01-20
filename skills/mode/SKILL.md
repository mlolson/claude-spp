---
name: mode
description: Show or change the current Dojo mode
---

# Dojo Mode Skill

View available modes or change the current Dojo mode. Modes control the target ratio of human-written vs AI-written code.

## Available Modes

| # | Name | Human % | Description |
|---|------|---------|-------------|
| 1 | Yolo | 0% | 100% AI coding |
| 2 | Padawan | 10% | 90% AI / 10% human |
| 3 | Clever monkey | 25% | 75% AI / 25% human |
| 4 | 50-50 | 50% | 50% AI / 50% human |
| 5 | Finger workout | 75% | 25% AI / 75% human |
| 6 | Switching to guns | 100% | 100% human coding |

## Steps

1. First, get the current status to show the active mode:
   ```bash
   node dist/cli.js mode
   ```

2. Ask the user which mode they'd like using AskUserQuestion with these options:
   - **1. Yolo** - 100% AI coding (no human code required)
   - **2. Padawan** - 90% AI / 10% human
   - **3. Clever monkey** - 75% AI / 25% human
   - **4. 50-50** - Equal partnership (50% each)
   - **5. Finger workout** - 25% AI / 75% human
   - **6. Switching to guns** - 100% human coding

3. Set the chosen mode:
   ```bash
   node dist/cli.js mode <number>
   ```

4. Confirm the mode was changed and explain the implications:
   - What the new target ratio is
   - How this affects the workflow (e.g., if mode 6, Claude will only guide, not write code)

## Example Question

Ask the user:
```
Which Dojo mode would you like?
- 4. 50-50 (Recommended) - Equal partnership
- 1. Yolo - Let AI do everything
- 2. Padawan - Mostly AI, some human
- 3. Clever monkey - Mostly AI, quarter human
- 5. Finger workout - Mostly human, some AI
- 6. Switching to guns - All human
```
