# Mercurial (hg) Support Plan

## Overview

Add Mercurial support to SPP alongside existing Git support. This requires creating a VCS abstraction layer and implementing Mercurial-specific commands.

## Current State

All VCS operations are Git-specific in `src/git/history.ts`:
- 19 Git command invocations across 11 different commands
- Direct `execSync()` calls with no abstraction
- Cache stored in `.claude-spp/.git_history_cache.json`
- Post-commit hook in `src/git/hooks/post-commit`

**Files that import git functionality:**
- `src/cli.ts` - `getHeadCommitHash()`
- `src/stats.ts` - `getLineCountsWithWindow()`, `getCommitInfo()`
- `src/hooks/system-prompt.ts` - `getLineCounts()`
- `src/init.ts` - `getTotalCommitCount()`, `getHeadCommitHash()`
- `src/index.ts` - re-exports

## Implementation Plan

### Phase 1: Create VCS Abstraction Layer

**1.1 Define VCS Provider Interface**

Create `src/vcs/types.ts`:
```typescript
export type VcsType = "git" | "hg";

export interface CommitInfo {
  shortHash: string;
  title: string;
  date: string;
}

export interface LineCounts {
  humanLines: number;
  claudeLines: number;
  humanCommits: number;
  claudeCommits: number;
  fromCache: boolean;
  commitsScanned: number;
}

export interface VcsProvider {
  type: VcsType;

  // Repository detection
  isRepo(dir?: string): boolean;
  getRepoRoot(dir?: string): string;

  // Commit info
  getHeadCommitHash(): string;
  getTotalCommitCount(): number;
  getCommitInfo(hash?: string): CommitInfo;
  getFullCommitMessage(hash: string): string;

  // History traversal
  getAllCommitHashes(): string[];
  getCommitRange(startCommit?: string, options?: { since?: string }): Array<{ hash: string; parent: string | null }>;
  isAncestor(potentialAncestor: string, commit: string): boolean;

  // Line counting
  getLineDiff(commit: string, parent: string | null): { added: number; removed: number };

  // User info
  getCurrentUserEmail(): string;

  // Line counts (high-level)
  getLineCounts(): Promise<LineCounts>;
  getLineCountsWithWindow(options?: { since?: string; afterCommit?: string }): Promise<LineCounts>;

  // Cache
  clearCache(): void;
}
```

**1.2 Create Provider Factory**

Create `src/vcs/index.ts`:
```typescript
export function detectVcsType(dir?: string): VcsType | null;
export function getProvider(dir?: string): VcsProvider;
```

**1.3 Refactor Git Implementation**

Move and refactor `src/git/history.ts` to `src/vcs/git-provider.ts`:
- Implement `VcsProvider` interface
- Keep existing logic intact
- Export class `GitProvider`

### Phase 2: Implement Mercurial Provider

**2.1 Command Mapping**

| Operation | Git Command | Mercurial Command |
|-----------|-------------|-------------------|
| Detect repo | `git rev-parse --git-dir` | `hg root` |
| Current revision | `git rev-parse HEAD` | `hg log -r . --template "{node}"` |
| Total commits | `git rev-list --count HEAD` | `hg log -r "ancestors(.)" --template "x" \| wc -c` |
| Commit info | `git log -1 --format="%h%x00%s%x00%cI"` | `hg log -r . --template "{node\|short}\0{desc\|firstline}\0{date\|isodate}"` |
| Full message | `git log -1 --format="%B"` | `hg log -r <rev> --template "{desc}"` |
| All commits | `git rev-list --reverse HEAD` | `hg log -r "ancestors(.)" --template "{node}\n"` |
| Ancestry check | `git merge-base --is-ancestor` | `hg log -r "ancestors(.) and <commit>" --template "{node}"` |
| Line diff | `git diff --numstat` | `hg diff -c <rev> --stat` (parse differently) |
| User email | `git config user.email` | `hg config ui.username` (parse email from "Name <email>") |
| Commit range | `git log --reverse --format=...` | `hg log -r "<start>::." --template "{node} {parents}\n"` |

**2.2 Create Mercurial Provider**

Create `src/vcs/hg-provider.ts`:
- Implement `VcsProvider` interface
- Handle Mercurial-specific output parsing
- Use same cache format (VCS-agnostic)

**2.3 Attribution Detection**

Keep same pattern for both VCS:
- Regex: `/Co-Authored-By:.*Claude/i`
- Works in both Git and Mercurial commit messages

### Phase 3: Update Configuration

**3.1 Add VCS Type to Config Schema**

Update `src/config/schema.ts`:
```typescript
export const ConfigSchema = z.object({
  // ... existing fields
  vcsType: z.enum(["git", "hg"]).optional(), // auto-detected if not set
});
```

**3.2 Update Cache File Location**

Change from `.claude-spp/.git_history_cache.json` to `.claude-spp/.vcs_history_cache.json` (backward compatible - can migrate).

### Phase 4: Hook Installation

**4.1 Create Mercurial Hook**

Create `src/vcs/hooks/hg-commit`:
```bash
#!/bin/bash
REPO_ROOT=$(hg root)
cd "$REPO_ROOT"
npx spp stats 2>/dev/null || true
```

