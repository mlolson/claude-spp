---
name: spp-pair-review
description: Review a human's coding session transcript and provide coaching
---

# SPP Pair Review Skill

Review the human's coding activity during their pair programming driving turn and provide targeted coaching. The transcript captures every file save (with diffs) and every conversation exchange, giving you a complete picture of the coding session.

## When to Use

- When rotating drivers during pair programming (`spp pair rotate`) — review the human's turn
- When the human asks for feedback on their recent coding
- When `spp pair end` is called — review the final turn
- When the human seems stuck and you want to provide coaching

## Steps

1. **Fetch the transcript**: Run `spp transcript` to get the full session transcript including timestamped diffs and conversation history.

2. **Analyze the trajectory**: Look at the sequence of changes and conversations, not just the final state. Pay attention to:
   - Files that were edited repeatedly (possible confusion or iteration)
   - Long gaps between entries (human may have been stuck)
   - Questions the human asked — did they understand the guidance?
   - Whether code changes align with the guidance given
   - Small targeted changes vs large rewrites

3. **Provide coaching**: Based on the trajectory, offer specific, constructive feedback:
   - If the human made many back-and-forth edits to the same area, suggest a cleaner approach
   - If they spent a long time on something, explain the concept they may have been struggling with
   - If they asked a question and then didn't follow the guidance, gently point out what they missed
   - Praise good patterns: clean refactoring, test-first development, incremental progress

4. **Be encouraging**: The goal is to help the human improve, not to criticize. Frame feedback as opportunities for growth.

5. **Suggest next steps**: Based on where the human left off, suggest what to tackle next when they drive again.
