# /dojo:plan-tasks

Break down a plan into Dojo tasks that can be assigned to human or Claude.

## Usage

```
/dojo:plan-tasks
```

## Description

This skill helps structure implementation plans into discrete, trackable tasks. Use it during planning to:

1. Identify work items from your plan
2. Suggest assignments (human vs Claude) based on learning goals and ratio
3. Create tasks in Dojo once the plan is approved

## When to Use

- During plan mode, after outlining implementation steps
- When you want to divide work between human and Claude
- Before starting a multi-step implementation

## What It Does

1. **Analyzes your plan** - Identifies discrete units of work
2. **Creates a Tasks section** - Adds a formatted table to your plan
3. **Suggests assignments** - Recommends human/Claude based on:
   - Current work ratio
   - Learning opportunities
   - Task complexity
4. **Creates tasks on approval** - Runs CLI commands to create Dojo tasks

## Example Output

```markdown
## Tasks

| # | Task | Assignee | Difficulty | Category |
|---|------|----------|------------|----------|
| 1 | Add database schema | claude | medium | feature |
| 2 | Implement API routes | human | medium | feature |
| 3 | Write integration tests | human | easy | test |
| 4 | Update API docs | claude | easy | docs |

Rationale: Human takes API routes for learning, Claude handles
boilerplate schema and documentation.
```

## After Approval

Once you approve the plan, the tasks are created:

```bash
node dist/cli.js create "Add database schema"
node dist/cli.js assign 001-add-database-schema.md claude
# ... etc
```
