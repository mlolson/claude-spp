import { isDojoInitialized } from "../config/loader.js";
import { parseActiveTasks, type Task } from "../tasks/parser.js";
import { type TaskDirectory } from "../tasks/directories.js";

export interface TaskInfo {
  filename: string;
  title: string;
  directory: TaskDirectory;
  difficulty: string;
  category: string;
}

/**
 * Convert Task to TaskInfo for listing
 */
function taskToInfo(task: Task): TaskInfo {
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
export function listTasks(projectPath: string): TaskInfo[] {
  if (!isDojoInitialized(projectPath)) {
    return [];
  }

  return parseActiveTasks(projectPath).map(taskToInfo);
}

/**
 * Format task list for display
 */
export function formatTaskList(tasks: TaskInfo[]): string {
  if (tasks.length === 0) {
    return "No tasks found. Create tasks with `/dojo task create`.";
  }

  const grouped: Record<TaskDirectory, TaskInfo[]> = {
    unassigned: [],
    human: [],
    claude: [],
    completed: [],
  };

  for (const task of tasks) {
    grouped[task.directory].push(task);
  }

  const lines: string[] = ["## Tasks"];

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
