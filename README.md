# Simian Programmer Plugin (SPP) for Claude

>  If you’re learning how to play the guitar, you can watch as many YouTube videos as you want, you’re not going to learn the guitar. You have to put your fingers on the strings to actually learn the motions. I think there is a parallel here to programming, where programming has to be learned in part by the actual typing.

-[DHH on Lex Friedman](youtube.com/watch?v=vagyIcmIGOQ&t=5408)

## How it works

SPP is a Claude plugin that encourages you to keep writing code. It is configured per-project, and provides 5 modes:

| Mode | Description |
|------|-------------|
| Lazy monkey | 100% AI coding |
| Curious monkey | 10% human / 90% AI |
| Clever monkey |  25% human / 75% AI |
| Wise monkey | 50% human / 50% AI |
| Crazy monkey | 100% human coding |

### Code ratio tracking 
The human/AI coding ratio is calculated by looking at commits that you have authored. Commits with "**Co-Authored-By: Claude**" in the message are counted as Claude commits, those without  are counted as human commits. 

There is an option to track by lines of code (added+deleted) if you wish, but I find that tracking by commit and practicing good git hygeine and using small, well scoped commits works best. 

Tracking starts from the latest commit when the plugin is initialized, so that only new work is counted. It looks back over a time window (default 7 days). 

## Ratio enforcement and the help human code skill

When the ratio of human/AI commits becomes too low, Claude is **blocked** from writing code. Instead, it uses a "help human code" skill to help **you** write the code, and then reviews your work. This skill instructs Claude to provide you with a high level over view of the task, code pointers, and test instructions. Example:

```
❯ Some tests are failing, can you fix them?

⏺ I'd be happy to help, but I'm currently blocked from writing code due to SPP restrictions -
your human coding ratio is below the 100% target. Let me use the spp-human-task skill to guide
you through fixing the tests yourself.
...
---
  High Level Goal

  Fix 15 failing tests across 3 test files. The issues are:

  1. tests/config.test.ts (2 failures) - Test expectations don't match the actual MODES array
  2. tests/hooks.test.ts (6 failures) - Tests use wrong interface for calling preToolUseHook
  3. tests/init.test.ts (7 failures) - Tests timeout because initializeStp prompts for user input via stdin

  ---
  File 1: tests/config.test.ts

  Problem: The tests expect 6 modes with different ratios, but the actual MODES array only has 5 modes with different values.

  Lines 97-109 need to be updated:

  Fix 1: Line 98-99 - "returns custom ratio when set"

  The test tries to set humanWorkRatio on the config, but Config doesn't have a humanWorkRatio field. The getEffectiveRatio function only looks at the mode. This test is invalid - you should either:
  - Remove this test entirely, OR
  - Change it to test setting a different mode

  (etc...)

  ---
  Test Your Changes

  After making the fixes, run:
  npm test

  All tests should pass.

  ---
  Would you like more detailed guidance on any of these fixes,
  or do you want me to review your code after you make the changes?
```

After you make the fix, you can ask claude to review and commit your changes.

### Pausing, resuming, and reseting

Sometimes you gotta do what you gotta do.

You may **pause** SPP to allow Claude to freely write code (`spp pause`). This pause expires after 24 hours, or you can unpause with `spp resume`.

If you get way behind on your coding and want to declare bankruptcy, you can reset tracking from the current commit using:

```bash
spp reset
```

Don't feel bad, no one is keeping score!

### git post commit hook shows stats

After you commit, a post-commit hook prints out current stats:
```bash
% git commit -m "Adjust some wording"

✅ 🐒 Human coding on target. Current: 100% Target: 25%. Keep up the great work!

  Mode       Clever monkey (75% AI / 25% human)
  Tracking   Commits since a4e1e8c "remove .spp" 1/22/2026

  Human      1 commits   10 lines
  Claude     0 commits    0 lines
```


### Getting started

1. Add the plugin in claude:
```bash
# Start claude and run:
/plugin marketplace add mlolson/claude-spp
/plugin install spp@mlolson
```

2. Install the CLI globally
```bash
npm i -g git+https://github.com/mlolson/claude-spp.git
```

3. Initialize SPP in your project:
```bash
cd /path/to/your/project
spp init
```

4. Bonus step: Turn off AI suggestions in your IDE. (It kind of of defeats the purpose)


### CLI Commands

| Command | Description |
|---------|-------------|
| `spp help` | Print help message
| `spp init` | Initialize SPP in the current project |
| `spp stats` | Show current ratio and statistics |
| `spp modes` | List all available modes |
| `spp mode [n]` | Show or change the current mode (1-5) |
| `spp pause` | Pause enforcement for 24 hours |
| `spp resume` | Resume enforcement immediately |
| `spp reset` | Reset tracking to start from current commit |

### Claude slash commands

| Command | Description |
|---------|-------------|
| `/spp:stats` | Show current coding stats |
| `/spp:help` | Get help with the CLI interface |
