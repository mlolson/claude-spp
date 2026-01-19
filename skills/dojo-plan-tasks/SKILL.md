---
name: plan-tasks
description: Break down a plan into Dojo tasks that can be assigned to human or Claude
---

# Dojo Plan Tasks Skill

Break down an implementation plan into discrete Dojo tasks that can be assigned to the human or Claude.

## When to Use

Use this skill when:
- You're in plan mode and have outlined implementation steps
- The user wants to track work through Dojo tasks
- A plan needs to be divided into assignable work items

## Instructions

### 1. Analyze the Plan

Review the current plan and identify discrete units of work. Good tasks are:
- **Self-contained**: Can be completed independently
- **Testable**: Have clear completion criteria
- **Appropriately sized**: Not too large (break down) or too small (combine)

### 2. Add Tasks Section to Plan

Add a `## Tasks` section to your plan with this format:

```markdown
## Tasks

The following tasks will be created in Dojo once this plan is approved:

| # | Task | Assignee | Difficulty | Category |
|---|------|----------|------------|----------|
| 1 | Implement user authentication | claude | medium | feature |
| 2 | Write authentication tests | human | easy | test |
| 3 | Add login form UI | human | medium | feature |
| 4 | Update API documentation | claude | easy | docs |

### Task Details

**Task 1: Implement user authentication**
- Files: `src/auth/handler.ts`, `src/auth/middleware.ts`
- Description: Add JWT-based authentication with login/logout endpoints
- Acceptance: Auth endpoints work, tokens are validated

**Task 2: Write authentication tests**
- Files: `tests/auth.test.ts`
- Description: Add unit and integration tests for auth system
- Acceptance: 80%+ coverage, edge cases handled
...
```

### 3. Suggest Assignments

When suggesting task assignments, consider:

**Assign to Human when:**
- It's a good learning opportunity
- The human work ratio is below target
- The task involves core business logic they should understand
- It's appropriately challenging for skill development

**Assign to Claude when:**
- It's boilerplate or repetitive code
- The human work ratio is healthy
- Speed is important and it's straightforward
- It's infrastructure/tooling the human doesn't need to learn

### 4. After Plan Approval

Once the user approves the plan, create the tasks:

```bash
# Create each task
node dist/cli.js create "Task title"

# Then assign them
node dist/cli.js assign <filename> human
node dist/cli.js assign <filename> claude
```

Or provide the commands for the user to run.

## Task Categories

- **feature** - New functionality
- **bugfix** - Bug fixes
- **refactor** - Code improvements
- **test** - Test writing
- **docs** - Documentation

## Task Difficulties

- **easy** - Straightforward, good for learning
- **medium** - Moderate complexity
- **hard** - Complex, requires deep understanding

## Example

For a plan to "Add user profile page":

```markdown
## Tasks

| # | Task | Assignee | Difficulty | Category |
|---|------|----------|------------|----------|
| 1 | Create profile API endpoint | claude | medium | feature |
| 2 | Build profile React component | human | medium | feature |
| 3 | Add profile form validation | human | easy | feature |
| 4 | Write profile API tests | claude | easy | test |

Rationale: Human takes the UI work (good React practice), Claude handles
backend boilerplate and test scaffolding.
```
