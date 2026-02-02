#!/usr/bin/env node
import { Command } from "commander";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeSpp, isFullyInitialized, promptUser } from "./init.js";
import { getHeadCommitHash } from "./vcs/index.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import { getCurrentMode, getModeByNumber, getModeByName, MODES } from "./config/schema.js";
import { getStats, formatStats } from "./stats.js";
import {
  hasPairSession,
  loadPairSession,
  startPairSession,
  endPairSession,
  rotateDriver,
  formatPairSession,
  formatSessionSummary,
  type Driver,
} from "./pair-session.js";

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
  .name("spp")
  .description("SPP CLI - Simian Programmer Plugin for Claude - https://github.com/mlolson/claude-spp")
  .version("0.1.0");

// User commands

program
  .command("init")
  .argument("[mode]", "mode number 1-6")
  .description("Initialize SPP")
  .action(async (mode: string | undefined) => {
    const modeNum = mode ? parseInt(mode, 10) : undefined;
    const config = await initializeSpp(process.cwd(), modeNum);
    saveConfig(process.cwd(), config);

    const currentMode = getCurrentMode(config);
    const vcsType = config.vcsType ?? "git";
    const hookPath = vcsType === "git" ? ".git/hooks/post-commit" : ".hg/hgrc [hooks]";

    console.log("");
    console.log(`✅ SPP initialized with mode ${currentMode.number}: ${currentMode.name}`);
    console.log(`${currentMode.description}`);
    console.log(`Install directory: .claude-spp/`);
    console.log(`VCS: ${vcsType}`);
    console.log(`Hook: ${hookPath}\n`);

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
      console.error("❌ SPP not initialized. Run: spp init");
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
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    console.log(getModesExplanation());
    console.log("To change mode: spp mode <number>");
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

// Pair programming commands

const pairCmd = program
  .command("pair")
  .description("Pair programming mode - collaborate with Claude");

pairCmd
  .command("start")
  .argument("<task>", "Description of what you're working on")
  .option("-d, --driver <driver>", "Starting driver: claude or human", "claude")
  .description("Start a pair programming session")
  .action((task: string, options: { driver: string }) => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    if (hasPairSession(process.cwd())) {
      console.error("❌ A pair session is already active. Run 'spp pair end' first.");
      process.exit(1);
    }

    const driver = options.driver as Driver;
    if (driver !== "claude" && driver !== "human") {
      console.error("❌ Driver must be 'claude' or 'human'");
      process.exit(1);
    }

    // Auto-switch to pair mode if not already
    const config = loadConfig(process.cwd());
    if (config.mode !== 6) {
      config.mode = 6;
      saveConfig(process.cwd(), config);
      console.log("📝 Switched to Pair monkey mode (6)");
    }

    const session = startPairSession(process.cwd(), task, driver);
    const driverEmoji = driver === "claude" ? "🤖" : "👤";
    const driverLabel = driver === "claude" ? "Claude" : "You";

    console.log("");
    console.log("🤝 Pair programming session started!");
    console.log("");
    console.log(`   Task: ${task}`);
    console.log(`   First driver: ${driverEmoji} ${driverLabel}`);
    console.log("");
    console.log("   Commands:");
    console.log("     spp pair          - Show session status");
    console.log("     spp pair rotate   - Switch driver");
    console.log("     spp pair end      - End session");
    console.log("");
  });

pairCmd
  .command("status", { isDefault: true })
  .description("Show current pair session status")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const session = loadPairSession(process.cwd());
    if (!session) {
      console.log("");
      console.log("No active pair programming session.");
      console.log("");
      console.log("Start one with: spp pair start \"<task description>\"");
      console.log("");
      return;
    }

    console.log(formatPairSession(session));
  });

pairCmd
  .command("rotate")
  .description("Switch driver/navigator roles")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const session = rotateDriver(process.cwd());
    if (!session) {
      console.error("❌ No active pair session. Start one with: spp pair start \"<task>\"");
      process.exit(1);
    }

    const driverEmoji = session.driver === "claude" ? "🤖" : "👤";
    const driverLabel = session.driver === "claude" ? "Claude" : "Human";
    const navigatorEmoji = session.driver === "claude" ? "👤" : "🤖";
    const navigatorLabel = session.driver === "claude" ? "Human" : "Claude";

    console.log("");
    console.log("🔄 Roles rotated!");
    console.log("");
    console.log(`   Driver:    ${driverEmoji} ${driverLabel}`);
    console.log(`   Navigator: ${navigatorEmoji} ${navigatorLabel}`);
    console.log("");
  });

pairCmd
  .command("end")
  .description("End the current pair programming session")
  .action(() => {
    if (!isFullyInitialized(process.cwd())) {
      console.error("❌ SPP not initialized. Run: spp init");
      process.exit(1);
    }

    const session = endPairSession(process.cwd());
    if (!session) {
      console.error("❌ No active pair session.");
      process.exit(1);
    }

    console.log(formatSessionSummary(session));
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
