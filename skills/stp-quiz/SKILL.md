# STP Quiz Skill

Test the user's knowledge of the codebase by generating and asking questions.

## Instructions

When this skill is invoked, follow these steps:

### 1. Analyze the Codebase

Read key files to understand the project:
- Look at the project structure (package.json, main entry points)
- Read important source files (main modules, APIs, core logic)
- Understand the architecture and design patterns used

### 2. Generate Questions

Create 3-5 questions about the codebase covering:
- **Architecture**: How are the modules organized? What patterns are used?
- **APIs**: What are the main functions/classes? What do they do?
- **Design decisions**: Why was X implemented this way?
- **Code flow**: How does data flow through the system?
- **Edge cases**: What happens when X occurs?

Questions should be:
- Specific to this codebase (not general programming questions)
- Answerable by someone who has worked with the code
- A mix of difficulty levels

### 3. Present Questions

Ask questions one at a time:
1. Present the question clearly
2. Wait for the user's answer
3. Provide feedback:
   - If correct: Confirm and optionally add extra context
   - If incorrect: Explain the correct answer with references to the code
4. Move to the next question

### 4. Summarize Results

After all questions are answered:
- Summarize how many questions were answered correctly
- Highlight areas where the user might want to review the code
- Offer to explain any concepts that were challenging

## Example Questions

Good quiz questions:
- "What function is responsible for calculating the work ratio in this project?"
- "What happens when a user runs `stp status`?"
- "How does the system track lines of code written by Claude vs the human?"
- "What are the available modes and what do they control?"

Avoid:
- Generic programming questions ("What is a closure?")
- Questions unrelated to the codebase
- Questions with answers not in the code

## Notes

- This is a stateless quiz - results are not persisted
- The goal is to help users learn the codebase, not to test them formally
- Be encouraging and educational in feedback
