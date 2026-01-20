import { loadConfig } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { getLineCounts } from "../git/history.js";

/**
 * Generate the Dojo system prompt injection
 */
export function generateSystemPrompt(projectPath: string): string {
  const config = loadConfig(projectPath);

  // If Dojo is disabled, return empty
  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);
  const currentMode = getCurrentMode(config);

  const lines: string[] = [
    "<dojo>",
    "# Dojo Mode Active",
    "",
    "You are operating in Dojo mode. This mode helps the human maintain their programming skills",
    "by ensuring they write a minimum percentage of the code themselves.",
    "",
    "## Current Status",
    "",
    `- **Mode:** ${currentMode.number}. ${currentMode.name} (${currentMode.description})`,
    `- **Target ratio:** ${(targetRatio * 100).toFixed(0)}% human-written code`,
    `- **Current ratio:** ${(currentRatio * 100).toFixed(0)}% human (${lineCounts.humanLines} lines) / ${(100 - currentRatio * 100).toFixed(0)}% Claude (${lineCounts.claudeLines} lines)`,
    `- **Status:** ${isHealthy ? "✅ Healthy" : "⚠️ Below target"}`,
    "",
  ];

  // Add rules based on ratio health
  if (!isHealthy) {
    lines.push("## ⚠️ Action Required");
    lines.push("");
    lines.push("The human work ratio is below the target. Before writing more code:");
    lines.push("");
    lines.push("1. **Prefer teaching over doing** - Guide the human through the solution instead of writing it");
    lines.push("2. **Use Socratic method** - Ask questions that help the human discover the solution");
    lines.push("3. **Offer hints, not solutions** - Provide guidance without writing the full code");
    lines.push("");
    lines.push("You MAY still write code if:");
    lines.push("- The human explicitly requests it after being informed of the ratio");
    lines.push("- It's a trivial change (< 5 lines)");
    lines.push("- It's fixing a bug you introduced");
    lines.push("");
  }

  // Commands
  lines.push("## Dojo Commands");
  lines.push("");
  lines.push("The human can use these commands:");
  lines.push("- `/dojo:status` - Show current status");
  lines.push("- `/dojo:stats` - Show detailed metrics");
  lines.push("- `/dojo:mode` - Show or change the current mode");
  lines.push("");

  lines.push("</dojo>");

  return lines.join("\n");
}

/**
 * Generate a compact status line for the prompt
 */
export function generateStatusLine(projectPath: string): string {
  const config = loadConfig(projectPath);

  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);

  const status = isHealthy ? "✅" : "⚠️";
  return `[Dojo ${status} ${(currentRatio * 100).toFixed(0)}%/${(targetRatio * 100).toFixed(0)}% human]`;
}
