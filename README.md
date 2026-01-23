# Simian Training Plugin (STP) for Claude

>  If you’re learning how to play the guitar, you can watch as many YouTube videos as you want, you’re not going to learn the guitar. You have to put your fingers on the strings to actually learn the motions. I think there is a parallel here to programming, where programming has to be learned in part by the actual typing.

-[DHH on Lex Friedman](youtube.com/watch?v=vagyIcmIGOQ&t=5408)

## How it works

STP is a Claude plugin that encourages you to keep writing code. It is configured per-project, and provides 5 modes:

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

## Ratio enforcement and help mode

When the ratio of human/AI commits becomes too low, Claude is **blocked** from writing code. Instead, it uses a "help human code" skill to help **you** write the code, and then reviews your work. Once the code ratio is healthy again, Claude can resume writing code.

### Pausing, resuming, and reseting

Sometimes you gotta do what you gotta do.

You may **pause** STP to allow Claude to freely write code (`stp pause`). This pause expires after 24 hours, or you can unpause with `stp resume`.

If you get way behind on your coding and want to declare bankruptcy, you can reset tracking from the current commit using:

```bash
stp reset```

Don't feel bad, no one is keeping score!

### Getting started

1. Add the plugin in claude:
```bash
# Start claude and run:
/plugin marketplace add mlolson/claude-stp
/plugin install claude-stp@mlolson
```

2. Install the CLI globally
```bash
npm i -g claude-stp
```
or 
```bash
bun i -g claude-stp
```

3. Initialize STP in your project:
```bash
cd /path/to/your/project
stp init
```
or in claude code:
```
/stp:init
```

### CLI Commands

| Command | Description |
|---------|-------------|
| `stp help` | Print help message
| `stp init` | Initialize STP in the current project |
| `stp stats` | Show current ratio and statistics |
| `stp modes` | List all available modes |
| `stp mode [n]` | Show or change the current mode (1-5) |
| `stp pause` | Pause enforcement for 24 hours |
| `stp resume` | Resume enforcement immediately |
| `stp reset` | Reset tracking to start from current commit |

### Claude slash commands

| Command | Description |
|---------|-------------|
| `/stp:init` | Initialize STP in the repo. Wrapper for the `stp init` command  |
| `/stp:stats` | Show current coding stats |
| `/stp:help` | Get help with the CLI interface |
