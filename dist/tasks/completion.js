import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { addHumanLines, addClaudeLines, loadState } from "../state/manager.js";
import { moveTask, getTaskSubdir, listTaskFiles } from "./directories.js";
import { parseTaskFile } from "./parser.js";
/**
 * Check if we're in a git repository
 */
function isGitRepo(projectPath) {
    try {
        execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Check if there are uncommitted changes
 */
function hasUncommittedChanges(projectPath) {
    try {
        const status = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8" });
        return status.trim().length > 0;
    }
    catch {
        return false;
    }
}
/**
 * Stage all changes and commit with message
 * Returns the commit hash or null if failed
 */
function commitChanges(projectPath, taskTitle, completedBy) {
    try {
        // Stage all changes
        execSync("git add -A", { cwd: projectPath, stdio: "ignore" });
        // Build commit message
        let message = `Complete: ${taskTitle}`;
        if (completedBy === "claude") {
            message += "\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
        }
        // Commit
        execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: projectPath, stdio: "ignore" });
        // Get commit hash
        const hash = execSync("git rev-parse HEAD", { cwd: projectPath, encoding: "utf-8" }).trim();
        return hash;
    }
    catch {
        return null;
    }
}
/**
 * Get the short commit hash
 */
function getShortHash(hash) {
    return hash.substring(0, 7);
}
/**
 * Update task file with completion notes
 */
function updateTaskWithCompletionNotes(filePath, completedBy, notes, commitHash) {
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
    // Add commit hash if provided
    if (commitHash) {
        // Check if Commit field exists
        if (content.includes("- **Commit**:")) {
            content = content.replace(/- \*\*Commit\*\*:.*/, `- **Commit**: ${getShortHash(commitHash)}`);
        }
        else {
            // Add after Notes
            content = content.replace(/(- \*\*Notes\*\*:.*)/, `$1\n- **Commit**: ${getShortHash(commitHash)}`);
        }
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
    // Parse task to get title for commit message
    const taskBeforeComplete = parseTaskFile(projectPath, filename, sourceDir);
    // Auto-commit if there are uncommitted changes
    let commitHash;
    if (isGitRepo(projectPath) && hasUncommittedChanges(projectPath)) {
        const hash = commitChanges(projectPath, taskBeforeComplete.title, completedBy);
        if (hash) {
            commitHash = hash;
        }
    }
    // Update completion notes (including commit hash if we made a commit)
    updateTaskWithCompletionNotes(sourceFilePath, completedBy, notes, commitHash);
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
        message: commitHash
            ? `Task "${task.title}" completed by ${completedBy}. Committed: ${getShortHash(commitHash)}`
            : `Task "${task.title}" completed by ${completedBy}.`,
        updatedRatio: ratio,
        commitHash,
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