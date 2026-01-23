import { loadConfig, isStpInitialized } from "../config/loader.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getLineCounts } from "../git/history.js";
/**
 * Get current STP statistics
 */
export function getStats(projectPath) {
    if (!isStpInitialized(projectPath)) {
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
export function formatStats(stats) {
    if (!stats.initialized) {
        return "STP is not initialized in this project. Run `node dist/cli.js init` to get started.";
    }
    if (!stats.enabled) {
        return "STP is disabled in this project.";
    }
    const modeDisplay = stats.mode
        ? `${stats.mode.name} (${stats.mode.description})`
        : "Unknown";
    const humanLines = String(stats.lines?.humanLines ?? 0);
    const claudeLines = String(stats.lines?.claudeLines ?? 0);
    const humanCommits = String(stats.lines?.humanCommits ?? 0);
    const claudeCommits = String(stats.lines?.claudeCommits ?? 0);
    const maxLines = Math.max(humanLines.length, claudeLines.length);
    const maxCommits = Math.max(humanCommits.length, claudeCommits.length);
    const lines = [
        "Current repo stats:",
        `Mode:          ${modeDisplay}`,
        `Target Ratio:  ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% human work`,
        `Current Ratio: ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% human work ${stats.ratioHealthy ? "(healthy)" : "(below target)"}`,
        "",
        `Human code:  ${humanCommits.padStart(maxCommits)} commits, ${humanLines.padStart(maxLines)} lines added/deleted`,
        `Claude code: ${claudeCommits.padStart(maxCommits)} commits, ${claudeLines.padStart(maxLines)} lines added/deleted`,
        "",
    ];
    return lines.join("\n");
}
//# sourceMappingURL=stats.js.map