import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { parseTasksInDirectory } from "../tasks/parser.js";
import { isDojoInternalFile, findTasksForFile } from "./file-matcher.js";

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
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks if the file being written to is part of an active task
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

  // Skip .dojo internal files
  if (isDojoInternalFile(filePath, cwd)) {
    return { decision: "allow" };
  }

  // Load active tasks (only assigned tasks - human and claude directories)
  const humanTasks = parseTasksInDirectory(cwd, "human");
  const claudeTasks = parseTasksInDirectory(cwd, "claude");
  const activeTasks = [...humanTasks, ...claudeTasks];

  // If no active tasks exist, allow (user hasn't set up task tracking)
  if (activeTasks.length === 0) {
    return { decision: "allow" };
  }

  // Check if file matches any active task
  const matchingTasks = findTasksForFile(filePath, activeTasks, cwd);

  if (matchingTasks.length > 0) {
    // File is part of an active task - allow
    return { decision: "allow" };
  }

  // File not covered by any active task - ask user
  const relativePath = filePath.startsWith(cwd)
    ? filePath.slice(cwd.length + 1)
    : filePath;

  return {
    decision: "ask",
    reason: "file_not_in_task",
    message: `This file is not part of any active Dojo task:\n  ${relativePath}\n\nWould you like to create a task for this work?`,
  };
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
