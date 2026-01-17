# Dojo - Product Requirements Document

## Problem Statement

Programmers using LLMs risk "competency rot" - the gradual degradation of programming skills when AI handles most coding tasks. This leads to:
- Loss of hands-on coding ability
- Reduced understanding of project architecture and design decisions
- Tendency to accept AI-generated code without proper review
- Diminished capacity to effectively guide and manage AI assistants

## Solution Overview

Dojo is a Claude Code plugin that prioritizes teaching and skill development. Instead of simply completing tasks, Claude assigns work to the human, asks guiding questions, and ensures the programmer stays engaged with the codebase.

## User Stories

### Setup & Configuration
- As a user, I want to enable Dojo on my project so that I can maintain my coding skills while using Claude.
- As a user, I want to choose a preset (light/balanced/intensive/training) so that I can match the learning intensity to my goals.
- As a user, I want to customize the human work ratio so that I can fine-tune the balance for my needs.

### Task Management
- As a user, I want to see a list of available tasks so that I can choose what to work on.
- As a user, I want Claude to assign me tasks when my contribution ratio drops so that I stay engaged with the codebase.
- As a user, I want to pick tasks that interest me so that learning feels relevant and motivated.
- As a user, I want to see task difficulty and estimated scope so that I can plan my time.
- As a user, I want hints available when I'm stuck so that I can make progress without giving up.

### Learning & Teaching
- As a user, I want Claude to ask me guiding questions instead of giving direct answers so that I learn to solve problems myself.
- As a user, I want to be pointed to documentation and resources so that I build research skills.
- As a user, I want to explain code before using it so that I truly understand what I'm adding to my project.
- As a user, I want Claude to quiz me on concepts so that I can identify and fill knowledge gaps.

### Progress Tracking
- As a user, I want to see my contribution statistics so that I know if I'm meeting my learning goals.
- As a user, I want to track my skill progression over time so that I can see improvement.
- As a user, I want to see which areas need attention so that I can focus my learning.

### Code Review
- As a user, I want Claude to ask me comprehension questions about code before committing so that I understand what's being merged.
- As a user, I want to demonstrate understanding of changes so that I don't blindly accept AI-generated code.

### Flexibility
- As a user, I want to temporarily pause Dojo so that I can handle urgent situations without friction.
- As a user, I want to disable Dojo entirely when needed so that I have full control over my workflow.

## Workflows

### Workflow 1: Project Onboarding
1. User enables Dojo on a new or existing project
2. User selects a preset or configures custom ratio
3. Dojo analyzes the codebase and generates initial task backlog
4. Claude explains the project structure and key areas to understand
5. User reviews available tasks and optionally picks one to start

### Workflow 2: Normal Development Session
1. User starts Claude Code in a Dojo-enabled project
2. Dojo loads state and displays current contribution ratio
3. User requests a feature or fix
4. **If ratio is healthy:** Claude may complete the task, updating statistics
5. **If ratio is below threshold:** Claude assigns task to user instead
6. User works on assigned task with Claude providing guidance (not solutions)
7. On completion, task moves to completed and statistics update

### Workflow 3: Task Assignment & Completion
1. User runs `/dojo task list` to see available tasks
2. User picks a task or lets Claude recommend one based on skill gaps
3. Task file moves from `unassigned/` to `human/`
4. User works on the task, asking Claude for hints if stuck
5. Claude provides guidance without writing the code
6. User completes the task and tells Claude
7. Claude verifies acceptance criteria are met
8. Task moves to `completed/` with completion notes filled in

### Workflow 4: Socratic Learning
1. User asks a question (e.g., "How does authentication work in this app?")
2. Dojo detects this is a learnable question
3. Instead of explaining directly, Claude responds with:
   - "What files do you think handle authentication?"
   - "Try reading `src/auth/middleware.ts` - what do you notice?"
4. User investigates and reports back
5. Claude confirms understanding or guides further
6. User builds mental model through exploration, not explanation

### Workflow 5: Code Review Checkpoint
1. Claude completes a coding task
2. Before finalizing, Dojo triggers a review checkpoint
3. Claude asks: "Can you explain what this code does?"
4. User explains the changes in their own words
5. Claude asks follow-up questions about edge cases or design decisions
6. Once user demonstrates understanding, changes are accepted
7. Statistics update to reflect Claude's contribution

### Workflow 6: Quiz Session
1. User runs `/dojo quiz` or Dojo prompts for a periodic quiz
2. Claude generates questions based on:
   - Technologies used in the project
   - Areas where user has shown weakness
   - Recently practiced concepts (for reinforcement)
