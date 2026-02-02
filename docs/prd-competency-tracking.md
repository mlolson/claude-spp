# PRD: Competency Tracking via Commit Analysis

**Author:** Kit  
**Date:** 2026-02-02  
**Status:** Draft  
**Approach:** Option A — Commit-Based Analysis

---

## Overview

Competency tracking helps users understand their coding strengths and growth areas by analyzing their git commit history. The system observes patterns in committed code, identifies skills being practiced, assesses quality trends, and synthesizes insights into an actionable competency profile.

---

## Problem Statement

Users want to improve their coding skills but lack visibility into:
- Which skills they're actively practicing vs. neglecting
- Whether their code quality is improving in specific areas
- What they should focus on to grow

Without feedback, skill development is blind and unintentional.

---

## Goals

1. **Visibility** — Show users what skills they're practicing and how often
2. **Assessment** — Provide quality signals (not just "you used X" but "you used X well")
3. **Actionable** — Surface specific recommendations for improvement
4. **Non-intrusive** — Run in background, no friction during normal workflow

---

## Non-Goals (v1)

- Real-time session tracking (future Phase 2)
- On-demand code review mode (future Phase 3)
- Team/multi-user competency tracking
- Integration with external learning platforms

---

## User Stories

### As a developer using claude-spp, I want to:

1. **See my competency profile** so I know where I'm strong and where I need work
   - `spp competency` shows my current profile
   - Profile includes strengths, growth areas, and trends

2. **Understand what I've been practicing** so I can be intentional about skill development
   - Profile shows frequency of skill practice
   - "You've written 12 async functions this week, but only 1 test"

3. **Get quality feedback** so I know if I'm improving
   - Not just "you used error handling" but "your error handling improved — you're now catching edge cases"
   - Trend indicators: improving / stable / declining

4. **Receive actionable recommendations** so I know what to focus on
   - "Try writing tests for your next feature"
   - "Practice type narrowing — you're using `any` frequently"

5. **Analyze my recent commits on demand** so the profile stays fresh
   - `spp analyze` triggers analysis of recent commits
   - `spp analyze --since 7d` analyzes last 7 days

6. **Control what gets analyzed** so I maintain privacy
   - Can exclude paths/files
   - All data stays local

---

## Feature Specification

### Commands

#### `spp competency` (alias: `spp skills`)

Display the current competency profile.

```
$ spp competency

📊 Your Coding Competency Profile
Last updated: 2026-02-02 (3 commits analyzed)

STRENGTHS
✅ TypeScript basics (proficient) — 47 exposures, consistent quality
✅ Async/await (proficient) — clean error handling patterns
✅ React hooks (practicing) — good patterns emerging

GROWTH AREAS  
📈 Testing (learning) — 3 exposures this month, try writing more tests
📈 Error handling edge cases — inconsistent, review recommendations
📈 Type narrowing (learning) — using 'any' frequently (12 times this week)

TRENDS
⬆️ Generics: improving (learning → practicing)
➡️ API design: stable
⬇️ Documentation: declining (no JSDoc in recent commits)

RECOMMENDATIONS
1. Add tests to your next feature — you've written 0 test files this week
2. Replace 'any' with specific types in src/utils.ts
3. Consider JSDoc comments for exported functions

Run 'spp analyze' to update with recent commits.
```

#### `spp analyze`

Analyze recent commits and update the competency profile.

```
$ spp analyze
Analyzing commits since last analysis (2026-02-01)...
Found 5 commits with 12 file changes.

Analyzing commit abc123: "feat: add user authentication"
  → TypeScript (advanced patterns), Error handling, Security considerations
  
Analyzing commit def456: "fix: handle edge case in parser"
  → Error handling (good), Edge case awareness (improving)

...

✅ Profile updated. Run 'spp competency' to view.
```

Options:
- `--since <duration>` — Analyze commits from time period (e.g., `7d`, `1w`, `1m`)
- `--commit <sha>` — Analyze specific commit
- `--full` — Re-analyze all commits (rebuild profile from scratch)
- `--dry-run` — Show what would be analyzed without updating profile

#### `spp competency reset`

