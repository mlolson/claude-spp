import { setCurrentTask, getCurrentTask } from "../state/manager.js";
import { findTask, type Task } from "./parser.js";
import { assignTask } from "./assignment.js";

/**
 * Result of focusing on a task
 */
export interface FocusTaskResult {
  success: boolean;
  task: Task | null;
  message: string;
  autoAssigned: boolean;
}

/**
 * Focus on a task for work
 * If task is unassigned, auto-assigns to Claude
 * If task is completed, returns error
 */
export function focusTask(projectPath: string, filename: string): FocusTaskResult {
  // Find the task
  const task = findTask(projectPath, filename);

  if (!task) {
    return {
      success: false,
      task: null,
      message: `Task "${filename}" not found.`,
      autoAssigned: false,
    };
  }

  // Check if task is completed
  if (task.directory === "completed") {
    return {
      success: false,
      task,
      message: `Task "${task.title}" is already completed.`,
      autoAssigned: false,
    };
  }

  let autoAssigned = false;

  // If task is unassigned, auto-assign to Claude
  if (task.directory === "unassigned") {
    assignTask(projectPath, filename, "claude");
    autoAssigned = true;
  }

  // Set as current task
  setCurrentTask(projectPath, filename);

  // Re-fetch task to get updated directory
  const updatedTask = findTask(projectPath, filename);

  return {
    success: true,
    task: updatedTask,
    message: autoAssigned
      ? `Focused on "${updatedTask?.title}" (auto-assigned to Claude)`
      : `Focused on "${updatedTask?.title}"`,
    autoAssigned,
  };
}

/**
 * Get the currently focused task
 */
export function getCurrentFocusedTask(projectPath: string): Task | null {
  const currentTaskFilename = getCurrentTask(projectPath);

  if (!currentTaskFilename) {
    return null;
  }

  return findTask(projectPath, currentTaskFilename);
}
