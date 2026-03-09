# claude-spp Improvement Ideas

*Brainstormed by Kit on 2026-02-01*

The mission: Help developers maintain and improve their coding skills while using AI tools.

---

## 🎯 Quick Wins (Small PRs)

### 1. Better "Help Human Code" Guidance
When Claude is blocked, the guidance could be more structured:
- **Progressive disclosure**: Start with high-level hints, add detail only if asked
- **Code pointers**: Link to specific files/lines rather than describing locations
- **Test-first guidance**: Always suggest writing a test first

### 2. Stats Visualization (CLI)
Add ASCII charts to `spp stats`:
```
Human/AI Ratio (last 7 days)
████████████░░░░░░░░ 60% (target: 50%) ✓

Daily breakdown:
Mon: ██████████ 100% human
Tue: ████░░░░░░  40% human  
Wed: ████████░░  80% human
...
```

### 3. Streak Tracking
Track consecutive days of hitting the target ratio:
```
🔥 5-day streak! Keep it going!
```

---

## 🧠 Learning Features

### 4. Concept Quizzes
After Claude explains a concept, offer a quick quiz:
```
Claude just helped with async/await. Quick check:

Q: What happens if you forget 'await' before a Promise?
A) It throws an error
B) It returns the Promise object
C) It waits automatically

[Press 1-3 to answer]
```

Track quiz scores over time. Use spaced repetition to revisit weak areas.

### 5. Code Review Mode
Instead of Claude writing code, have Claude review human-written code:
- Point out patterns and anti-patterns
- Suggest improvements with explanations
- Rate code quality (readability, performance, maintainability)
- Educational focus: explain *why*, not just *what*

### 6. "Explain Your Code" Challenges
After user writes code, prompt them to explain it:
```
You just wrote a recursive function. Can you explain:
1. What's the base case?
2. How does it reduce toward the base case?
3. What's the time complexity?

[Type your answers or skip]
```

Builds metacognition and catches copy-paste without understanding.

---

## 👥 Collaboration Modes

### 7. Pair Programming Mode
True pair programming with defined roles:

**Navigator Mode**: Claude provides high-level direction, user writes all code
- Claude: "We need a function that validates email format"
- User writes the implementation
- Claude reviews and suggests improvements

**Driver Mode**: User provides direction, Claude writes code
- User: "Create a REST endpoint for user registration"
- Claude implements
- User reviews and must approve each change

**Ping-Pong Mode**: Alternate who writes code
- Claude writes a test
- User writes implementation to pass it
- User writes next test
- Claude implements
- (Classic TDD ping-pong)

### 8. Debug Challenge Mode
Claude intentionally introduces a subtle bug for the user to find:
```
🐛 Debug Challenge!

I've added a subtle bug to this function. Can you find it?
Hint: It only fails for certain inputs.

[Show code with bug]
```

Builds debugging skills and attention to edge cases.

---

## 📊 Skill Tracking

### 9. Competency Tags
Track which skills the user practices:
- Languages: TypeScript, Python, SQL
- Concepts: recursion, async, regex, algorithms
- Domains: frontend, backend, databases, DevOps

Show breakdown:
```
Skills practiced (last 30 days):
  TypeScript   ████████████░░░░ 75%
  SQL          ████░░░░░░░░░░░░ 25%
  
  Async/await  ████████░░░░░░░░ 50%
  Regex        ██░░░░░░░░░░░░░░ 10%
  
💡 Suggestion: You haven't practiced SQL in 2 weeks. 
   Want a SQL challenge?
```

### 10. Weekly Retrospective
Automated weekly summary:
```
📊 Weekly Retrospective (Jan 27 - Feb 2)

Commits: 12 human, 8 Claude (60% human ✓)
Skills practiced: TypeScript, testing, API design
Struggled with: Complex regex patterns
Quiz scores: 8/10 average

🎯 Suggestion for next week:
- Practice regex with a parsing challenge
- Try Debug Challenge mode for async bugs
```

---

## 🔧 Technical Improvements

### 11. VSCode/Editor Integration
- Show ratio in status bar
- Color-code: green when healthy, yellow when warning, red when blocked
- Quick commands to check stats, toggle mode

### 12. CI Integration
- GitHub Action that comments on PRs with skill metrics
- Block merge if too much AI-written code (configurable)
- Badge for README showing current ratio

### 13. Team Features
- Team dashboard showing individual ratios
- Anonymous comparisons ("You're in the top 30% of human coding")
- Team challenges and leaderboards

---

## 💭 Philosophy

The goal isn't to eliminate AI assistance—it's to use AI as a **learning accelerator** rather than a **skill atrophier**. Key principles:

1. **Active learning > Passive consumption**: Writing code yourself, even with guidance, builds skills. Watching Claude write doesn't.

2. **Struggle is valuable**: The productive struggle of figuring something out builds neural pathways. Too much help short-circuits this.

3. **Metacognition matters**: Understanding *why* code works is more valuable than having working code.

4. **Feedback loops**: Quick feedback on what you know/don't know helps focus learning.

5. **Spaced repetition**: Revisiting concepts over time beats one-time cramming.

---

## 🚀 Recommended Next Steps

1. **Stats visualization** - Quick win, high visibility
2. **Streak tracking** - Gamification that encourages consistency  
3. **Concept quizzes** - Core learning feature, moderate complexity
4. **Pair programming mode** - Flagship feature, bigger undertaking

---

*Want me to implement any of these? Let me know which ones resonate!*
