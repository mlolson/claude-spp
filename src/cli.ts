#!/usr/bin/env node
import { Command } from "commander";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeSpp, isFullyInitialized, promptUser } from "./init.js";
import { getHeadCommitHash } from "./vcs/index.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import {
  getModeTypeName,
  getModeTypeDescription,
  ModeTypeSchema,
  MODE_TYPE_LABELS,
  MODE_TYPE_DESCRIPTIONS,
  type ModeType,
  type Config,
} from "./config/schema.js";
import { getStats, formatStats } from "./stats.js";

const program = new Command();

program
  .name("spp")
  .description("SPP CLI - Simian Programmer Plugin for Claude - https://github.com/mlolson/claude-spp")
  .version("0.1.0");

// User commands

program
  .command("init")
  .description("Initialize SPP")
  .action(async () => {
    const config = await initializeSpp(process.cwd());
    saveConfig(process.cwd(), config);

    const modeDesc = getModeTypeDescription(config);
    const vcsType = config.vcsType ?? "git";
    const hookPath = vcsType === "git" ? ".git/hooks/post-commit" : ".hg/hgrc [hooks]";

    console.log("");
    console.log(`✅ SPP initialized with mode: ${modeDesc}`);
    console.log(`Install directory: .claude-spp/`);
    console.log(`VCS: ${vcsType}`);
    console.log(`Hook: ${hookPath}\n`);

    console.log("Analyzing repo...");
    const stats = getStats(process.cwd());
    console.log(formatStats(stats));
  });

program
  .command("mode")
  .argument("[value]", "mode type number (1-3) or name")
  .description("Show or change the current mode type")
  .action(async (value: string | undefined) => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    // If no argument, show current mode
    if (!value) {
      console.log(`Current mode: ${getModeTypeDescription(config)}`);
      return;
    }

    // Try to parse as number first
    const modeTypes = ModeTypeSchema.options;
    let selectedModeType: ModeType | undefined;

    const num = parseInt(value, 10);
    if (num >= 1 && num <= modeTypes.length) {
      selectedModeType = modeTypes[num - 1];
    }

    // If not a number, try by name
    if (!selectedModeType) {
      const found = modeTypes.find(
        (mt) => mt.toLowerCase() === value.toLowerCase() ||
               MODE_TYPE_LABELS[mt].toLowerCase() === value.toLowerCase()
      );
      if (found) {
        selectedModeType = found;
      }
    }

    if (!selectedModeType) {
      throw Error(`❌ Unknown mode: ${value}. Use a number 1-${modeTypes.length} or a mode name`);
    }

    // Update config
    config.modeType = selectedModeType;

    if (selectedModeType === "weeklyGoal") {
      // Prompt for goal type sub-config
      console.log("\nGoal type:\n");
      console.log("  1. Commits per week (default)");
      console.log("  2. Percentage");
      console.log("");
      const goalChoice = await promptUser("Select a goal type [1-2, or press Enter for Commits per week]: ");
      if (goalChoice === "2") {
        config.goalType = "percentage";
        // Prompt for percentage
        console.log("\nTarget percentage:\n");
        console.log("  1. 10%");
        console.log("  2. 25% (default)");
        console.log("  3. 50%");
        console.log("  4. 100%");
        console.log("");
        const pctChoice = await promptUser("Select [1-4, or press Enter for 25%]: ");
        const percentages: (10 | 25 | 50 | 100)[] = [10, 25, 50, 100];
        const pctNum = parseInt(pctChoice, 10);
        config.targetPercentage = (pctNum >= 1 && pctNum <= 4) ? percentages[pctNum - 1] : 25;
      } else {
        config.goalType = "commits";
        const goalStr = await promptUser("How many commits per week? [default: 5]: ");
        const goalNum = parseInt(goalStr, 10);
        config.weeklyCommitGoal = goalNum >= 1 ? goalNum : 5;
      }
    } else if (selectedModeType === "learningProject") {
      console.log("\n📚 Learning Project mode is coming soon! Using Weekly Goal as fallback.\n");
      config.modeType = "weeklyGoal";
    }

    saveConfig(process.cwd(), config);

    console.log(`✅ Mode changed to: ${getModeTypeDescription(config)}`);
  });

program
  .command("modes")
  .description("List available mode types")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());
    const modeTypes = ModeTypeSchema.options;

    console.log("Mode types:");
    for (let i = 0; i < modeTypes.length; i++) {
      const mt = modeTypes[i];
      const label = MODE_TYPE_LABELS[mt];
      const desc = MODE_TYPE_DESCRIPTIONS[mt];
      const marker = mt === config.modeType ? " <-- current" : "";
      console.log(`  ${i + 1}. ${label} - ${desc}${marker}`);
    }
    console.log("\nTo change mode: spp mode <number>");
  });

