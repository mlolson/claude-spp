#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { runPreResponseHook } from "./hooks/pre-response.js";
import { runPostResponseHook } from "./hooks/post-response.js";
import { runPromptReminderHook } from "./hooks/prompt-reminder.js";
import { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
import { initializeDojo, isFullyInitialized } from "./init.js";
import { loadConfig } from "./config/loader.js";
import { loadState, addHumanLines } from "./state/manager.js";
import { calculateRatio } from "./state/schema.js";
import { getEffectiveRatio } from "./config/schema.js";
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

    case "hook:prompt-reminder":
      await runPromptReminderHook();
      break;

    case "hook:pre-response":
      await runPreResponseHook();
      break;

    case "hook:post-response":
      await runPostResponseHook();
      break;

    case "hook:system-prompt":
      // Output system prompt for current directory
      console.log(generateSystemPrompt(process.cwd()));
      break;

    case "hook:status":
      // Output compact status line
      console.log(generateStatusLine(process.cwd()));
      break;

    case "hook:install": {
      // Install git post-commit hook for tracking human lines
      const cwd = process.cwd();

      // Check if we're in a git repo
      try {
        execSync("git rev-parse --git-dir", { cwd, stdio: "ignore" });
      } catch {
        console.error("❌ Not a git repository");
        process.exit(1);
      }

      const gitHooksDir = path.join(cwd, ".git", "hooks");
      const hookPath = path.join(gitHooksDir, "post-commit");
      const sourceHook = path.join(cwd, "hooks", "git-post-commit.sh");

      // Check if source hook exists
      if (!fs.existsSync(sourceHook)) {
        console.error("❌ Hook source not found:", sourceHook);
        process.exit(1);
      }

      // Check if hook already exists
      if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, "utf-8");
        if (existing.includes("Dojo post-commit hook")) {
          console.log("✅ Dojo git hook already installed");
          break;
        }
        console.error("❌ A post-commit hook already exists. Please manually integrate or remove it.");
        console.error("   Path:", hookPath);
        process.exit(1);
      }

      // Ensure hooks directory exists
      if (!fs.existsSync(gitHooksDir)) {
        fs.mkdirSync(gitHooksDir, { recursive: true });
      }

      // Copy hook and make executable
      const hookContent = fs.readFileSync(sourceHook, "utf-8");
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });

      console.log("✅ Installed git post-commit hook");
      console.log("   Human lines will be tracked automatically from commits");
      console.log("   (Commits with 'Co-Authored-By: Claude' are skipped)");
      break;
    }

    // User commands
    case "init": {
      try {
        // If preset provided as argument, use it; otherwise prompt interactively
        const presetArg = args[1] as "light" | "balanced" | "intensive" | "training" | undefined;
        const validPresets = ["light", "balanced", "intensive", "training"];
        const preset = presetArg && validPresets.includes(presetArg) ? presetArg : undefined;

        const config = await initializeDojo(process.cwd(), preset);
        console.log(`✅ Dojo initialized with "${config.preset}" preset`);
        console.log(`   Target: ${(getEffectiveRatio(config) * 100).toFixed(0)}% human-written code`);
        console.log(`   Directory: .dojo/`);
      } catch (error) {
        console.error("❌ Failed to initialize:", error);
        process.exit(1);
      }
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
      const lines = args[3] ? parseInt(args[3], 10) : undefined;
      if (!filename || !completedBy || !["human", "claude"].includes(completedBy)) {
        console.error("Usage: node dist/cli.js complete <filename> <human|claude> [lines]");
        process.exit(1);
      }
      const result = completeTask(process.cwd(), {
        filename,
        completedBy,
        linesOfCode: lines,
      });
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case "add-lines": {
      if (!isFullyInitialized(process.cwd())) {
        console.error("❌ Dojo not initialized. Run: node dist/cli.js init");
        process.exit(1);
      }
      const who = args[1] as "human" | "claude";
      const count = parseInt(args[2], 10);
      if (!who || !["human", "claude"].includes(who) || isNaN(count)) {
        console.error("Usage: node dist/cli.js add-lines <human|claude> <count>");
        process.exit(1);
      }
      if (who === "human") {
        addHumanLines(process.cwd(), count);
        console.log(`✅ Added ${count} lines to human count`);
      } else {
        const { addClaudeLines } = await import("./state/manager.js");
        addClaudeLines(process.cwd(), count);
        console.log(`✅ Added ${count} lines to Claude count`);
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
      const state = loadState(process.cwd());
      const ratio = calculateRatio(state.session);
      const target = getEffectiveRatio(config);
      const healthy = ratio >= target;
      console.log(`Dojo: ${healthy ? "✅" : "⚠️"} ${(ratio * 100).toFixed(0)}% human / ${(target * 100).toFixed(0)}% target`);
      console.log(`  Human: ${state.session.humanLines} lines`);
      console.log(`  Claude: ${state.session.claudeLines} lines`);
      break;
    }

    case "help":
    default:
      console.log(`
Dojo CLI - Maintain your programming skills

Usage: node dist/cli.js <command> [options]

Commands:
  init [preset]              Initialize Dojo (presets: light, balanced, intensive, training)
  stats                      Show detailed statistics
  status                     Show quick status
  tasks [filter]             List tasks (filters: all, human, claude, unassigned, completed)
  create <title> [desc]      Create a new task
  assign <file> <who>        Assign task to human or claude
  complete <file> <who> [n]  Mark task complete (optionally with line count)
  add-lines <who> <count>    Manually add line count

Hook Commands (used by Claude Code):
  hook:install               Install git post-commit hook for tracking human lines
  hook:pre-response          Pre-response hook (reads JSON from stdin)
  hook:post-response         Post-response hook (reads JSON from stdin)
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
