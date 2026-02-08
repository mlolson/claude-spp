import { loadConfig, isSppInitialized, saveConfig } from "./config/loader.js";
import {
  getTargetRatio,
  getModeTypeDescription,
  getStatsWindowCutoff,
  STATS_WINDOW_LABELS,
  TRACKING_MODE_LABELS,
  type ModeType,
  type GoalType,
  type StatsWindow,
  type TrackingMode,
  type PairSession,
} from "./config/schema.js";
import { getLineCountsWithWindow, getCommitInfo } from "./vcs/index.js";

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
  modeType?: ModeType;
  goalType?: GoalType;
  targetRatio?: number;
  currentRatio?: number;
  ratioHealthy?: boolean;
  statsWindow?: StatsWindow;
  trackingMode?: TrackingMode;
  weeklyCommitGoal?: number;
  weeklyCommitsCompleted?: number;
  weeklyCommitGoalMet?: boolean;
  pairSession?: PairSession;
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
 * Get current SPP statistics
 */
export function getStats(projectPath: string): StatsResult {
  if (!isSppInitialized(projectPath)) {
    return { initialized: false };
  }

  const config = loadConfig(projectPath);
  const statsWindow = config.statsWindow ?? "oneWeek";
  const trackingMode = config.trackingMode ?? "commits";
  const modeType = config.modeType;
  const goalType = config.goalType;

  // Get counts for ratio calculation
  const statsWindowCutoff = getStatsWindowCutoff(statsWindow);
  const lineCounts = getLineCountsWithWindow(projectPath, {
    since: statsWindowCutoff,
    afterCommit: config.trackingStartCommit,
  });

  const result: StatsResult = {
    initialized: true,
    enabled: config.enabled,
    modeType,
    goalType,
    statsWindow,
    trackingMode,
    lines: lineCounts,
  };

  if (modeType === "weeklyGoal") {
    if (goalType === "commits") {
      // Count human commits in last 7 days
      const weekCutoff = getStatsWindowCutoff("oneWeek");
      const weekCounts = getLineCountsWithWindow(projectPath, {
        since: weekCutoff,
        afterCommit: config.trackingStartCommit,
      });
      result.weeklyCommitGoal = config.weeklyCommitGoal;
      result.weeklyCommitsCompleted = weekCounts.humanCommits;
      result.weeklyCommitGoalMet = weekCounts.humanCommits >= config.weeklyCommitGoal;
    } else {
      // Percentage-based
      const targetRatio = getTargetRatio(config);
      const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
      const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
      const currentRatio = calculateRatio(humanValue, claudeValue);
      const ratioHealthy = isRatioHealthy(humanValue, claudeValue, targetRatio);

      result.targetRatio = targetRatio;
      result.currentRatio = currentRatio;
      result.ratioHealthy = ratioHealthy;
    }
  } else if (modeType === "pairProgramming") {
    result.pairSession = config.pairSession;
  }
  // learningProject: minimal stats

  return result;
}

/**
 * Format stats for display
 */
