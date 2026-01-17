# Dojo - Technical Design Document

## Overview

Dojo is implemented as a Claude Code plugin using hooks and custom system prompt injection.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Pre-Response│  │   System    │  │Post-Response│ │
│  │    Hook     │──│   Prompt    │──│    Hook     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │               │                │          │
│         └───────────────┼────────────────┘          │
│                         ▼                           │
│              ┌──────────────────┐                   │
│              │     .dojo/       │                   │
│              │  ├─ config.json  │                   │
│              │  ├─ state.json   │                   │
│              │  └─ tasks/       │                   │
│              │     ├─ unassigned│                   │
│              │     ├─ human/    │                   │
│              │     ├─ claude/   │                   │
│              │     └─ completed/│                   │
│              └──────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### Hook-Based Implementation

1. **Pre-response hook**: Checks work ratio before Claude writes code
2. **Post-response hook**: Updates tracking metrics after responses

### Custom System Prompt Injection

Add Dojo instructions to Claude's system prompt that:
- Describe the teaching philosophy
- Include current session statistics
- List active tasks
- Define enforcement rules

## Project State

Per-project state in `.dojo/`:

```
<project>/
  .dojo/
    config.json           # Project settings (git-tracked, shareable)
    state.json            # Session state (git-ignored)
    tasks/
      unassigned/         # Task backlog, not yet assigned
        003-add-pagination.md
      human/              # Assigned to human
        001-user-validation.md
      claude/             # Assigned to Claude
        002-api-error-handling.md
      completed/          # Finished tasks (for history)
        000-setup-logging.md
```

### config.json Schema

```json
{
  "enabled": true,
  "preset": "balanced",
  "humanWorkRatio": 0.25,
  "difficulty": "medium"
}
```

### state.json Schema

```json
{
  "session": {
    "startedAt": "2025-01-17T10:00:00Z",
    "humanLines": 150,
    "claudeLines": 400
  },
  "skills": {
    "typescript": { "score": 0.7, "lastPracticed": "..." },
    "react": { "score": 0.5, "lastPracticed": "..." }
  },
  "quizHistory": [...]
}
```

Task assignment and completion status is tracked by directory location:
- `tasks/unassigned/` - Backlog
- `tasks/human/` - Assigned to human
- `tasks/claude/` - Assigned to Claude
- `tasks/completed/` - Done (metadata in file records who completed it)

The `state.json` should be added to `.gitignore`.

### Task File Format

Tasks are stored as individual markdown files in `.dojo/tasks/` subdirectories.

Example: `001-user-validation.md`

```markdown
# Implement User Validation

## Metadata
- **Difficulty**: medium
- **Category**: feature
- **Skills**: validation, typescript, forms
- **Files**: src/validators/user.ts

## Description

Create a validation function for user registration that checks:
- Email format is valid
- Password meets strength requirements (min 8 chars, 1 number, 1 special)
- Username is alphanumeric and 3-20 characters

## Hints

<details>
<summary>Hint 1</summary>
Consider using zod for schema validation
</details>

<details>
<summary>Hint 2</summary>
Look at the existing validators in src/validators/ for patterns
</details>

## Acceptance Criteria

- [ ] Email validation with proper regex
- [ ] Password strength validation
- [ ] Username format validation
- [ ] Returns typed error messages
- [ ] Unit tests pass

## Completion Notes

<!-- Filled in when task is completed -->
- **Completed by**: human
- **Completed at**:
- **Notes**:
```

**Benefits of markdown task files:**
- Human-readable and editable outside of Claude
- Rich formatting for descriptions and hints
- Collapsible hint sections (using `<details>`)
- Checkboxes for acceptance criteria
- Easy to version control
- Can be created manually or by Claude
- Completion notes preserve learning context

## Attribution System

Track human vs Claude contributions using Claude Code hooks:
- Detect when Claude writes code (via Edit/Write tool usage)
- Detect when human writes code (file changes between Claude responses)
- No external tooling required

