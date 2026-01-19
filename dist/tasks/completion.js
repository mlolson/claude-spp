import * as fs from "node:fs";
import * as path from "node:path";
import { addHumanLines, addClaudeLines, loadState } from "../state/manager.js";
import { moveTask, getTaskSubdir, listTaskFiles } from "./directories.js";
import { parseTaskFile } from "./parser.js";
/**
 * Update task file with completion notes
 */
function updateTaskWithCompletionNotes(filePath, completedBy, notes) {
    let content = fs.readFileSync(filePath, "utf-8");
    const timestamp = new Date().toISOString();
    // Update completed by
    content = content.replace(/- \*\*Completed by\*\*:.*/, `- **Completed by**: ${completedBy}`);
    // Update completed at
    content = content.replace(/- \*\*Completed at\*\*:.*/, `- **Completed at**: ${timestamp}`);
    // Update notes if provided
    if (notes) {
        content = content.replace(/- \*\*Notes\*\*:.*/, `- **Notes**: ${notes}`);
    }
    fs.writeFileSync(filePath, content, "utf-8");
}
/**
 * Mark all acceptance criteria as completed
 */
function markCriteriaComplete(filePath) {
    let content = fs.readFileSync(filePath, "utf-8");
    // Replace unchecked boxes with checked boxes
    content = content.replace(/- \[ \]/g, "- [x]");
    fs.writeFileSync(filePath, content, "utf-8");
}
/**
 * Find which directory a task is in
 */
function findTaskDirectory(projectPath, filename) {
    const directories = ["human", "claude", "unassigned"];
    for (const dir of directories) {
        const files = listTaskFiles(projectPath, dir);
        if (files.includes(filename)) {
            return dir;
        }
    }
    return null;
}
/**
 * Complete a task
 */
export function completeTask(projectPath, input) {
    const { filename, completedBy, linesOfCode, notes } = input;
    // Find the task
    const sourceDir = findTaskDirectory(projectPath, filename);
    if (!sourceDir) {
        // Check if already completed
        const completedFiles = listTaskFiles(projectPath, "completed");
        if (completedFiles.includes(filename)) {
            return {
                success: false,
                task: parseTaskFile(projectPath, filename, "completed"),
                message: `Task "${filename}" is already completed.`,
            };
        }
        return {
            success: false,
            task: null,
            message: `Task "${filename}" not found.`,
        };
    }
    // Get the file path before moving
    const sourceFilePath = path.join(getTaskSubdir(projectPath, sourceDir), filename);
    // Update completion notes
    updateTaskWithCompletionNotes(sourceFilePath, completedBy, notes);
    // Mark criteria as complete
    markCriteriaComplete(sourceFilePath);
    // Move to completed
    moveTask(projectPath, filename, sourceDir, "completed");
    // Update stats if lines of code provided
    if (linesOfCode && linesOfCode > 0) {
        if (completedBy === "human") {
            addHumanLines(projectPath, linesOfCode);
        }
        else {
            addClaudeLines(projectPath, linesOfCode);
        }
    }
    // Get the completed task
    const task = parseTaskFile(projectPath, filename, "completed");
    // Get updated state for ratio
    const state = loadState(projectPath);
    const total = state.session.humanLines + state.session.claudeLines;
    const ratio = total > 0 ? state.session.humanLines / total : 1;
    return {
        success: true,
        task,
        message: `Task "${task.title}" completed by ${completedBy}.`,
        updatedRatio: ratio,
    };
}
/**
 * Reopen a completed task (move back to unassigned)
 */
export function reopenTask(projectPath, filename) {
    const completedFiles = listTaskFiles(projectPath, "completed");
    if (!completedFiles.includes(filename)) {
        return {
            success: false,
            task: null,
            message: `Task "${filename}" not found in completed tasks.`,
        };
    }
    // Clear completion notes
    const filePath = path.join(getTaskSubdir(projectPath, "completed"), filename);
    let content = fs.readFileSync(filePath, "utf-8");
    content = content.replace(/- \*\*Completed by\*\*:.*/, "- **Completed by**:");
    content = content.replace(/- \*\*Completed at\*\*:.*/, "- **Completed at**:");
    content = content.replace(/- \*\*Notes\*\*:.*/, "- **Notes**:");
    // Uncheck acceptance criteria
    content = content.replace(/- \[x\]/gi, "- [ ]");
    fs.writeFileSync(filePath, content, "utf-8");
    // Move back to unassigned
    moveTask(projectPath, filename, "completed", "unassigned");
    const task = parseTaskFile(projectPath, filename, "unassigned");
    return {
        success: true,
        task,
        message: `Task "${task.title}" reopened and moved to unassigned.`,
    };
}
/**
 * Get completed tasks
 */
export function getCompletedTasks(projectPath) {
    const files = listTaskFiles(projectPath, "completed");
    return files.map((f) => parseTaskFile(projectPath, f, "completed"));
}
/**
 * Get completion statistics
 */
export function getCompletionStats(projectPath) {
    const completed = getCompletedTasks(projectPath);
    return {
        total: completed.length,
        byHuman: completed.filter((t) => t.completionNotes.completedBy === "human").length,
        byClaude: completed.filter((t) => t.completionNotes.completedBy === "claude").length,
    };
}
/**
 * Format completion result for display
 */
export function formatCompletionResult(result) {
    if (!result.success) {
        return result.message;
    }
    const lines = [
        `## Task Completed`,
        "",
        result.message,
        "",
    ];
    if (result.task) {
        lines.push(`**Task:** ${result.task.title}`);
        lines.push(`**Completed by:** ${result.task.completionNotes.completedBy}`);
    }
    if (result.updatedRatio !== undefined) {
        lines.push("");
        lines.push(`**Current ratio:** ${(result.updatedRatio * 100).toFixed(0)}% human work`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=completion.js.map