program
  .command("settings")
  .description("View and modify SPP settings")
  .action(async () => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    console.log("\nCurrent settings:\n");
    console.log(`  1. Mode type:        ${getModeTypeDescription(config)}`);
    if (config.modeType === "weeklyGoal") {
      console.log(`  2. Goal type:        ${config.goalType === "commits" ? "Commits per week" : "Percentage"}`);
      if (config.goalType === "commits") {
        console.log(`  3. Weekly goal:      ${config.weeklyCommitGoal} commits/week`);
      } else {
        console.log(`  3. Target:           ${config.targetPercentage}% human`);
        console.log(`  4. Tracking mode:    ${config.trackingMode}`);
      }
    }
    console.log(`  5. Stats window:     ${config.statsWindow}`);
    console.log("");

    const choice = await promptUser("Enter setting number to change (or press Enter to exit): ");
    if (choice === "") return;

    const settingNum = parseInt(choice, 10);

    switch (settingNum) {
      case 1: {
        // Change mode type - redirect to mode command
        const modeTypes = ModeTypeSchema.options;
        console.log("\nMode types:");
        modeTypes.forEach((mt, i) => {
          console.log(`  ${i + 1}. ${MODE_TYPE_LABELS[mt]} - ${MODE_TYPE_DESCRIPTIONS[mt]}`);
        });
        const modeChoice = await promptUser(`\nSelect [1-${modeTypes.length}]: `);
        const modeNum = parseInt(modeChoice, 10);
        if (modeNum >= 1 && modeNum <= modeTypes.length) {
          config.modeType = modeTypes[modeNum - 1];
          if (config.modeType === "learningProject") {
            console.log("\n📚 Learning Project mode is coming soon! Using Weekly Goal as fallback.\n");
            config.modeType = "weeklyGoal";
          }
        }
        break;
      }
      case 2: {
        if (config.modeType === "weeklyGoal") {
          const goalChoice = await promptUser("Goal type - 1. Commits per week, 2. Percentage: ");
          if (goalChoice === "1") config.goalType = "commits";
          else if (goalChoice === "2") config.goalType = "percentage";
        }
        break;
      }
      case 3: {
        if (config.modeType === "weeklyGoal" && config.goalType === "commits") {
          const goalStr = await promptUser("Weekly commit goal: ");
          const goalNum = parseInt(goalStr, 10);
          if (goalNum >= 1) config.weeklyCommitGoal = goalNum;
        } else if (config.modeType === "weeklyGoal" && config.goalType === "percentage") {
          const pctChoice = await promptUser("Percentage (10, 25, 50, 100): ");
          const pct = parseInt(pctChoice, 10);
          if (pct === 10 || pct === 25 || pct === 50 || pct === 100) {
            config.targetPercentage = pct;
          }
        }
        break;
      }
      case 4: {
        if (config.modeType === "weeklyGoal" && config.goalType === "percentage") {
          const tmChoice = await promptUser("Tracking mode - 1. Commits, 2. Lines: ");
          if (tmChoice === "1") config.trackingMode = "commits";
          else if (tmChoice === "2") config.trackingMode = "lines";
        }
        break;
      }
      case 5: {
        const swChoice = await promptUser("Stats window - 1. Last 24 hours, 2. Last 7 days, 3. All time: ");
        if (swChoice === "1") config.statsWindow = "oneDay";
        else if (swChoice === "2") config.statsWindow = "oneWeek";
        else if (swChoice === "3") config.statsWindow = "allTime";
        break;
      }
    }

    saveConfig(process.cwd(), config);
    console.log(`\n✅ Settings updated: ${getModeTypeDescription(config)}`);
  });

program
  .command("stats")
  .description("Show SPP status and statistics")
  .action(() => {
    const stats = getStats(process.cwd());
    console.log(formatStats(stats));
  });

program
  .command("pause")
  .description("Pause SPP for 24 hours (Claude writes freely)")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = false;
    config.pausedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    saveConfig(process.cwd(), config);
    console.log("⏸️  SPP enforcement paused for 24 hours. Claude may write code freely.");
    console.log("   Run 'spp resume' to resume SPP enforcement immediately.");
  });

program
  .command("resume")
  .description("Resume SPP tracking")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = true;
    delete config.pausedUntil;
    saveConfig(process.cwd(), config);
    console.log("▶️  SPP resumed. Coding enforcement is active.");
  });

program
  .command("reset")
  .description("Reset tracking to start from current commit")
  .action(async () => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const answer = await promptUser("This will reset tracking to start from the current commit. All previous stats will be cleared. Are you sure? (y/N): ");
    if (answer.toLowerCase() !== "y") {
      console.log("Reset cancelled.");
      return;
    }

    const headCommit = getHeadCommitHash(process.cwd());
    if (!headCommit) {
      console.error("❌ Could not get current commit hash.");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());
    config.trackingStartCommit = headCommit;
    saveConfig(process.cwd(), config);

    console.log(`✅ Tracking reset. Stats will now start from commit ${headCommit.substring(0, 7)}.`);
  });