Reset competency data and start fresh.

```
$ spp competency reset
This will delete all competency data. Are you sure? [y/N] y
✅ Competency data reset. Run 'spp analyze --full' to rebuild.
```

### Configuration

In `.spp/config.json`:

```json
{
  "competency": {
    "enabled": true,
    "autoAnalyze": "daily",
    "exclude": [
      "**/*.test.ts",
      "**/node_modules/**",
      "dist/**"
    ],
    "includeOnly": null,
    "maxCommitsPerAnalysis": 50
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable competency tracking |
| `autoAnalyze` | `"daily"` | Auto-analyze frequency: `"off"`, `"daily"`, `"weekly"`, `"on-commit"` |
| `exclude` | `[]` | Glob patterns to exclude from analysis |
| `includeOnly` | `null` | If set, only analyze matching patterns |
| `maxCommitsPerAnalysis` | `50` | Limit commits per analysis run (API cost control) |

### Data Storage

All data stored in `.spp/` directory (gitignored by default):

- `.spp/competency-log.jsonl` — Raw observations (append-only)
- `.spp/competency-profile.json` — Current synthesized profile
- `.spp/competency-profile.md` — Human-readable profile (generated)

---

## Competency Model

### Skill Categories

**Tier 1: Languages**
- TypeScript, JavaScript, Python, Go, Rust, etc.

**Tier 2: Core Concepts**
- Async/Promises, Error handling, Type systems, Generics
- Data structures, Algorithms, Memory management
- Testing (unit, integration, e2e)

**Tier 3: Patterns & Practices**
- Refactoring, Code organization, Modularity
- API design, Abstractions, SOLID principles
- Performance optimization, Security practices

**Tier 4: Domain-Specific**
- React/Vue/Angular patterns
- Database design, ORMs
- DevOps, CI/CD

### Skill Levels

| Level | Description | Criteria |
|-------|-------------|----------|
| **Learning** | Just started | < 5 exposures, inconsistent quality |
| **Practicing** | Building proficiency | 5-20 exposures, improving quality |
| **Proficient** | Solid competence | 20+ exposures, consistent quality |
| **Expert** | Deep mastery | High frequency + high quality + teaches others |

### Quality Signals

Analysis looks for:
- **Positive signals:** Error handling, edge cases, tests, documentation, clean abstractions
- **Negative signals:** `any` types, ignored errors, copy-paste patterns, missing validation
- **Improvement signals:** Fixing previous issues, refactoring, adding tests retroactively

---

## Privacy & Security

- **All data local** — Nothing leaves the machine
- **Gitignored by default** — `.spp/competency-*` patterns in `.gitignore`
- **User controls scope** — Can exclude sensitive files/paths
- **No telemetry** — Zero external data transmission

---

## Success Metrics

1. **Adoption:** Users run `spp competency` at least weekly
2. **Accuracy:** Users report profile feels accurate (qualitative)
3. **Behavior change:** Users report being more intentional about practice
4. **Engagement:** Users act on at least 1 recommendation per month

---

## Open Questions

1. **Cold start:** Should we analyze full git history on first run, or start fresh?
   - Recommendation: Offer `spp analyze --full` but default to "start now"

2. **Analysis frequency:** What's the right default for `autoAnalyze`?
   - Recommendation: Daily, with option for on-commit

3. **API cost:** How to limit API calls during analysis?
   - Recommendation: Batch commits, cap per run, cache patterns

4. **Multi-repo:** Should competency profile be global or per-repo?
   - Recommendation: Per-repo for v1, consider global aggregation later

---

## Timeline

- **Week 1:** Core data model, `spp analyze` command, raw observation logging
- **Week 2:** Profile synthesis, `spp competency` display
- **Week 3:** Quality assessment, recommendations engine
- **Week 4:** Auto-analyze, configuration, polish

---

## Future Phases

- **Phase 2:** Real-time session tagging (what concepts touched during spp sessions)
- **Phase 3:** On-demand code review mode (`spp review`)
- **Phase 4:** Learning recommendations (links to resources, exercises)
- **Phase 5:** Progress visualization (charts, streaks, achievements)