## Implementation Phases

### Phase 1: Core Infrastructure

**1.1 Configuration System**
- Read/write `.dojo/config.json`
- Support presets and custom ratio values
- Validate configuration on load

**1.2 Session State Management**
- Track work distribution within session
- Persist across conversation restarts
- Store task queue and completion history

**1.3 Bypass Protection**
- Dojo cannot be disabled via conversation
- Requires config file modification
- Log bypass attempts

### Phase 2: Task System

**2.1 Task File Management**
- Tasks stored as markdown files in `.dojo/tasks/`
- Directory indicates assignment: `unassigned/`, `human/`, `claude/`, `completed/`
- Parse markdown metadata section for filtering and sorting

**2.2 Task Generation**
- Analyze codebase to identify suitable tasks
- Generate tasks from TODOs, issues, or planned features
- Create learning-focused tasks based on code patterns
- Write task as new markdown file in `unassigned/` with sequential ID prefix

**2.3 Task Assignment**
- When work ratio is healthy: Claude can self-assign tasks to `claude/`
- When ratio drops below threshold: Claude assigns tasks to `human/`
- User can request specific tasks or let Claude choose
- User can reassign tasks between `human/` and `claude/`

**2.4 Task Completion**
- On completion: move file to `completed/`, fill in completion notes
- Completion notes record who completed it and any learnings
- Update work ratio statistics in state.json

### Phase 3: Teaching Features

**3.1 Question Detection**
- Classify user questions as "learnable" vs "needs direct answer"
- Maintain list of documentation sources per technology
- Track which questions user has asked before

**3.2 Socratic Response Templates**
- Build library of teaching prompts
- Match prompts to question types
- Include escalation path if user is stuck

**3.3 Code Review Checkpoints**
- Insert review gates before file writes
- Generate comprehension questions dynamically
- Track review completion

### Phase 4: Tracking & Gamification

**4.1 Metrics Collection**
- Lines written by human vs Claude
- Task completion rates
- Quiz scores
- Time spent on tasks

**4.2 Skill Proficiency Model**
- Track competency per technology/concept
- Decay model for unused skills
- Recommendations based on gaps

**4.3 Progress Visualization**
- Summary statistics on demand
- Trend charts
- Achievement/milestone system

### Phase 5: Integration

**5.1 IDE Hooks (Optional)**
- Detect when human is writing code
- Auto-attribute code changes
- Integrate with git for contribution tracking

**5.2 Project Onboarding**
- Analyze new project structure
- Generate initial task list
- Identify key areas human should understand

## File Structure

```
dojo/
├── src/
│   ├── hooks/
│   │   ├── pre-response.ts    # Work ratio check
│   │   └── post-response.ts   # Metrics update
│   ├── config/
│   │   ├── loader.ts          # Config file handling
│   │   └── schema.ts          # Config validation
│   ├── state/
│   │   ├── manager.ts         # State read/write
│   │   └── schema.ts          # State validation
│   ├── tasks/
│   │   ├── generator.ts       # Task generation (creates .md files)
│   │   ├── parser.ts          # Parse task markdown files
│   │   └── queue.ts           # Task queue management
│   ├── teaching/
│   │   ├── socratic.ts        # Question classification
│   │   ├── templates.ts       # Response templates
│   │   └── review.ts          # Code review checkpoints
│   ├── tracking/
│   │   ├── attribution.ts     # Human vs Claude tracking
│   │   ├── skills.ts          # Skill proficiency model
│   │   └── metrics.ts         # Metrics aggregation
│   └── commands/
│       ├── stats.ts           # /dojo stats
│       ├── task.ts            # /dojo task
│       ├── quiz.ts            # /dojo quiz
│       └── pause.ts           # /dojo pause
├── prompts/
│   └── system-prompt.md       # Injected system prompt
├── package.json
└── tsconfig.json
```

## Dependencies

- Claude Code hooks API
- TypeScript
- JSON schema validation (e.g., zod)
