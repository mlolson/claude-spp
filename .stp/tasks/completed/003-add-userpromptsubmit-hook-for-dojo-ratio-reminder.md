# Add UserPromptSubmit hook for Dojo ratio reminder

## Metadata
- **Difficulty**: medium
- **Category**: feature
- **Skills**: TypeScript, Claude Code hooks
- **Files**: src/hooks/prompt-reminder.ts, src/cli.ts, hooks/hooks.json

## Description

Add a UserPromptSubmit hook that injects a reminder at the start of every user request when the Dojo ratio is unhealthy. This helps enforce the teaching methodology by reminding Claude to offer guidance instead of writing code.

## Tasks

### 1. Create `src/hooks/prompt-reminder.ts`

Create a hook function that:
- Checks if Dojo is initialized (use `isDojoInitialized` from `../config/loader.js`)
- Loads config and state (use `loadConfig` and `loadState`)
- Calculates current ratio vs target (use `calculateRatio` and `getEffectiveRatio`)
- If ratio is unhealthy (<target), outputs a reminder message
- If healthy, outputs nothing

Example output when unhealthy:
```
DOJO REMINDER: Human work ratio is 15% (target: 25%). Before writing code, ask if the human wants to try it themselves.
```

### 2. Add CLI command in `src/cli.ts`

Add a case for `hook:prompt-reminder` that calls `runPromptReminderHook()`.

Reference the existing `case "status":` block for how to load config/state and calculate ratios.

### 3. Update `hooks/hooks.json`

Add a `UserPromptSubmit` section:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node dist/cli.js hook:prompt-reminder"
      }
    ],
    "PostToolUse": [...]
  }
}
```

Note: `UserPromptSubmit` hooks don't use a `matcher` - they fire on every user message.

### 4. Build and test

```bash
npm run build
node dist/cli.js hook:prompt-reminder
```

## Hints

<details>
<summary>Hint 1: Imports you'll need</summary>

```typescript
import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { loadState } from "../state/manager.js";
import { calculateRatio } from "../state/schema.js";
import { getEffectiveRatio } from "../config/schema.js";
```
</details>

<details>
<summary>Hint 2: Checking if ratio is healthy</summary>

```typescript
const ratio = calculateRatio(state.session);
const target = getEffectiveRatio(config);
const healthy = ratio >= target;
```
</details>

<details>
<summary>Hint 3: Hook output format</summary>

Just use `console.log()` to output the reminder. The hook output gets injected into Claude's context.
</details>

## Acceptance Criteria

- [x] `src/hooks/prompt-reminder.ts` created with hook logic
- [x] `hook:prompt-reminder` case added to `src/cli.ts`
- [x] `hooks/hooks.json` updated with UserPromptSubmit hook
- [x] `npm run build` succeeds
- [x] Running `node dist/cli.js hook:prompt-reminder` outputs reminder when ratio is unhealthy
- [x] Running `node dist/cli.js hook:prompt-reminder` outputs nothing when ratio is healthy

## Completion Notes

<!-- Filled in when task is completed -->
- **Completed by**: human
- **Completed at**: 2026-01-19T16:10:29.296Z
- **Notes**:
