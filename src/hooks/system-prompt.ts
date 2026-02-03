import { loadConfig, isSppInitialized } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";
import { getEffectiveRatio, getCurrentMode, getStatsWindowCutoff, type TrackingMode } from "../config/schema.js";
import { getLineCounts, getLineCountsWithWindow, getRecentCommitsClassified } from "../vcs/index.js";

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
 * Calculate how many Claude commits/lines can be added before hitting the target ratio.
 * Positive = ahead (Claude commits remaining), negative = behind (human commits needed).
 *
 * Formula derivation for "ahead" case:
 *   humanValue / (humanValue + claudeValue + x) = targetRatio
 *   Solving for x: x = humanValue * (1 - targetRatio) / targetRatio - claudeValue
 */
function calculateAheadBehind(humanValue: number, claudeValue: number, targetRatio: number): number {
  const total = humanValue + claudeValue;
  if (total === 0) return 0;

  // Avoid division by zero for 100% human target
  if (targetRatio >= 1) {
    return -claudeValue; // Need to remove all Claude commits
  }

  // How many more Claude commits until we hit exactly the target ratio
  const claudeCommitsRemaining = humanValue * (1 - targetRatio) / targetRatio - claudeValue;
  return Math.floor(claudeCommitsRemaining);
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

  const statsWindow = config.statsWindow ?? "oneWeek";
  const statsWindowCutoff = getStatsWindowCutoff(statsWindow);
  const lineCounts = getLineCountsWithWindow(projectPath, {
    since: statsWindowCutoff,
    afterCommit: config.trackingStartCommit,
  });
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

  // Generate emoji history for recent commits (newest on left)
  const recentCommits = getRecentCommitsClassified(projectPath, {
    since: statsWindowCutoff,
    afterCommit: config.trackingStartCommit,
    limit: 15,
  });
  const emojiHistory = recentCommits
    .map((c) => (c.isClaude ? "🤖" : "🐵"))
    .join(" < ");

  const statusEmoji = aheadBehind >= 0 ? "🟢" : "🔴";
  const aheadBehindText = aheadBehind >= 0
    ? `${aheadBehind} ${unit} ahead of goal`
    : `${Math.abs(aheadBehind)} ${unit} behind goal`;

  return `${statusEmoji} ${username} ${verb} ${aheadBehindText} ${emojiHistory}...`;
}
