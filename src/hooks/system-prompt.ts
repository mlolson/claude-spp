import { loadConfig } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { parseActiveTasks, parseTasksInDirectory } from "../tasks/parser.js";
import type { Task } from "../tasks/parser.js";
import { getCurrentFocusedTask } from "../tasks/focus.js";
import { getLineCounts } from "../git/history.js";

/**
 * Generate the Dojo system prompt injection
 */
export function generateSystemPrompt(projectPath: string): string {
  const config = loadConfig(projectPath);

  // If Dojo is disabled, return empty
  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);
  const currentMode = getCurrentMode(config);

  // Get tasks
  const humanTasks = parseTasksInDirectory(projectPath, "human");
  const claudeTasks = parseTasksInDirectory(projectPath, "claude");
  const unassignedTasks = parseTasksInDirectory(projectPath, "unassigned");

  // Get current focused task
  const currentTask = getCurrentFocusedTask(projectPath);

  const lines: string[] = [
    "<dojo>",
    "# Dojo Mode Active",
    "",
    "You are operating in Dojo mode. This mode helps the human maintain their programming skills",
    "by ensuring they write a minimum percentage of the code themselves.",
    "",
    "## Current Status",
    "",
    `- **Mode:** ${currentMode.number}. ${currentMode.name} (${currentMode.description})`,
    `- **Target ratio:** ${(targetRatio * 100).toFixed(0)}% human-written code`,
    `- **Current ratio:** ${(currentRatio * 100).toFixed(0)}% human (${lineCounts.humanLines} lines) / ${(100 - currentRatio * 100).toFixed(0)}% Claude (${lineCounts.claudeLines} lines)`,
    `- **Status:** ${isHealthy ? "✅ Healthy" : "⚠️ Below target"}`,
    "",
    "## Current Task",
    "",
  ];

  if (currentTask) {
    lines.push(`**Focused on:** ${currentTask.title} (\`${currentTask.filename}\`)`);
    lines.push("");
    lines.push(`When finished: \`node dist/cli.js complete ${currentTask.filename} claude\``);
  } else {
    lines.push("**No task currently focused.**");
    lines.push("");
    lines.push("Before writing code, focus a task: `node dist/cli.js focus <filename>`");
  }
  lines.push("");

  // Workflow section
  lines.push("## Workflow");
  lines.push("");
  lines.push("1. **Think** - Consider what needs to be done");
  lines.push("2. **Focus** - `node dist/cli.js focus <filename>`");
  lines.push("3. **Work** - Implement (writes allowed while focused)");
  lines.push("4. **Complete** - `node dist/cli.js complete <filename> claude`");
  lines.push("");

  // Add rules based on ratio health
  if (!isHealthy) {
    lines.push("## ⚠️ Action Required");
    lines.push("");
    lines.push("The human work ratio is below the target. Before writing more code:");
    lines.push("");
    lines.push("1. **Prefer teaching over doing** - Guide the human through the solution instead of writing it");
    lines.push("2. **Assign tasks to human** - If there are unassigned tasks, assign them to the human");
    lines.push("3. **Use Socratic method** - Ask questions that help the human discover the solution");
    lines.push("4. **Offer hints, not solutions** - Provide guidance without writing the full code");
    lines.push("");
    lines.push("You MAY still write code if:");
    lines.push("- The human explicitly requests it after being informed of the ratio");
    lines.push("- It's a trivial change (< 5 lines)");
    lines.push("- It's fixing a bug you introduced");
    lines.push("");
  }

  // Add task information
  lines.push("## Active Tasks");
  lines.push("");

  if (humanTasks.length > 0) {
    lines.push("### Assigned to Human");
    for (const task of humanTasks) {
      lines.push(`- [ ] **${task.title}** (${task.metadata.difficulty}) - ${task.filename}`);
    }
    lines.push("");
  }

  if (claudeTasks.length > 0) {
    lines.push("### Assigned to Claude");
    for (const task of claudeTasks) {
      lines.push(`- [ ] **${task.title}** (${task.metadata.difficulty}) - ${task.filename}`);
    }
    lines.push("");
  }

  if (unassignedTasks.length > 0) {
    lines.push("### Unassigned (Backlog)");
    for (const task of unassignedTasks.slice(0, 5)) {
      lines.push(`- **${task.title}** (${task.metadata.difficulty})`);
    }
    if (unassignedTasks.length > 5) {
      lines.push(`- ... and ${unassignedTasks.length - 5} more`);
    }
    lines.push("");
  }

  if (humanTasks.length === 0 && claudeTasks.length === 0 && unassignedTasks.length === 0) {
    lines.push("No active tasks. Consider creating tasks for upcoming work.");
    lines.push("");
  }

  // Quiz feature
  lines.push("## Learning");
  lines.push("");
  lines.push("Use `/dojo:quiz` to test the human's knowledge of the codebase.");
  lines.push("");

  // Commands
  lines.push("## Dojo Commands");
  lines.push("");
  lines.push("The human can use these commands:");
  lines.push("- `/dojo:status` - Show current status");
  lines.push("- `/dojo:stats` - Show detailed metrics");
  lines.push("- `/dojo:tasks` - List all tasks");
  lines.push("- `/dojo:assign <filename> <human|claude>` - Assign a task");
  lines.push("- `/dojo:complete <filename>` - Mark task as complete");
  lines.push("- `/dojo:create` - Create a new task");
  lines.push("");

  lines.push("</dojo>");

  return lines.join("\n");
}

/**
 * Generate a compact status line for the prompt
 */
export function generateStatusLine(projectPath: string): string {
  const config = loadConfig(projectPath);

  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);

  const status = isHealthy ? "✅" : "⚠️";
  return `[Dojo ${status} ${(currentRatio * 100).toFixed(0)}%/${(targetRatio * 100).toFixed(0)}% human]`;
}
