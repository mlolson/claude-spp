import * as fs from "node:fs";
import * as path from "node:path";
import { addHumanLines, addClaudeLines, loadState } from "../state/manager.js";
import { moveTask, getTaskSubdir, listTaskFiles, type TaskDirectory } from "./directories.js";
import { parseTaskFile, type Task } from "./parser.js";

/**
 * Completion input
 */
export interface CompleteTaskInput {
  filename: string;
  completedBy: "human" | "claude";
  linesOfCode?: number;
  notes?: string;
}

/**
 * Completion result
 */
export interface CompleteTaskResult {
  success: boolean;
  task: Task | null;
  message: string;
  updatedRatio?: number;
}

/**
 * Update task file with completion notes
 */
function updateTaskWithCompletionNotes(
  filePath: string,
  completedBy: "human" | "claude",
  notes?: string
): void {
  let content = fs.readFileSync(filePath, "utf-8");
  const timestamp = new Date().toISOString();

  // Update completed by
  content = content.replace(
    /- \*\*Completed by\*\*:.*/,
    `- **Completed by**: ${completedBy}`
  );

  // Update completed at
  content = content.replace(
    /- \*\*Completed at\*\*:.*/,
    `- **Completed at**: ${timestamp}`
  );

  // Update notes if provided
  if (notes) {
    content = content.replace(
      /- \*\*Notes\*\*:.*/,
      `- **Notes**: ${notes}`
    );
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Mark all acceptance criteria as completed
 */
function markCriteriaComplete(filePath: string): void {
  let content = fs.readFileSync(filePath, "utf-8");

  // Replace unchecked boxes with checked boxes
  content = content.replace(/- \[ \]/g, "- [x]");

  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Find which directory a task is in
 */
function findTaskDirectory(
  projectPath: string,
  filename: string
): TaskDirectory | null {
  const directories: TaskDirectory[] = ["human", "claude", "unassigned"];

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
export function completeTask(
  projectPath: string,
  input: CompleteTaskInput
): CompleteTaskResult {
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
    } else {
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
export function reopenTask(
  projectPath: string,
  filename: string
): CompleteTaskResult {
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

  content = content.replace(
    /- \*\*Completed by\*\*:.*/,
    "- **Completed by**:"
  );
  content = content.replace(
    /- \*\*Completed at\*\*:.*/,
    "- **Completed at**:"
  );
  content = content.replace(
    /- \*\*Notes\*\*:.*/,
    "- **Notes**:"
  );

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
export function getCompletedTasks(projectPath: string): Task[] {
  const files = listTaskFiles(projectPath, "completed");
  return files.map((f) => parseTaskFile(projectPath, f, "completed"));
}

/**
 * Get completion statistics
 */
export function getCompletionStats(projectPath: string): {
  total: number;
  byHuman: number;
  byClaude: number;
} {
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
export function formatCompletionResult(result: CompleteTaskResult): string {
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
