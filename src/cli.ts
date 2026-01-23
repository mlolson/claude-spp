#!/usr/bin/env node
import { Command } from "commander";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeStp, isFullyInitialized, promptUser } from "./init.js";
import { getHeadCommitHash } from "./git/history.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import { getCurrentMode, getModeByNumber, getModeByName, MODES } from "./config/schema.js";
import { getStats, formatStats } from "./stats.js";

function getModesExplanation(): string {
  const config = loadConfig(process.cwd());
  const currentMode = getCurrentMode(config);
  const lines = ["Coding modes:"];
  for (const mode of MODES) {
    const marker = mode.number === currentMode.number ? " <-- current" : "";
    lines.push(`  ${mode.number}. ${mode.name} - ${mode.description}${marker}`);
  }
  return lines.join("\n");
}

const program = new Command();

program
  .name("stp")
  .description("STP CLI - Simian Training Plugin for Claude - https://github.com/mlolson/claude-stp")
  .version("0.1.0");

// User commands

program
  .command("init")
  .argument("[mode]", "mode number 1-6")
  .description("Initialize STP")
  .action(async (mode: string | undefined) => {
    const modeNum = mode ? parseInt(mode, 10) : undefined;
    const config = await initializeStp(process.cwd(), modeNum);
    saveConfig(process.cwd(), config);

    const currentMode = getCurrentMode(config);
    console.log("");
    console.log(`✅ STP initialized with mode ${currentMode.number}: ${currentMode.name}`);
    console.log(`${currentMode.description}`);
    console.log(`Install directory: .claude-stp/`);
    console.log(`Git hook: .git/hooks/post-commit\n`);

    console.log("Analyzing repo...");
    const stats = getStats(process.cwd());
    console.log(formatStats(stats));
  });

program
  .command("mode")
  .argument("[value]", "mode number or name")
  .description("Show or change the current mode")
  .action(async (value: string | undefined) => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ STP not initialized. Run: stp init");
      process.exit(1);
    }

    const config = loadConfig(process.cwd());

    // If no argument, show current mode
    if (!value) {
      const currentMode = getModeByNumber(config.mode);

      if (!currentMode) {
        console.log("Current mode: none");
      } else {
        console.log(`Current mode: ${currentMode.number}, ${currentMode.name}, ${currentMode.description}`);
      }
      return;
    }

    // Try to parse as number first
    let selectedMode = getModeByNumber(parseInt(value, 10));

    // If not a number, try by name
    if (!selectedMode) {
      selectedMode = getModeByName(value);
    }

    if (!selectedMode) {
      throw Error(`❌ Unknown mode: ${value}  Use a number 1-6 or a mode name`);
    }

    // Update config
    config.mode = selectedMode.number;
    saveConfig(process.cwd(), config);

    console.log(`✅ Mode changed to ${selectedMode.number}: ${selectedMode.name}`);
    console.log(`   ${selectedMode.description}`);
  });

program
  .command("modes")
  .description("List available modes")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ STP not initialized. Run: stp init");
      process.exit(1);
    }

    console.log(getModesExplanation());
    console.log("To change mode: stp mode <number>");
  });

program
  .command("stats")
  .description("Show STP status and statistics")
  .action(() => {
    const stats = getStats(process.cwd());
    console.log(formatStats(stats));
  });

program
  .command("pause")
  .description("Pause STP for 24 hours (Claude writes freely)")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ STP not initialized. Run: stp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = false;
    config.pausedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    saveConfig(process.cwd(), config);
    console.log("⏸️  STP enforcement paused for 24 hours. Claude may write code freely.");
    console.log("   Run 'stp resume' to resume STP enforcement immediately.");
  });

program
  .command("resume")
  .description("Resume STP tracking")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ STP not initialized. Run: stp init");
      process.exit(1);
    }
    const config = loadConfig(process.cwd());
    config.enabled = true;
    delete config.pausedUntil;
    saveConfig(process.cwd(), config);
    console.log("▶️  STP resumed. Coding enforcement is active.");
  });

program
  .command("reset")
  .description("Reset tracking to start from current commit")
  .action(async () => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ STP not initialized. Run: stp init");
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

program.parseAsync();
