import { loadConfig, isStpInitialized } from "./config/loader.js";
import {
  getEffectiveRatio,
  getCurrentMode,
  getStatsWindowCutoff,
  STATS_WINDOW_LABELS,
  type Mode,
  type StatsWindow,
} from "./config/schema.js";
import { getLineCountsWithWindow } from "./git/history.js";

/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(humanLines: number, claudeLines: number): number {
  const total = humanLines + claudeLines;
  if (total === 0) {
    return 1.0; // No work yet, human is at 100%
  }
  return humanLines / total;
}

/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean {
  return calculateRatio(humanLines, claudeLines) >= targetRatio;
}

export interface StatsResult {
  initialized: boolean;
  enabled?: boolean;
  mode?: Mode;
  targetRatio?: number;
  currentRatio?: number;
  ratioHealthy?: boolean;
  statsWindow?: StatsWindow;
  lines?: {
    humanLines: number;
    claudeLines: number;
    humanCommits: number;
    claudeCommits: number;
    fromCache: boolean;
    commitsScanned: number;
  };
  session?: {
    startedAt: string;
  };
}

/**
 * Get current STP statistics
 */
export function getStats(projectPath: string): StatsResult {
  if (!isStpInitialized(projectPath)) {
    return { initialized: false };
  }

  const config = loadConfig(projectPath);
  const statsWindow = config.statsWindow ?? "oneWeek";
  const cutoff = getStatsWindowCutoff(statsWindow);
  const lineCounts = getLineCountsWithWindow(projectPath, { since: cutoff });
  const targetRatio = getEffectiveRatio(config);
  const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
  const mode = getCurrentMode(config);

  return {
    initialized: true,
    enabled: config.enabled,
    mode,
    targetRatio,
    currentRatio,
    ratioHealthy: isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio),
    statsWindow,
    lines: lineCounts,
  };
}

/**
 * Format stats for display
 */
export function formatStats(stats: StatsResult): string {
  if (!stats.initialized) {
    return "STP is not initialized in this project. Run `node dist/cli.js init` to get started.";
  }

  if (!stats.enabled) {
    return "STP is disabled in this project.";
  }

  const windowLabel = stats.statsWindow
    ? STATS_WINDOW_LABELS[stats.statsWindow]
    : "All time";

  const humanLines = String(stats.lines?.humanLines ?? 0);
  const claudeLines = String(stats.lines?.claudeLines ?? 0);
  const humanCommits = String(stats.lines?.humanCommits ?? 0);
  const claudeCommits = String(stats.lines?.claudeCommits ?? 0);
  const maxLines = Math.max(humanLines.length, claudeLines.length);
  const maxCommits = Math.max(humanCommits.length, claudeCommits.length);

  const lines: string[] = [
    "",
    `Current repo stats (${windowLabel}):`,
    "",
    `Target Ratio:  ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% human work`,
    `Current Ratio: ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% human work ${stats.ratioHealthy ? "(on target) 💪🐵" : "(below target) 🙊"}`,
    `Human:  ${humanCommits.padStart(maxCommits)} commits, ${humanLines.padStart(maxLines)} lines added/deleted`,
    `Claude: ${claudeCommits.padStart(maxCommits)} commits, ${claudeLines.padStart(maxLines)} lines added/deleted`,
    "",
  ];

  return lines.join("\n");
}