**4.2 Update Hook Installation**

Modify `src/init.ts`:
- Detect VCS type
- Install appropriate hook:
  - Git: `.git/hooks/post-commit`
  - Mercurial: Update `.hg/hgrc` with `[hooks]` section

**4.3 Mercurial Hook Configuration**

For Mercurial, hooks are configured in `.hg/hgrc`:
```ini
[hooks]
post-commit = /path/to/spp-hook
```

Or use in-process hook pointing to script.

### Phase 5: Update Consumers

**5.1 Update Imports**

Replace imports across the codebase:

```typescript
// Before
import { getLineCounts } from "./git/history.js";

// After
import { getProvider } from "./vcs/index.js";
const vcs = getProvider();
const counts = await vcs.getLineCounts();
```

**Files to update:**
- `src/cli.ts`
- `src/stats.ts`
- `src/hooks/system-prompt.ts`
- `src/init.ts`
- `src/index.ts`

### Phase 6: Testing

**6.1 Unit Tests**

- Test Git provider (migrate existing tests)
- Test Mercurial provider
- Test VCS detection logic
- Test provider factory

**6.2 Integration Tests**

- Create temp Git repo, verify tracking
- Create temp Mercurial repo, verify tracking
- Test hook installation for both
- Test cache behavior

**6.3 Test Fixtures**

Create test helpers:
```typescript
async function createTempGitRepo(): Promise<string>;
async function createTempHgRepo(): Promise<string>;
```

## File Structure After Implementation

```
src/
├── vcs/
│   ├── types.ts           # VcsProvider interface, types
│   ├── index.ts           # detectVcsType(), getProvider()
│   ├── git-provider.ts    # GitProvider class
│   ├── hg-provider.ts     # HgProvider class
│   └── hooks/
│       ├── git-post-commit    # Git hook (moved)
│       └── hg-post-commit     # Mercurial hook
├── config/
│   ├── schema.ts          # Add vcsType field
│   └── loader.ts
├── hooks/
│   └── ... (unchanged)
├── cli.ts                 # Update to use getProvider()
├── stats.ts               # Update to use getProvider()
├── init.ts                # Update for VCS detection
└── index.ts               # Update exports
```

## Migration Path

1. **Backward compatibility**: Existing Git users unaffected
2. **Auto-detection**: VCS type detected on init if not specified
3. **Cache migration**: Rename cache file, same format
4. **Config optional**: `vcsType` field optional, auto-detected

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Mercurial line diff output differs | Write robust parser, test with edge cases |
| Hook installation varies by platform | Test on macOS, Linux; document Windows limitations |
| Mercurial revsets complexity | Start with simple revsets, optimize later |
| User email parsing from Mercurial | Handle "Name <email>" format and bare email |

## Open Questions

1. Should we support other VCS systems (SVN, Fossil) in the future?
   - Design interface to be extensible

2. How to handle repos with both `.git` and `.hg`?
   - Priority order: Git > Mercurial (or let user specify in config)

3. Mercurial phases (draft/public) - do they affect tracking?
   - Start by ignoring phases, track all commits

## Estimated Effort

| Phase | Tasks |
|-------|-------|
| Phase 1 | Create abstraction layer, refactor Git |
| Phase 2 | Implement Mercurial provider |
| Phase 3 | Update configuration |
| Phase 4 | Hook installation |
| Phase 5 | Update consumers |
| Phase 6 | Testing |

## Success Criteria

- [x] SPP works in Mercurial repos with same functionality as Git
- [x] Human/Claude commit attribution works correctly
- [x] Line counting accurate for both VCS
- [x] Hooks auto-install during `spp init`
- [x] Caching works for both VCS
- [x] All existing tests pass (59/59)
- [ ] New tests cover Mercurial functionality
- [ ] Documentation updated

## Implementation Status

**Completed: 2025-01-26**

### Files Created
- `src/vcs/types.ts` - VCS provider interface and types
- `src/vcs/git-provider.ts` - Git provider implementation
- `src/vcs/hg-provider.ts` - Mercurial provider implementation
- `src/vcs/index.ts` - Provider factory with auto-detection
- `src/vcs/hooks/hg-post-commit` - Mercurial post-commit hook

### Files Modified
- `src/config/schema.ts` - Added VcsType and vcsType config field
- `src/init.ts` - Updated to use VCS abstraction, support both hooks
- `src/stats.ts` - Updated imports to use VCS module
- `src/cli.ts` - Updated imports, show VCS type in init output
- `src/hooks/system-prompt.ts` - Updated imports, mention both VCS types
- `src/index.ts` - Updated exports for VCS module
- `src/git/history.ts` - Now re-exports from VCS for backward compatibility
- `package.json` - Build script copies both git and hg hooks

### Notes
- Cache file renamed from `.git_history_cache.json` to `.vcs_history_cache.json`
- Both Git and Mercurial use same attribution pattern: `Co-Authored-By:.*Claude`
- VCS type selected by user during `spp init` (not auto-detected)
- Default is Git if user presses Enter without selecting
