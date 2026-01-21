import { isStpInitialized, loadConfig } from "../config/loader.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { isStpInternalFile } from "./file-matcher.js";
import { getLineCounts } from "../git/history.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";

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
 * Checks the work ratio before allowing writes
 */
export function preToolUseHook(input: PreToolUseHookInput): PreToolUseHookOutput {
  const { tool, cwd } = input;

  // Only process write-related tools
  if (!WRITE_TOOLS.includes(tool.name)) {
    return { decision: "allow" };
  }

  // Check if STP is initialized
  if (!isStpInitialized(cwd)) {
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

  // Always allow .stp internal files
  if (isStpInternalFile(filePath, cwd)) {
    return { decision: "allow" };
  }

  // Check the work ratio - block if below target
  const lineCounts = getLineCounts(cwd);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const currentMode = getCurrentMode(config);

  if (!isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio)) {
    // Ratio is below target - block Claude from writing
    const lines: string[] = [
      `Human work ratio is below target: ${(currentRatio * 100).toFixed(0)}% actual vs ${(targetRatio * 100).toFixed(0)}% required`,
      `Mode: ${currentMode.number}. ${currentMode.name} (${currentMode.description})`,
      "",
      "The human needs to write more code before Claude can continue.",
      "",
      "This directive cannot be overriden. Offer to create a task for the user including step by step instructions, and to offer them hints."
    ];

    return {
      decision: "block",
      reason: "ratio_below_target",
      message: lines.join("\n"),
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