program
  .command("drive")
  .description("Toggle drive mode (human writes code, Claude assists)")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.driveMode = !config.driveMode;
    saveConfig(process.cwd(), config);
    if (config.driveMode) {
      console.log("🚙 Drive mode enabled. Claude cannot write code.");
      console.log("   You're in the driver's seat - Claude will assist but not code.");
      console.log("   Run 'spp drive' again to toggle off.");
    } else {
      console.log("🚙 Drive mode disabled. Normal SPP enforcement resumed.");
    }
  });

// Pair programming commands
const pair = program
  .command("pair")
  .description("Pair programming session management");

pair
  .command("start")
  .argument("<task>", "description of the task to work on")
  .description("Start a pair programming session")
  .action((task: string) => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    if (config.modeType !== "pairProgramming") {
      console.error("❌ Not in Pair Programming mode. Run: spp mode 2");
      process.exit(1);
    }

    config.pairSession = {
      active: true,
      currentDriver: "human",
      task,
      humanTurns: 0,
      claudeTurns: 0,
      startedAt: new Date().toISOString(),
    };
    saveConfig(process.cwd(), config);

    console.log(`🤝 Pair programming session started!`);
    console.log(`   Task: ${task}`);
    console.log(`   Driver: Human (you're up!)`);
    console.log(`   Run 'spp pair rotate' to switch drivers.`);
  });

pair
  .command("rotate")
  .description("Rotate driver/navigator roles")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    if (!config.pairSession?.active) {
      console.error("❌ No active pair session. Run: spp pair start <task>");
      process.exit(1);
    }

    const oldDriver = config.pairSession.currentDriver;
    const newDriver = oldDriver === "human" ? "claude" : "human";

    if (oldDriver === "human") {
      config.pairSession.humanTurns++;
    } else {
      config.pairSession.claudeTurns++;
    }

    config.pairSession.currentDriver = newDriver;
    saveConfig(process.cwd(), config);

    const driverLabel = newDriver === "human" ? "Human" : "Claude";
    console.log(`🔄 Driver rotated! ${driverLabel} is now driving.`);
  });

pair
  .command("end")
  .description("End the current pair programming session")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    if (!config.pairSession?.active) {
      console.error("❌ No active pair session.");
      process.exit(1);
    }

    // Increment final turn
    if (config.pairSession.currentDriver === "human") {
      config.pairSession.humanTurns++;
    } else {
      config.pairSession.claudeTurns++;
    }

    const summary = {
      task: config.pairSession.task,
      humanTurns: config.pairSession.humanTurns,
      claudeTurns: config.pairSession.claudeTurns,
      startedAt: config.pairSession.startedAt,
    };

    config.pairSession = undefined;
    saveConfig(process.cwd(), config);

    console.log(`🏁 Pair programming session ended!`);
    console.log(`   Task: ${summary.task}`);
    console.log(`   Human turns: ${summary.humanTurns}`);
    console.log(`   Claude turns: ${summary.claudeTurns}`);
    if (summary.startedAt) {
      const duration = Date.now() - new Date(summary.startedAt).getTime();
      const minutes = Math.round(duration / 60000);
      console.log(`   Duration: ${minutes} minutes`);
    }
  });

// Default pair command (no subcommand) - show status
pair.action(() => {
  if (!isFullyInitialized(process.cwd())) {
    console.error("❌ SPP not initialized. Run: spp init");
    process.exit(1);
  }

  const config = loadConfig(process.cwd());

  if (config.modeType !== "pairProgramming") {
    console.log("Not in Pair Programming mode. Run: spp mode 2");
    return;
  }

  const session = config.pairSession;
  if (!session?.active) {
    console.log("No active pair session. Run: spp pair start <task>");
    return;
  }

  const driver = session.currentDriver === "human" ? "Human" : "Claude";
  const navigator = session.currentDriver === "human" ? "Claude" : "Human";
  console.log(`🤝 Pair Programming Session`);
  console.log(`   Task: ${session.task}`);
  console.log(`   Driver: ${driver}`);
  console.log(`   Navigator: ${navigator}`);
  console.log(`   Human turns: ${session.humanTurns}`);
  console.log(`   Claude turns: ${session.claudeTurns}`);
});

// Hook commands (called by Claude Code)

program
  .command("hook:pre-tool-use")
  .description("Pre-tool-use hook (internal, reads JSON from stdin)")
  .action(async () => {
    await runPreToolUseHook();
  });

program
  .command("hook:system-prompt")
  .description("Output system prompt injection (internal)")
  .action(() => {
    console.log(generateSystemPrompt(process.cwd()));
  });

program
  .command("hook:status-line")
  .description("Output status line for Claude Code (internal)")
  .action(() => {
    console.log(generateStatusLine(process.cwd()));
  });

program.parseAsync();
