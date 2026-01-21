# Replace dojo command with dist/cli.js in all references

## Metadata
- **Difficulty**: easy
- **Category**: refactor
- **Skills**: find/replace
- **Files**: CLAUDE.md, src/cli.ts, src/commands/*.ts, src/hooks/system-prompt.ts, skills/**/*.md, commands/*.md

## Description

Remove dependency on homebrew by replacing all `dojo` command references with `node dist/cli.js`. This ensures the project works without requiring global installation.

## Files to Update

### Source files (update these, dist/ will regenerate on build)

1. **src/cli.ts** - Error messages like "Run: dojo init", "Usage: dojo create..."
2. **src/commands/stats.ts** - "Run `/dojo init` to get started"
3. **src/commands/init.ts** - "Run `/dojo stats`..."
4. **src/hooks/system-prompt.ts** - All the `/dojo stats`, `/dojo tasks` references

### Documentation/Config files

5. **CLAUDE.md** - Multiple references to `dojo status`, `dojo tasks`, etc.
6. **skills/dojo-init/SKILL.md** - `dojo status`, `dojo init`
7. **skills/dojo-teaching/SKILL.md** - `dojo status`
8. **commands/*.md** - All command docs reference `dojo <command>`

### Note
- Skip `dist/` files - they regenerate from `npm run build`
- Skip `PRD.md` and `TDD.md` - these are planning docs, not runtime

## Example Replacements

| Before | After |
|--------|-------|
| `dojo status` | `node dist/cli.js status` |
| `dojo init` | `node dist/cli.js init` |
| `Run: dojo init` | `Run: node dist/cli.js init` |

## Hints

<details>
<summary>Hint 1: Quick find/replace</summary>

Use your editor's find/replace with regex:
- Find: `(?<!node dist/cli\.js )dojo (status|init|stats|tasks|create|assign|complete|add-lines|hook:)`
- Replace with: `node dist/cli.js $1`

Or do it file by file with simpler replacements.
</details>

<details>
<summary>Hint 2: Verify with grep</summary>

After replacing, run:
```bash
grep -r "dojo init\|dojo status\|dojo stats" --include="*.ts" --include="*.md" src/ skills/ commands/ CLAUDE.md
```

Should return no matches (except where "dojo" is part of a name/title).
</details>

## Acceptance Criteria

- [x] All `dojo <command>` references in src/ updated to `node dist/cli.js <command>`
- [x] CLAUDE.md updated
- [x] Skills updated (skills/**/*.md)
- [x] Command docs updated (commands/*.md)
- [x] `npm run build` succeeds
- [x] No remaining bare `dojo <command>` references (except titles/names)

## Completion Notes

<!-- Filled in when task is completed -->
- **Completed by**: claude
- **Completed at**: 2026-01-19T16:19:27.771Z
- **Notes**:
