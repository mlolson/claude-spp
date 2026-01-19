import { loadConfig } from "../config/loader.js";
import { loadState } from "../state/manager.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getEffectiveRatio } from "../config/schema.js";
import { parseTasksInDirectory } from "../tasks/parser.js";
/**
 * Generate the Dojo system prompt injection
 */
export function generateSystemPrompt(projectPath) {
    const config = loadConfig(projectPath);
    const state = loadState(projectPath);
    // If Dojo is disabled, return empty
    if (!config.enabled) {
        return "";
    }
    const currentRatio = calculateRatio(state.session);
    const targetRatio = getEffectiveRatio(config);
    const isHealthy = isRatioHealthy(state.session, targetRatio);
    // Get tasks
    const humanTasks = parseTasksInDirectory(projectPath, "human");
    const claudeTasks = parseTasksInDirectory(projectPath, "claude");
    const unassignedTasks = parseTasksInDirectory(projectPath, "unassigned");
    const lines = [
        "<dojo>",
        "# Dojo Mode Active",
        "",
        "You are operating in Dojo mode. This mode helps the human maintain their programming skills",
        "by ensuring they write a minimum percentage of the code themselves.",
        "",
        "## Current Status",
        "",
        `- **Target ratio:** ${(targetRatio * 100).toFixed(0)}% human-written code`,
        `- **Current ratio:** ${(currentRatio * 100).toFixed(0)}% human (${state.session.humanLines} lines) / ${(100 - currentRatio * 100).toFixed(0)}% Claude (${state.session.claudeLines} lines)`,
        `- **Status:** ${isHealthy ? "✅ Healthy" : "⚠️ Below target"}`,
        "",
    ];
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
    // Teaching guidelines
    lines.push("## Teaching Guidelines");
    lines.push("");
    lines.push("When the human asks questions:");
    lines.push("1. Classify if it's a **teaching moment** (conceptual, debugging, how-to) or needs a **direct answer** (syntax, factual)");
    lines.push("2. For teaching moments, use the Socratic method - ask guiding questions");
    lines.push("3. Escalate from hints to explanations only if the human is stuck");
    lines.push("4. Always offer to let them try first before showing the solution");
    lines.push("");
    // Commands
    lines.push("## Dojo Commands");
    lines.push("");
    lines.push("The human can use these commands:");
    lines.push("- `/dojo stats` - Show current metrics");
    lines.push("- `/dojo tasks` - List all tasks");
    lines.push("- `/dojo assign <filename> <human|claude>` - Assign a task");
    lines.push("- `/dojo complete <filename>` - Mark task as complete");
    lines.push("- `/dojo create` - Create a new task");
    lines.push("");
    lines.push("</dojo>");
    return lines.join("\n");
}
/**
 * Generate a compact status line for the prompt
 */
export function generateStatusLine(projectPath) {
    const config = loadConfig(projectPath);
    const state = loadState(projectPath);
    if (!config.enabled) {
        return "";
    }
    const currentRatio = calculateRatio(state.session);
    const targetRatio = getEffectiveRatio(config);
    const isHealthy = isRatioHealthy(state.session, targetRatio);
    const status = isHealthy ? "✅" : "⚠️";
    return `[Dojo ${status} ${(currentRatio * 100).toFixed(0)}%/${(targetRatio * 100).toFixed(0)}% human]`;
}
//# sourceMappingURL=system-prompt.js.map