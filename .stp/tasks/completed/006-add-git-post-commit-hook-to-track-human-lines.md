# Add git post-commit hook to track human lines

## Metadata
- **Difficulty**: medium
- **Category**: feature
- **Skills**: git, bash, TypeScript
- **Files**: src/cli.ts, hooks/hooks.json, hooks/git-post-commit.sh (new)

## Description

Simplify line tracking to use two clean methods:
- **Claude lines**: Tracked via existing `post-response` hook (counts lines from Write/Edit tool uses)
- **Human lines**: Tracked via git post-commit hook (counts lines in commits)

To avoid double-counting when human commits Claude's code, the git hook checks for `Co-Authored-By: Claude` in the commit message and skips those commits.

## Implementation

### 1. Remove PostToolUse hook from hooks.json

Remove the `PostToolUse` section from `hooks/hooks.json` - it's redundant with post-response tracking and less accurate.

Before:
```json
{
  "hooks": {
    "UserPromptSubmit": [...],
    "PostToolUse": [...]
  }
}
```

After:
```json
{
  "hooks": {
    "UserPromptSubmit": [...],
    "PostResponse": [
      {
        "type": "command",
        "command": "node dist/cli.js hook:post-response"
      }
    ]
  }
}
```

### 2. Create the git hook script

Create `hooks/git-post-commit.sh`:
```bash
#!/bin/bash
# Dojo post-commit hook - tracks human lines from commits
# Skips commits co-authored by Claude to avoid double-counting

# Check if Claude co-authored this commit
if git log -1 --format="%B" | grep -qi "Co-Authored-By:.*Claude"; then
    # Claude wrote this code - already tracked via post-response hook
    exit 0
fi

# Count lines added in the last commit (insertions only)
LINES_ADDED=$(git diff --shortstat HEAD~1 HEAD 2>/dev/null | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")

if [ "$LINES_ADDED" -gt 0 ]; then
    # Find the dojo CLI (relative to repo root)
    REPO_ROOT=$(git rev-parse --show-toplevel)
    if [ -f "$REPO_ROOT/dist/cli.js" ]; then
        node "$REPO_ROOT/dist/cli.js" add-lines human "$LINES_ADDED"
        echo "Dojo: +$LINES_ADDED lines (human)"
    fi
fi
```

### 3. Add CLI command to install the hook

Add `hook:install` command to `src/cli.ts`:
- Copies `hooks/git-post-commit.sh` to `.git/hooks/post-commit`
- Makes it executable
- Warns if a post-commit hook already exists (offer to append/skip)

### 4. Delete obsolete files

Remove `src/hooks/post-write.ts` (no longer needed).

### 5. Update documentation

Update CLAUDE.md to explain the new tracking model:
- Claude lines: Automatic via post-response hook
- Human lines: Automatic via git commits (without Claude co-author tag)

## How It Works

| Scenario | Co-Authored-By: Claude? | Git hook counts? | Post-response counts? |
|----------|------------------------|------------------|----------------------|
| Claude writes, human commits | Yes | No (skipped) | Yes (Claude lines) |
| Human writes, human commits | No | Yes (human lines) | No |

No double-counting!

## Hints

<details>
<summary>Hint 1: Checking commit message for co-author</summary>

```bash
# Check full commit message (subject + body)
git log -1 --format="%B"

# Case-insensitive grep for Claude co-author
git log -1 --format="%B" | grep -qi "Co-Authored-By:.*Claude"
```
</details>

<details>
<summary>Hint 2: Counting lines in git</summary>

```bash
# Lines added in last commit
git diff --shortstat HEAD~1 HEAD

# Output: "3 files changed, 45 insertions(+), 12 deletions(-)"
```
</details>

<details>
<summary>Hint 3: Installing git hooks programmatically</summary>

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

const gitHooksDir = path.join(process.cwd(), ".git", "hooks");
const hookPath = path.join(gitHooksDir, "post-commit");

// Write hook and make executable
fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
```
</details>

## Acceptance Criteria

- [x] `PostToolUse` hook removed from `hooks/hooks.json`
- [x] `PostResponse` hook added to `hooks/hooks.json`
- [x] `src/hooks/post-write.ts` deleted
- [x] `hooks/git-post-commit.sh` created with Co-Authored-By check
- [x] `node dist/cli.js hook:install` command installs the git hook
- [x] Commits with Claude co-author don't count toward human lines
- [x] Commits without Claude co-author count toward human lines
- [x] Works correctly on first commit (handles HEAD~1 not existing)
- [x] Documentation updated

## Completion Notes

<!-- Filled in when task is completed -->
- **Completed by**: claude
- **Completed at**: 2026-01-19T16:43:00.480Z
- **Notes**:
