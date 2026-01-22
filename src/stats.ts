import { loadConfig, isStpInitialized, saveConfig } from "./config/loader.js";
import {
  getEffectiveRatio,
  getCurrentMode,
  getStatsWindowCutoff,
  STATS_WINDOW_LABELS,
  TRACKING_MODE_LABELS,
  MIN_COMMITS_FOR_TRACKING,
  type Mode,
  type StatsWindow,
  type TrackingMode,
} from "./config/schema.js";
import { getLineCountsWithWindow, getNthCommitHash } from "./git/history.js";

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
  trackingMode?: TrackingMode;
  inGracePeriod?: boolean;
  totalCommits?: number;
  commitsUntilTracking?: number;
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

  let config = loadConfig(projectPath);
  const statsWindow = config.statsWindow ?? "oneWeek";
  const trackingMode = config.trackingMode ?? "commits";
  const targetRatio = getEffectiveRatio(config);
  const mode = getCurrentMode(config);

  // First, get ALL commits (no filter) to check if we're in grace period
  const allTimeCounts = getLineCountsWithWindow(projectPath, { since: null });
  const totalCommits = allTimeCounts.humanCommits + allTimeCounts.claudeCommits;

  // Check if in grace period (no trackingStartCommit set yet)
  let inGracePeriod = !config.trackingStartCommit;
  let commitsUntilTracking = 0;

  if (inGracePeriod) {
    // Check if we've reached enough commits to start tracking
    if (totalCommits >= MIN_COMMITS_FOR_TRACKING) {
      // Grace period is over! Set trackingStartCommit to the Nth commit
      const nthCommit = getNthCommitHash(projectPath, MIN_COMMITS_FOR_TRACKING);
      if (nthCommit) {
        config.trackingStartCommit = nthCommit;
        saveConfig(projectPath, config);
        inGracePeriod = false;
      }
    } else {
      commitsUntilTracking = MIN_COMMITS_FOR_TRACKING - totalCommits;
    }
  }

  // Get counts for ratio calculation
  // Filter by trackingStartCommit (if set) and statsWindow cutoff
  const statsWindowCutoff = getStatsWindowCutoff(statsWindow);
  const lineCounts = getLineCountsWithWindow(projectPath, {
    since: statsWindowCutoff,
    afterCommit: config.trackingStartCommit,
  });

  // Calculate ratio based on tracking mode
  const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
  const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
  const currentRatio = calculateRatio(humanValue, claudeValue);

  // During grace period, ratio is always considered healthy
  const ratioHealthy = inGracePeriod || isRatioHealthy(humanValue, claudeValue, targetRatio);

  return {
    initialized: true,
    enabled: config.enabled,
    mode,
    targetRatio,
    currentRatio,
    ratioHealthy,
    statsWindow,
    trackingMode,
    inGracePeriod,
    totalCommits,
    commitsUntilTracking,
    lines: lineCounts,
  };
}

/**
 * Format stats for display
 */
export function formatStats(stats: StatsResult): string {
  if (!stats.initialized) {
    return "STP is not initialized in this project. Run `stp init` to get started.";
  }

  const windowLabel = stats.statsWindow
    ? STATS_WINDOW_LABELS[stats.statsWindow]
    : "All time";

  const trackingLabel = stats.trackingMode
    ? TRACKING_MODE_LABELS[stats.trackingMode]
    : "Commits";

  const humanLines = String(stats.lines?.humanLines ?? 0);
  const claudeLines = String(stats.lines?.claudeLines ?? 0);
  const humanCommits = String(stats.lines?.humanCommits ?? 0);
  const claudeCommits = String(stats.lines?.claudeCommits ?? 0);
  const maxLines = Math.max(humanLines.length, claudeLines.length);
  const maxCommits = Math.max(humanCommits.length, claudeCommits.length);

  // Build ratio status message
  let ratioStatus: string;
  if (stats.inGracePeriod) {
    ratioStatus = `(grace period - ${stats.commitsUntilTracking} commits until tracking) 🌱`;
  } else if (stats.ratioHealthy) {
    ratioStatus = "(on target) 💪🐵";
  } else {
    ratioStatus = "(below target) 🙊";
  }

  const lines: string[] = [
    "",
    `Current repo stats (${windowLabel}):`,
    "",
    `Tracking:      ${trackingLabel}`,
    `Target Ratio:  ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% human work`,
    `Current Ratio: ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% human work ${ratioStatus}`,
    `Human:  ${humanCommits.padStart(maxCommits)} commits, ${humanLines.padStart(maxLines)} lines added/deleted`,
    `Claude: ${claudeCommits.padStart(maxCommits)} commits, ${claudeLines.padStart(maxLines)} lines added/deleted`,
    "",
  ];

  if (!stats.enabled) {
    lines.unshift("", "⏸️ STP tracking is paused. Run 'stp resume' to unpause.");
  }

  return lines.join("\n");
}
