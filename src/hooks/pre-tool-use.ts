import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { findTask, parseTasksInDirectory } from "../tasks/parser.js";
import { isDojoInternalFile } from "./file-matcher.js";
import { getCurrentTask } from "../state/manager.js";

/**
 * Tool information from Claude Code
 */
export interface ToolInput {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Hook input from Claude Code
 */
export interface PreToolUseHookInput {
  tool: ToolInput;
  sessionId?: string;
  cwd: string;
}

/**
 * Hook output to Claude Code
 */
export interface PreToolUseHookOutput {
  decision: "allow" | "block" | "ask";
  reason?: string;
  message?: string;
}

/**
 * Tools that write to files
 */
const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];

/**
 * Extract file path from tool input
 */
function extractFilePath(tool: ToolInput): string | null {
  if (tool.name === "Write" || tool.name === "Edit") {
    const filePath = tool.input.file_path;
    return typeof filePath === "string" ? filePath : null;
  }

  if (tool.name === "NotebookEdit") {
    const notebookPath = tool.input.notebook_path;
    return typeof notebookPath === "string" ? notebookPath : null;
  }

  return null;
}

/**
 * Format a list of tasks for display in the block message
 */
function formatAvailableTasks(projectPath: string): string {
  const humanTasks = parseTasksInDirectory(projectPath, "human");
  const claudeTasks = parseTasksInDirectory(projectPath, "claude");
  const unassignedTasks = parseTasksInDirectory(projectPath, "unassigned");

  const lines: string[] = [];

  if (claudeTasks.length > 0) {
    lines.push("Claude's tasks:");
    for (const task of claudeTasks) {
      lines.push(`  - ${task.filename}: ${task.title}`);
    }
  }

  if (humanTasks.length > 0) {
    lines.push("Human's tasks:");
    for (const task of humanTasks) {
      lines.push(`  - ${task.filename}: ${task.title}`);
    }
  }

  if (unassignedTasks.length > 0) {
    lines.push("Unassigned tasks:");
    for (const task of unassignedTasks.slice(0, 3)) {
      lines.push(`  - ${task.filename}: ${task.title}`);
    }
    if (unassignedTasks.length > 3) {
      lines.push(`  ... and ${unassignedTasks.length - 3} more`);
    }
  }

  if (lines.length === 0) {
    lines.push("No tasks found. Create one: node dist/cli.js create \"Task title\"");
  }

  return lines.join("\n");
}

/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks if there is a current focused task before allowing writes
 */
export function preToolUseHook(input: PreToolUseHookInput): PreToolUseHookOutput {
  const { tool, cwd } = input;

  // Only process write-related tools
  if (!WRITE_TOOLS.includes(tool.name)) {
    return { decision: "allow" };
  }

  // Check if Dojo is initialized
  if (!isDojoInitialized(cwd)) {
    return { decision: "allow" };
  }

  // Load config
  const config = loadConfig(cwd);
  if (!config.enabled) {
    return { decision: "allow" };
  }

  // Extract the file path being written to
  const filePath = extractFilePath(tool);
  if (!filePath) {
    return { decision: "allow" };
  }

  // Always allow .dojo internal files
  if (isDojoInternalFile(filePath, cwd)) {
    return { decision: "allow" };
  }

  // Check for current task
  const currentTaskFilename = getCurrentTask(cwd);

  if (!currentTaskFilename) {
    // Block with helpful message listing available tasks
    const availableTasks = formatAvailableTasks(cwd);
    return {
      decision: "block",
      reason: "no_current_task",
      message: `No task is currently focused.\n\nTo write code, first focus on a task:\n  node dist/cli.js focus <filename>\n\n${availableTasks}`,
    };
  }

  // Verify current task still exists and is not completed
  const currentTask = findTask(cwd, currentTaskFilename);
  if (!currentTask) {
    return {
      decision: "block",
      reason: "task_not_found",
      message: `Focused task "${currentTaskFilename}" not found. Clear focus and try again:\n  node dist/cli.js unfocus`,
    };
  }

  if (currentTask.directory === "completed") {
    return {
      decision: "block",
      reason: "task_completed",
      message: `Focused task "${currentTask.title}" is already completed. Focus on a new task:\n  node dist/cli.js unfocus\n  node dist/cli.js focus <filename>`,
    };
  }

  return { decision: "allow" };
}

/**
 * CLI entry point for pre-tool-use hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPreToolUseHook(): Promise<void> {
  // Read input from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputJson = Buffer.concat(chunks).toString("utf-8");

  let input: PreToolUseHookInput;
  try {
    input = JSON.parse(inputJson);
  } catch {
    // If no input or invalid JSON, allow by default
    console.log(JSON.stringify({ decision: "allow" }));
    return;
  }

  // Run hook
  const output = preToolUseHook(input);

  // Write output to stdout
  console.log(JSON.stringify(output));
}
