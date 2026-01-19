import { isDojoInitialized } from "../config/loader.js";
import { parseActiveTasks } from "../tasks/parser.js";
/**
 * Convert Task to TaskInfo for listing
 */
function taskToInfo(task) {
    return {
        filename: task.filename,
        title: task.title,
        directory: task.directory,
        difficulty: task.metadata.difficulty,
        category: task.metadata.category,
    };
}
/**
 * List all active tasks (not completed)
 */
export function listTasks(projectPath) {
    if (!isDojoInitialized(projectPath)) {
        return [];
    }
    return parseActiveTasks(projectPath).map(taskToInfo);
}
/**
 * Format task list for display
 */
export function formatTaskList(tasks) {
    if (tasks.length === 0) {
        return "No tasks found. Create tasks with `/dojo task create`.";
    }
    const grouped = {
        unassigned: [],
        human: [],
        claude: [],
        completed: [],
    };
    for (const task of tasks) {
        grouped[task.directory].push(task);
    }
    const lines = ["## Tasks"];
    if (grouped.human.length > 0) {
        lines.push("", "### Assigned to You");
        for (const task of grouped.human) {
            lines.push(`- [ ] **${task.filename}**: ${task.title} (${task.difficulty})`);
        }
    }
    if (grouped.claude.length > 0) {
        lines.push("", "### Assigned to Claude");
        for (const task of grouped.claude) {
            lines.push(`- [ ] **${task.filename}**: ${task.title} (${task.difficulty})`);
        }
    }
    if (grouped.unassigned.length > 0) {
        lines.push("", "### Backlog (Unassigned)");
        for (const task of grouped.unassigned) {
            lines.push(`- **${task.filename}**: ${task.title} (${task.difficulty})`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=task.js.map