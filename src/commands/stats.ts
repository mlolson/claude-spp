import { loadConfig, isDojoInitialized } from "../config/loader.js";
import { getEffectiveRatio, getCurrentMode, type Mode } from "../config/schema.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getLineCounts } from "../git/history.js";

export interface StatsResult {
  initialized: boolean;
  enabled?: boolean;
  mode?: Mode;
  targetRatio?: number;
  currentRatio?: number;
  ratioHealthy?: boolean;
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
 * Get current Dojo statistics
 */
export function getStats(projectPath: string): StatsResult {
  if (!isDojoInitialized(projectPath)) {
    return { initialized: false };
  }

  const config = loadConfig(projectPath);
  const lineCounts = getLineCounts(projectPath);
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
    lines: lineCounts,
  };
}

/**
 * Format stats for display
 */
export function formatStats(stats: StatsResult): string {
  if (!stats.initialized) {
    return "Dojo is not initialized in this project. Run `node dist/cli.js init` to get started.";
  }

  if (!stats.enabled) {
    return "Dojo is disabled in this project.";
  }

  const cacheStatus = stats.lines?.fromCache
    ? "(cached)"
    : stats.lines?.commitsScanned
      ? `(scanned ${stats.lines.commitsScanned} commits)`
      : "";

  const modeDisplay = stats.mode
    ? `${stats.mode.number}. ${stats.mode.name} (${stats.mode.description})`
    : "Unknown";

  const lines: string[] = [
    "## Dojo Stats",
    "",
    `**Mode:** ${modeDisplay}`,
    `**Target Ratio:** ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% human work`,
    `**Current Ratio:** ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% human work ${stats.ratioHealthy ? "(healthy)" : "(below target)"}`,
    "",
    "### Git History",
    `- Human: ${stats.lines?.humanLines ?? 0} lines, ${stats.lines?.humanCommits ?? 0} commits`,
    `- Claude: ${stats.lines?.claudeLines ?? 0} lines, ${stats.lines?.claudeCommits ?? 0} commits`,
    `- ${cacheStatus}`,
    "",
  ];

  return lines.join("\n");
}
