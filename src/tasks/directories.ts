import * as fs from "node:fs";
import * as path from "node:path";

const DOJO_DIR = ".dojo";
const TASKS_DIR = "tasks";

/**
 * Task assignment directories
 */
export const TASK_DIRS = {
  unassigned: "unassigned",
  human: "human",
  claude: "claude",
  completed: "completed",
} as const;

export type TaskDirectory = keyof typeof TASK_DIRS;

/**
 * Get the path to the tasks directory
 */
export function getTasksDir(projectPath: string): string {
  return path.join(projectPath, DOJO_DIR, TASKS_DIR);
}

/**
 * Get the path to a specific task subdirectory
 */
export function getTaskSubdir(projectPath: string, dir: TaskDirectory): string {
  return path.join(getTasksDir(projectPath), TASK_DIRS[dir]);
}

/**
 * Check if task directories are initialized
 */
export function areTaskDirsInitialized(projectPath: string): boolean {
  const tasksDir = getTasksDir(projectPath);
  if (!fs.existsSync(tasksDir)) {
    return false;
  }

  for (const dir of Object.values(TASK_DIRS)) {
    if (!fs.existsSync(path.join(tasksDir, dir))) {
      return false;
    }
  }

  return true;
}

/**
 * Initialize task directories
 */
export function initializeTaskDirs(projectPath: string): void {
  const tasksDir = getTasksDir(projectPath);

  // Create each task subdirectory
  for (const dir of Object.values(TASK_DIRS)) {
    const dirPath = path.join(tasksDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

/**
 * List task files in a directory
 */
export function listTaskFiles(projectPath: string, dir: TaskDirectory): string[] {
  const dirPath = getTaskSubdir(projectPath, dir);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath)
    .filter(file => file.endsWith(".md"))
    .sort();
}

/**
 * Move a task file from one directory to another
 */
export function moveTask(
  projectPath: string,
  filename: string,
  from: TaskDirectory,
  to: TaskDirectory
): void {
  const fromPath = path.join(getTaskSubdir(projectPath, from), filename);
  const toPath = path.join(getTaskSubdir(projectPath, to), filename);

  if (!fs.existsSync(fromPath)) {
    throw new Error(`Task file not found: ${fromPath}`);
  }

  // Ensure destination directory exists
  const toDir = getTaskSubdir(projectPath, to);
  if (!fs.existsSync(toDir)) {
    fs.mkdirSync(toDir, { recursive: true });
  }

  fs.renameSync(fromPath, toPath);
}

/**
 * Get counts of tasks in each directory
 */
export function getTaskCounts(projectPath: string): Record<TaskDirectory, number> {
  return {
    unassigned: listTaskFiles(projectPath, "unassigned").length,
    human: listTaskFiles(projectPath, "human").length,
    claude: listTaskFiles(projectPath, "claude").length,
    completed: listTaskFiles(projectPath, "completed").length,
  };
}
