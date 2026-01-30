import { loadConfig, isSppInitialized } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";
import { getEffectiveRatio, getCurrentMode, type TrackingMode } from "../config/schema.js";
import { getLineCounts } from "../vcs/index.js";

/**
 * Calculate how many more commits/lines the human needs to reach the target ratio
 */
function calculateCatchUp(humanValue: number, claudeValue: number, targetRatio: number): number {
  const total = humanValue + claudeValue;
  if (targetRatio >= 1) {
    // 100% human target - can never catch up if Claude has written anything
    return claudeValue;
  }
  return Math.ceil((targetRatio * total - humanValue) / (1 - targetRatio));
}

/**
 * Generate the SPP system prompt injection
 */
export function generateSystemPrompt(projectPath: string): string {

  if (!isSppInitialized(projectPath)) {
    return "";
  }
  const config = loadConfig(projectPath);

  // If SPP is disabled, return empty
  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const trackingMode: TrackingMode = config.trackingMode ?? "commits";
  const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
  const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
  const unit = trackingMode === "commits" ? "commits" : "lines";

  const currentRatio = calculateRatio(humanValue, claudeValue);
  const targetRatio = getEffectiveRatio(config);
  const isHealthy = isRatioHealthy(humanValue, claudeValue, targetRatio);
  const currentMode = getCurrentMode(config);

  const lines: string[] = [
    "<spp>",
    "# Simian Programmer Plugin Active",
    "",
    "You are operating in Simian Programmer mode. This mode helps the human maintain their programming skills",
    "by ensuring they write a minimum percentage of the code themselves.",
    "Help your human friend level up and stay sharp.",
    "",
    "## Current Status",
    "",
    `- **Mode:** ${currentMode.number}. ${currentMode.name} (${currentMode.description})`,
    `- **Target ratio:** ${(targetRatio * 100).toFixed(0)}% human-written code`,
    `- **Current ratio:** ${(currentRatio * 100).toFixed(0)}% human (${humanValue} ${unit}) / ${(100 - currentRatio * 100).toFixed(0)}% Claude (${claudeValue} ${unit})`,
    `- **Status:** ${isHealthy ? "✅ Healthy" : "⚠️ Below target"}`,
    "",
    "A note on SPP tracking:",
    "SPP tracks commits in VCS history (git or mercurial), within a window and/or after a starting commit.",
    "Commits that include 'Co-authored by: Claude...' in the message are counted as Claude commits.",
    "Commits without that phrase are counted as human commits.",
    "Therefore, if asked to commit human authored code, don't include the 'Co-authored by: Claude...' phrase",
    "Also, if you write code, ask the user if they would like to commit it and DO include the 'Co-authored by: Claude' phrase",
    "This way, SPP tracking will work properly",
  ];


  // Add rules based on ratio health
  if (!isHealthy) {
    const needed = calculateCatchUp(humanValue, claudeValue, targetRatio);
    lines.push("## ⚠️ NOTICE");
    lines.push("");
    lines.push("The human coding ratio is below the target.");
    lines.push(`The human needs to write **${needed} more ${unit}** to get back to a healthy ratio.`);
    lines.push("You will be hard blocked from writing code (except .md files).");
    lines.push("Instead of writing code, use the spp-human-task skill to help the human complete the coding task.");
  }

  lines.push("</spp>");

  return lines.join("\n");
}

/**
 * Calculate how many commits/lines ahead or behind the human is from the target
 * Positive = ahead, negative = behind
 */
function calculateAheadBehind(humanValue: number, claudeValue: number, targetRatio: number): number {
  const total = humanValue + claudeValue;
  if (total === 0) return 0;

  // Target human value = targetRatio * total
  const targetHumanValue = targetRatio * total;
  // How many ahead/behind
  return Math.round(humanValue - targetHumanValue);
}

/**
 * Get the current git user's name
 */
function getGitUserName(projectPath: string): string {
  try {
    const { execSync } = require("node:child_process");
    const name = execSync("git config user.name", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
    // Get first name only
    return name.split(" ")[0] || "You";
  } catch {
    return "You";
  }
}

/**
 * Generate a compact status line for the prompt
 * Format: 🟢 Matt is 11 commits ahead of goal
 *         🔴 Matt is 2 commits behind goal
 */
export function generateStatusLine(projectPath: string): string {
  if (!isSppInitialized(projectPath)) {
    return "";
  }

  const config = loadConfig(projectPath);

  if (!config.enabled) {
    return "";
  }

  const lineCounts = getLineCounts(projectPath);
  const trackingMode: TrackingMode = config.trackingMode ?? "commits";
  const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
  const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
  const unit = trackingMode === "commits" ? "commits" : "lines";

  const targetRatio = getEffectiveRatio(config);
  const total = humanValue + claudeValue;

  if (total === 0) {
    return "⚪ SPP: no commits yet";
  }

  const username = getGitUserName(projectPath);
  const verb = username === "You" ? "are" : "is";
  const aheadBehind = calculateAheadBehind(humanValue, claudeValue, targetRatio);

  if (aheadBehind >= 0) {
    return `🟢 ${username} ${verb} ${aheadBehind} ${unit} ahead of goal`;
  } else {
    return `🔴 ${username} ${verb} ${Math.abs(aheadBehind)} ${unit} behind goal`;
  }
}