export function formatStats(stats: StatsResult): string {
  if (!stats.initialized) {
    return "SPP is not initialized in this project. Run `spp init` to get started.";
  }

  const modeType = stats.modeType ?? "weeklyGoal";
  const goalType = stats.goalType ?? "commits";

  // Build status line based on mode type
  let statusLine: string;

  if (modeType === "weeklyGoal" && goalType === "commits") {
    const goal = stats.weeklyCommitGoal ?? 5;
    const completed = stats.weeklyCommitsCompleted ?? 0;
    if (completed >= goal) {
      statusLine = `✅ 🐒 Weekly goal met! ${completed}/${goal} commits this week. Keep up the great work!`;
    } else {
      statusLine = `⚠️ 🙉 Weekly goal: ${completed}/${goal} commits this week. Write ${goal - completed} more to meet your goal!`;
    }
  } else if (modeType === "weeklyGoal" && goalType === "percentage") {
    const trackingMode = stats.trackingMode ?? "commits";
    const target = stats.targetRatio ?? 0;
    const ratio = stats.currentRatio ?? 1;
    const humanValue = trackingMode === "commits"
      ? (stats.lines?.humanCommits ?? 0)
      : (stats.lines?.humanLines ?? 0);
    const claudeValue = trackingMode === "commits"
      ? (stats.lines?.claudeCommits ?? 0)
      : (stats.lines?.claudeLines ?? 0);
    const unit = trackingMode === "commits" ? "commits" : "lines";

    if (claudeValue + humanValue === 0) {
      statusLine = `✅ 🐒 No ${trackingMode} tracked yet. Go commit some code and check again.`;
    } else if (stats.ratioHealthy) {
      statusLine = `✅ 🐒 Human coding on target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Keep up the great work!`;
    } else {
      const total = humanValue + claudeValue;
      if (target >= 1) {
        statusLine = `⚠️ 🙉 Human coding below target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Claude has written ${claudeValue} ${unit}.`;
      } else {
        const needed = Math.ceil((target * total - humanValue) / (1 - target));
        statusLine = `⚠️ 🙉  Human coding below target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Write ${needed} more ${unit} to catch up. You can do it!`;
      }
    }
  } else if (modeType === "pairProgramming") {
    const session = stats.pairSession;
    if (session?.active) {
      const driver = session.currentDriver === "human" ? "Human" : "Claude";
      statusLine = `🤝 Pair Programming: ${driver} is driving. Human turns: ${session.humanTurns}, Claude turns: ${session.claudeTurns}`;
      if (session.task) {
        statusLine += `\n   Task: ${session.task}`;
      }
    } else {
      statusLine = `🤝 Pair Programming mode. No active session. Run \`spp pair start <task>\` to begin.`;
    }
  } else {
    // learningProject
    statusLine = `📚 Learning Project mode (coming soon)`;
  }

  // Format counts with alignment
  const humanLinesStr = String(stats.lines?.humanLines ?? 0);
  const claudeLinesStr = String(stats.lines?.claudeLines ?? 0);
  const humanCommitsStr = String(stats.lines?.humanCommits ?? 0);
  const claudeCommitsStr = String(stats.lines?.claudeCommits ?? 0);
  const maxLines = Math.max(humanLinesStr.length, claudeLinesStr.length);
  const maxCommits = Math.max(humanCommitsStr.length, claudeCommitsStr.length);

  // Build aligned table
  const labelWidth = 10;
  const config = loadConfig(process.cwd());
  const modeValue = getModeTypeDescription(config);

  // Determine tracking window display
  const trackingLabel = TRACKING_MODE_LABELS[stats.trackingMode ?? "commits"];
  const windowLabel = stats.statsWindow ? STATS_WINDOW_LABELS[stats.statsWindow] : "All time";
  let trackingValue = `${trackingLabel} (${windowLabel})`;

  if (config.trackingStartCommit) {
    const commitInfo = getCommitInfo(process.cwd(), config.trackingStartCommit);
    if (commitInfo) {
      const statsWindowCutoff = getStatsWindowCutoff(stats.statsWindow ?? "oneWeek");
      if (!statsWindowCutoff || commitInfo.date >= statsWindowCutoff) {
        const truncatedTitle = commitInfo.title.length > 16
          ? commitInfo.title.substring(0, 16) + "..."
          : commitInfo.title;
        const dateStr = commitInfo.date.toLocaleDateString();
        trackingValue = `${trackingLabel} since: ${commitInfo.shortHash} "${truncatedTitle}" ${dateStr}`;
      }
    }
  }

  const lines: string[] = [
    "",
    statusLine,
    "",
    `  ${"Mode".padEnd(labelWidth)} ${modeValue}`,
    `  ${"Tracking".padEnd(labelWidth)} ${trackingValue}`,
    "",
    `  ${"Human".padEnd(labelWidth)} ${humanCommitsStr.padStart(maxCommits)} commits   ${humanLinesStr.padStart(maxLines)} lines`,
    `  ${"Claude".padEnd(labelWidth)} ${claudeCommitsStr.padStart(maxCommits)} commits   ${claudeLinesStr.padStart(maxLines)} lines`,
    "",
  ];

  if (!stats.enabled) {
    const loadedConfig = loadConfig(process.cwd());
    let pauseMsg = "SPP is disabled";
    if (loadedConfig.pausedUntil) {
      const pausedUntilDate = new Date(loadedConfig.pausedUntil);
      pauseMsg = `⏸️  SPP enforcement is paused until ${pausedUntilDate.toLocaleString()}. Claude may write code freely. Run 'spp resume' to unpause.`;
    }
    lines.splice(1, 0, pauseMsg, "");
  }

  return lines.join("\n");
}