3. User answers questions
4. Claude provides feedback and explanations for wrong answers
5. Skill scores update based on performance

### Workflow 7: Skeleton Mode Implementation
1. User requests a new feature
2. Instead of full implementation, Claude provides skeleton:
   - File structure
   - Function signatures
   - Comments describing what each part should do
3. User fills in the implementation
4. Claude reviews and provides feedback
5. User iterates until acceptance criteria are met

### Workflow 8: Urgent Bypass
1. User has a production emergency
2. User runs `/dojo pause`
3. Dojo temporarily suspends enforcement (with cooldown timer)
4. User and Claude work without restrictions
5. After cooldown or manual resume, Dojo re-enables
6. Statistics still track, but enforcement was paused

## Core Features

### 1. Coding Task Assignment
Claude assigns coding tasks to the human programmer rather than completing them directly.

**Task Categories:**
- **Core system components** - Critical infrastructure that the human should deeply understand
- **Feature implementations** - New functionality that teaches patterns used in the codebase
- **Bug fixes** - Debugging exercises that build diagnostic skills
- **Refactoring tasks** - Code improvement that requires understanding existing patterns
- **Test writing** - Ensures the human understands expected behavior

**Task Sizing:**
- Small: Single function or minor modification
- Medium: Feature slice or multi-file change
- Large: Complete feature or architectural change

### 2. Work Distribution Enforcement
Target: Human completes a configurable percentage of coding work (default 25%).

**Configurable Ratio:**
| Preset | Ratio | Use Case |
|--------|-------|----------|
| `light` | 10% | Experienced dev wanting light guardrails |
| `balanced` | 25% | Default - good learning/productivity balance |
| `intensive` | 50% | Active skill building mode |
| `training` | 75% | Heavy learning focus, Claude mostly advises |

**Behavior:**
- Tracks lines of code written by human vs Claude
- Tracks number of tasks completed by each
- Weights by task complexity/importance
- Displays running statistics to user
- When ratio drops below threshold, Claude refuses to code and assigns tasks instead
- User can select from available tasks but cannot bypass the requirement
- Enforcement is strict - user must disable plugin to bypass

### 3. Socratic Teaching Mode
Instead of providing direct answers, Claude guides learning.

**Triggers:**
- User asks a question that has clear documentation
- User asks about fundamental concepts they should know
- User requests explanation of code Claude didn't write

**Example Responses:**
- "What do you think would happen if...?"
- "Have you checked the documentation for X? Here's the link..."
- "Try reading [specific file/function] - what patterns do you notice?"
- "What's your hypothesis for why this bug occurs?"

### 4. Code Review Enforcement
Before merging or deploying, human must demonstrate understanding.

**Review Checkpoints:**
- Explain what the code does in plain language
- Identify potential edge cases
- Describe the design decision rationale
- Answer Claude's comprehension questions

## Additional Skill-Sharpening Features

### 5. Concept Quizzes
Periodic knowledge checks during sessions.

**Quiz Types:**
- Multiple choice on language/framework concepts
- "What would this code output?"
- "Spot the bug" challenges
- Architecture/design pattern identification

**Adaptive Difficulty:**
- Track performance per topic
- Increase difficulty in strong areas
- Focus practice on weak areas

### 6. "Explain Before You Copy" Rule
When Claude provides code examples:
- User must explain what the code does before using it
- Claude verifies understanding before proceeding
- Incorrect explanations trigger teaching moments

### 7. Skeleton/Stub Mode
Claude provides structure, human fills in implementation.

**Levels:**
- **Level 1**: Full function signatures + detailed comments describing logic
- **Level 2**: Function signatures + brief comments
- **Level 3**: Just function signatures
- **Level 4**: Just file/class structure

### 8. Debugging Challenges
Claude introduces intentional (safe) bugs for practice.

- User must find and fix
- Hints available on request (with score penalty)
- Covers common mistake patterns

### 9. Architecture Discussions
Before implementing features, Claude requires the human to:
- Propose an approach
- Justify design decisions
- Consider alternatives
- Only then does Claude provide feedback

### 10. Daily/Weekly Skill Reports
Aggregate statistics showing:
- Topics practiced
- Skill progression
- Areas needing attention
- Recommended focus areas

## User Commands

- `/dojo stats` - View current statistics
- `/dojo task list` - View available tasks
- `/dojo task pick <id>` - Select a task
- `/dojo quiz` - Start a knowledge quiz
- `/dojo pause` - Temporarily pause (with cooldown)

## Success Metrics

- Human can explain all code in the project
- Human's independent coding speed improves over time
- Reduced "just do it for me" requests
- Higher code review engagement
- Self-reported confidence increase
