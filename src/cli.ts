#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { runPreResponseHook } from "./hooks/pre-response.js";
import { runPostResponseHook } from "./hooks/post-response.js";
import { runPreToolUseHook } from "./hooks/pre-tool-use.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeDojo, isFullyInitialized } from "./init.js";
import { loadConfig, saveConfig } from "./config/loader.js";
import { clearCurrentTask } from "./state/manager.js";
import { focusTask, getCurrentFocusedTask } from "./tasks/focus.js";
import { calculateRatio } from "./state/schema.js";
import { getLineCounts } from "./git/history.js";
import { getEffectiveRatio, getCurrentMode, getModeByNumber, getModeByName, MODES } from "./config/schema.js";
import { parseActiveTasks, parseTasksInDirectory } from "./tasks/parser.js";
import { createTask } from "./tasks/generator.js";
import { assignTask } from "./tasks/assignment.js";
import { completeTask } from "./tasks/completion.js";
import { getStats, formatStats } from "./commands/stats.js";
import { listTasks, formatTaskList } from "./commands/task.js";

const args = process.argv.slice(2);
const command = args[0];

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
      try {
        // If mode number provided as argument, use it
        const modeArg = args[1] ? parseInt(args[1], 10) : undefined;
        const mode = modeArg && modeArg >= 1 && modeArg <= 6 ? modeArg : 4; // Default to 50-50

        const config = await initializeDojo(process.cwd(), undefined);
        // Update with selected mode
        config.mode = mode;
        saveConfig(process.cwd(), config);

        const currentMode = getCurrentMode(config);
        console.log(`✅ Dojo initialized with mode ${currentMode.number}: ${currentMode.name}`);
        console.log(`   ${currentMode.description}`);
        console.log(`   Directory: .dojo/`);
      } catch (error) {
        console.error("❌ Failed to initialize:", error);
        process.exit(1);
      }
      break;
    }

    case "mode": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }

      const modeArg = args[1];

      // If no argument, list available modes
      if (!modeArg) {
        const config = loadConfig(process.cwd());
        const currentMode = getCurrentMode(config);
        console.log("## Dojo Modes\n");
        for (const mode of MODES) {
          const marker = mode.number === currentMode.number ? " <-- current" : "";
          console.log(`  ${mode.number}. ${mode.name} - ${mode.description}${marker}`);
        }
        console.log("\nTo change mode: node dist/cli.js mode <number>");
        break;
      }

      // Try to parse as number first
      let selectedMode = getModeByNumber(parseInt(modeArg, 10));

      // If not a number, try by name
      if (!selectedMode) {
        selectedMode = getModeByName(modeArg);
      }

      if (!selectedMode) {
        console.error(`❌ Unknown mode: ${modeArg}`);
        console.error("   Use a number 1-6 or a mode name");
        process.exit(1);
      }

      // Update config
      const config = loadConfig(process.cwd());
      config.mode = selectedMode.number;
      saveConfig(process.cwd(), config);

      console.log(`✅ Mode changed to ${selectedMode.number}: ${selectedMode.name}`);
      console.log(`   ${selectedMode.description}`);
      break;
    }

    case "stats": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const stats = getStats(process.cwd());
      console.log(formatStats(stats));
      break;
    }

    case "tasks": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const tasks = listTasks(process.cwd());
      console.log(formatTaskList(tasks));
      break;
    }

    case "create": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const title = args[1];
      const description = args[2] || "";
      if (!title) {
        console.error("Usage: node dist/cli.js create <title> [description]");
        process.exit(1);
      }
      const result = createTask(process.cwd(), { title, description });
      console.log(`✅ Created task: ${result.filename}`);
      console.log(`   Path: ${result.filepath}`);
      break;
    }

    case "assign": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const filename = args[1];
      const assignee = args[2] as "human" | "claude";
      if (!filename || !assignee || !["human", "claude"].includes(assignee)) {
        console.error("Usage: node dist/cli.js assign <filename> <human|claude>");
        process.exit(1);
      }
      const task = assignTask(process.cwd(), filename, assignee);
      if (task) {
        console.log(`✅ Assigned "${task.title}" to ${assignee}`);
      } else {
        console.error(`❌ Task not found: ${filename}`);
        process.exit(1);
      }
      break;
    }

    case "complete": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const filename = args[1];
      const completedBy = args[2] as "human" | "claude";
      if (!filename || !completedBy || !["human", "claude"].includes(completedBy)) {
        console.error("Usage: node dist/cli.js complete <filename> <human|claude>");
        process.exit(1);
      }
      const result = completeTask(process.cwd(), {
        filename,
        completedBy,
      });
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case "focus": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const filename = args[1];
      if (!filename) {
        // Show current focus and available tasks
        const currentTask = getCurrentFocusedTask(process.cwd());
        if (currentTask) {
          console.log(`Currently focused: ${currentTask.title} (${currentTask.filename})`);
        } else {
          console.log("No task currently focused.");
        }
        console.log("");
        console.log("Available tasks:");
        const tasks = listTasks(process.cwd());
        const claudeTasks = tasks.filter(t => t.directory === "claude");
        const humanTasks = tasks.filter(t => t.directory === "human");
        const unassignedTasks = tasks.filter(t => t.directory === "unassigned");
        if (claudeTasks.length > 0) {
          console.log("  Claude:");
          for (const t of claudeTasks) {
            console.log(`    - ${t.filename}: ${t.title}`);
          }
        }
        if (humanTasks.length > 0) {
          console.log("  Human:");
          for (const t of humanTasks) {
            console.log(`    - ${t.filename}: ${t.title}`);
          }
        }
        if (unassignedTasks.length > 0) {
          console.log("  Unassigned:");
          for (const t of unassignedTasks) {
            console.log(`    - ${t.filename}: ${t.title}`);
          }
        }
        if (claudeTasks.length === 0 && humanTasks.length === 0 && unassignedTasks.length === 0) {
          console.log("  No tasks found. Create one: node dist/cli.js create \"Task title\"");
        }
        break;
      }
      const result = focusTask(process.cwd(), filename);
      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.autoAssigned) {
          console.log("   Task was unassigned, now assigned to Claude.");
        }
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case "unfocus": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const currentTask = getCurrentFocusedTask(process.cwd());
      if (currentTask) {
        clearCurrentTask(process.cwd());
        console.log(`✅ Unfocused from "${currentTask.title}"`);
      } else {
        console.log("No task was focused.");
      }
      break;
    }

    case "status": {
      if (!isFullyInitialized(process.cwd())) {
        console.log("Dojo: Not initialized");
        break;
      }
      const config = loadConfig(process.cwd());
      if (!config.enabled) {
        console.log("Dojo: Disabled");
        break;
      }
      const currentMode = getCurrentMode(config);
      const lineCounts = getLineCounts(process.cwd());
      const ratio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
      const target = getEffectiveRatio(config);
      const healthy = ratio >= target;
      console.log(`Dojo: ${healthy ? "✅" : "⚠️"} ${(ratio * 100).toFixed(0)}% human / ${(target * 100).toFixed(0)}% target`);
      console.log(`  Mode: ${currentMode.number}. ${currentMode.name} (${currentMode.description})`);
      console.log(`  Human: ${lineCounts.humanLines} lines, ${lineCounts.humanCommits} commits`);
      console.log(`  Claude: ${lineCounts.claudeLines} lines, ${lineCounts.claudeCommits} commits`);
      // Show current task
      const currentTaskStatus = getCurrentFocusedTask(process.cwd());
      if (currentTaskStatus) {
        console.log(`  Current task: ${currentTaskStatus.title} (${currentTaskStatus.filename})`);
      } else {
        console.log("  Current task: None");
      }
      break;
    }

    case "help":
    default:
      console.log(`
Dojo CLI - Maintain your programming skills

Usage: node dist/cli.js <command> [options]

Commands:
  init [mode]                Initialize Dojo (mode: 1-6, default: 4)
  mode [number|name]         Show or change the current mode
  stats                      Show detailed statistics
  status                     Show quick status
  tasks                      List all tasks
  create <title> [desc]      Create a new task
  assign <file> <who>        Assign task to human or claude
  focus [file]               Focus on a task (required before writing code)
  unfocus                    Clear task focus
  complete <file> <who>      Mark task complete

Modes:
  1. Yolo              100% AI coding
  2. Padawan           90% AI / 10% human
  3. Clever monkey     75% AI / 25% human
  4. 50-50             50% AI / 50% human
  5. Finger workout    25% AI / 75% human
  6. Switching to guns 100% human coding

Hook Commands (used by Claude Code):
  hook:pre-tool-use          Pre-tool-use hook (reads JSON from stdin)
  hook:system-prompt         Output system prompt injection
  hook:status                Output compact status line
`);
      break;
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
