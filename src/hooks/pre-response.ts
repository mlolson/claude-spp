import { isStpInitialized, loadConfig } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getEffectiveRatio } from "../config/schema.js";
import { generateSystemPrompt } from "./system-prompt.js";
import { getLineCounts } from "../git/history.js";

/**
 * Hook input from Claude Code
 */
export interface PreResponseHookInput {
  // The user's message
  userMessage: string;
  // Session ID
  sessionId?: string;
  // Working directory
  cwd: string;
}

/**
 * Hook output to Claude Code
 */
export interface PreResponseHookOutput {
  // Additional context to inject into system prompt
  systemPromptAddition?: string;
  // Whether to proceed (false would block, but we don't block)
  proceed: boolean;
  // Optional message to show user
  userMessage?: string;
}

/**
 * Pre-response hook
 * Called before Claude generates a response
 * Injects STP context into the system prompt
 */
export function preResponseHook(input: PreResponseHookInput): PreResponseHookOutput {
  const { cwd } = input;

  // Check if STP is initialized in this project
  if (!isStpInitialized(cwd)) {
    return { proceed: true };
  }

  // Load config
  const config = loadConfig(cwd);
  if (!config.enabled) {
    return { proceed: true };
  }

  // Generate and inject system prompt
  const systemPromptAddition = generateSystemPrompt(cwd);

  // Check ratio status for any warnings
  const lineCounts = getLineCounts(cwd);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);

  // If ratio is unhealthy, we might want to show a warning
  let userMessage: string | undefined;
  if (!isHealthy && lineCounts.claudeLines > 0) {
    userMessage = `⚠️ STP: Human work ratio (${(currentRatio * 100).toFixed(0)}%) is below target (${(targetRatio * 100).toFixed(0)}%). Consider having the human write more code.`;
  }

  return {
    systemPromptAddition,
    proceed: true,
    userMessage,
  };
}

/**
 * CLI entry point for pre-response hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPreResponseHook(): Promise<void> {
  // Read input from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const inputJson = Buffer.concat(chunks).toString("utf-8");

  let input: PreResponseHookInput;
  try {
    input = JSON.parse(inputJson);
  } catch {
    // If no input or invalid JSON, use cwd
    input = {
      userMessage: "",
      cwd: process.cwd(),
    };
  }

  // Run hook
  const output = preResponseHook(input);

  // Write output to stdout
  console.log(JSON.stringify(output));
}
