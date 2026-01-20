---
description: Tune up your knowledge of the codebase
---

# /dojo:tune-up

Tune up your knowledge of the codebase with interactive questions.

## Usage

```
/dojo:tune-up
```

## Description

The tune-up command generates 3-5 questions about the current codebase and presents them one at a time. After you answer each question, Claude provides feedback explaining whether your answer was correct and referencing the relevant code.

## What to Expect

1. Claude analyzes key files in your project
2. Questions are generated about:
   - Architecture and module organization
   - Main APIs and functions
   - Design decisions and patterns
   - Code flow and data handling
3. You answer each question
4. Claude provides feedback with code references
5. A summary of your results is shown at the end

## Example Session

```
> /dojo:tune-up

I'll analyze the codebase and create some questions for you.

**Question 1 of 4:**
What function calculates the human work ratio, and where is it defined?

> calculateRatio in src/state/schema.ts

Correct! The `calculateRatio` function in `src/state/schema.ts` takes a Session
object and returns the ratio of human lines to total lines...

**Question 2 of 4:**
...
```

## Notes

- Results are not persisted - this is a learning tool, not a formal test
- Questions are specific to your codebase, not general programming
- Use this to familiarize yourself with new code or refresh your memory
