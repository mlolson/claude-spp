import { loadConfig } from "../config/loader.js";
import { getEffectiveRatio } from "../config/schema.js";
import { loadState } from "../state/manager.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { moveTask, listTaskFiles } from "./directories.js";
import { parseTaskFile, parseTasksInDirectory } from "./parser.js";
/**
 * Check if Claude is allowed to take work based on current ratio
 */
export function canClaudeTakeWork(projectPath) {
    const config = loadConfig(projectPath);
    const state = loadState(projectPath);
    const targetRatio = getEffectiveRatio(config);
    const currentRatio = calculateRatio(state.session);
    const healthy = isRatioHealthy(state.session, targetRatio);
    if (!config.enabled) {
        return {
            allowed: true,
            currentRatio,
            targetRatio,
            message: "Dojo is disabled, Claude can take any work.",
        };
    }
    if (healthy) {
        return {
            allowed: true,
            currentRatio,
            targetRatio,
            message: `Ratio is healthy (${(currentRatio * 100).toFixed(0)}% >= ${(targetRatio * 100).toFixed(0)}%), Claude can take work.`,
        };
    }
    return {
        allowed: false,
        currentRatio,
        targetRatio,
        message: `Ratio is below target (${(currentRatio * 100).toFixed(0)}% < ${(targetRatio * 100).toFixed(0)}%). Human should take the next task.`,
    };
}
/**
 * Suggest who should take the next task
 */
export function suggestAssignee(projectPath) {
    const result = canClaudeTakeWork(projectPath);
    return result.allowed ? "claude" : "human";
}
/**
 * Assign a task to human or claude
 * Returns the updated task or null if not found
 */
export function assignTask(projectPath, filename, assignTo) {
    // Find the task
    const sourceDirectories = ["unassigned", assignTo === "human" ? "claude" : "human"];
    for (const dir of sourceDirectories) {
        const files = listTaskFiles(projectPath, dir);
        if (files.includes(filename)) {
            moveTask(projectPath, filename, dir, assignTo);
            return parseTaskFile(projectPath, filename, assignTo);
        }
    }
    // Check if already assigned to target
    const targetFiles = listTaskFiles(projectPath, assignTo);
    if (targetFiles.includes(filename)) {
        return parseTaskFile(projectPath, filename, assignTo);
    }
    return null;
}
/**
 * Assign a task with automatic assignee selection based on ratio
 */
export function autoAssignTask(projectPath, filename) {
    const assignee = suggestAssignee(projectPath);
    const checkResult = canClaudeTakeWork(projectPath);
    const task = assignTask(projectPath, filename, assignee);
    return {
        task,
        assignedTo: assignee,
        reason: checkResult.message,
    };
}
/**
 * Get tasks assigned to human
 */
export function getHumanTasks(projectPath) {
    return parseTasksInDirectory(projectPath, "human");
}
/**
 * Get tasks assigned to Claude
 */
export function getClaudeTasks(projectPath) {
    return parseTasksInDirectory(projectPath, "claude");
}
/**
 * Get unassigned tasks
 */
export function getUnassignedTasks(projectPath) {
    return parseTasksInDirectory(projectPath, "unassigned");
}
/**
 * Pick a task for the human based on skills or difficulty
 */
export function pickTaskForHuman(projectPath, preferredSkills, preferredDifficulty) {
    const unassigned = getUnassignedTasks(projectPath);
    if (unassigned.length === 0) {
        return null;
    }
    // Score tasks based on preferences
    const scored = unassigned.map((task) => {
        let score = 0;
        // Prefer matching skills
        if (preferredSkills && preferredSkills.length > 0) {
            const matchingSkills = task.metadata.skills.filter((s) => preferredSkills.some((ps) => s.toLowerCase().includes(ps.toLowerCase())));
            score += matchingSkills.length * 10;
        }
        // Prefer matching difficulty
        if (preferredDifficulty && task.metadata.difficulty === preferredDifficulty) {
            score += 5;
        }
        return { task, score };
    });
    // Sort by score descending, then by filename for consistency
    scored.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return a.task.filename.localeCompare(b.task.filename);
    });
    const selected = scored[0].task;
    // Assign the task
    assignTask(projectPath, selected.filename, "human");
    return parseTaskFile(projectPath, selected.filename, "human");
}
/**
 * Reassign a task from one assignee to another
 */
export function reassignTask(projectPath, filename, from, to) {
    const files = listTaskFiles(projectPath, from);
    if (!files.includes(filename)) {
        return null;
    }
    moveTask(projectPath, filename, from, to);
    return parseTaskFile(projectPath, filename, to);
}
/**
 * Format assignment result for display
 */
export function formatAssignmentResult(task, assignedTo, reason) {
    if (!task) {
        return "Task not found.";
    }
    const lines = [
        `## Task Assigned to ${assignedTo === "human" ? "You" : "Claude"}`,
        "",
        reason,
        "",
        `**Task:** ${task.title}`,
        `**File:** ${task.filename}`,
        `**Difficulty:** ${task.metadata.difficulty}`,
        `**Category:** ${task.metadata.category}`,
        "",
        "### Description",
        task.description,
    ];
    if (assignedTo === "human" && task.hints.length > 0) {
        lines.push("", "*Hints are available if you get stuck.*");
    }
    return lines.join("\n");
}
//# sourceMappingURL=assignment.js.map