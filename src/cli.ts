#!/usr/bin/env node
import { runPreResponseHook } from "./hooks/pre-response.js";
import { runPostResponseHook } from "./hooks/post-response.js";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeStp, isFullyInitialized, installGitHook } from "./init.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import { calculateRatio } from "./stats.js";
import { getLineCounts } from "./git/history.js";
import { getEffectiveRatio, getCurrentMode, getModeByNumber, getModeByName, MODES } from "./config/schema.js";
import { getStats, formatStats } from "./stats.js";

const args = process.argv.slice(2);
const command = args[0];

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

function getHelpMessage(): string {
  return `
STP CLI - Simian Training Plugin

Usage: node dist/cli.js <command> [options]

Commands:
  init [mode]                Initialize STP (mode: 1-6, default: 4)
  mode [number|name]         Show or change the current mode
  stats                      Show detailed statistics
  status                     Show quick status

${getModesExplanation()}

Hook Commands (used by Claude Code):
  hook:pre-tool-use          Pre-tool-use hook (reads JSON from stdin)
  hook:system-prompt         Output system prompt injection
  hook:status                Output compact status line
`;
}

async function main() {
  switch (command) {
    // Hook commands (called by Claude Code)

    case "hook:pre-response":
      await runPreResponseHook();
      break;

    case "hook:post-response":
      await runPostResponseHook();
      break;

    case "hook:pre-tool-use":
      await runPreToolUseHook();
      break;

    case "hook:system-prompt":
      // Output system prompt for current directory
      console.log(generateSystemPrompt(process.cwd()));
      break;

    case "hook:status":
      // Output compact status line
      console.log(generateStatusLine(process.cwd()));
      break;

    // User commands
    case "init": {
      // If mode number provided as argument, use it
      const mode = args[1] ? parseInt(args[1], 10) : undefined;
      const config = await initializeStp(process.cwd(), mode);
      saveConfig(process.cwd(), config);

      const currentMode = getCurrentMode(config);
      console.log("");
      console.log(`✅ STP initialized with mode ${currentMode.number}: ${currentMode.name}`);
      console.log(`${currentMode.description}`);
      console.log(`Install directory: .stp/`);
      console.log(`Git hook: .git/hooks/post-commit\n`);

      console.log("Analyzing repo...");
      const stats = getStats(process.cwd());
      console.log(formatStats(stats));
      break;
    }

    case "modes": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ STP not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }

      console.log(getModesExplanation());
      console.log("To change mode: node dist/cli.js mode <number>");
      break;
    }

    case "mode": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ STP not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }

      const config = loadConfig(process.cwd());
      const modeArg = args[1];

      // If no argument, get current mode
      if (!modeArg) {
        const currentMode = getModeByNumber(config.mode);

        if (!currentMode) {
          console.log("Current mode: none");
        } else {
          console.log(`Current mode: ${currentMode.number}, ${currentMode.name}, ${currentMode.description}`);
        }
        break;
      }

      // Try to parse as number first
      let selectedMode = getModeByNumber(parseInt(modeArg, 10));

      // If not a number, try by name
      if (!selectedMode) {
        selectedMode = getModeByName(modeArg);
      }

      if (!selectedMode) {
        throw Error(`❌ Unknown mode: ${modeArg}  Use a number 1-6 or a mode name`);
      }

      // Update config
      config.mode = selectedMode.number;
      saveConfig(process.cwd(), config);

      console.log(`✅ Mode changed to ${selectedMode.number}: ${selectedMode.name}`);
      console.log(`   ${selectedMode.description}`);
      break;
    }

    case "stats": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ STP not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const stats = getStats(process.cwd());
      console.log(formatStats(stats));
      break;
    }

    case "status": {
      if (!isFullyInitialized(process.cwd())) {
        console.log("STP: Not initialized");
        break;
      }
      const config = loadConfig(process.cwd());
      if (!config.enabled) {
        console.log("STP: Disabled");
        break;
      }
      const currentMode = getCurrentMode(config);
      const lineCounts = getLineCounts(process.cwd());
      const ratio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
      const target = getEffectiveRatio(config);
      const healthy = ratio >= target;
      console.log(`STP: ${healthy ? "✅" : "⚠️"} ${(ratio * 100).toFixed(0)}% human / ${(target * 100).toFixed(0)}% target`);
      console.log(`  Mode: ${currentMode.number}. ${currentMode.name} (${currentMode.description})`);
      console.log(`  Human: ${lineCounts.humanLines} lines, ${lineCounts.humanCommits} commits`);
      console.log(`  Claude: ${lineCounts.claudeLines} lines, ${lineCounts.claudeCommits} commits`);
      break;
    }

    case "help":
      console.log(getHelpMessage());
      break;
    default:
      throw new Error(getHelpMessage());
  }
}

main();
