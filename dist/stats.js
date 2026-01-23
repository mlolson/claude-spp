import { loadConfig, isStpInitialized } from "./config/loader.js";
import { getEffectiveRatio, getCurrentMode, getStatsWindowCutoff, STATS_WINDOW_LABELS, TRACKING_MODE_LABELS, } from "./config/schema.js";
import { getLineCountsWithWindow, getCommitInfo } from "./git/history.js";
/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(humanLines, claudeLines) {
    const total = humanLines + claudeLines;
    if (total === 0) {
        return 1.0; // No work yet, human is at 100%
    }
    return humanLines / total;
}
/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(humanLines, claudeLines, targetRatio) {
    return calculateRatio(humanLines, claudeLines) >= targetRatio;
}
/**
 * Get current STP statistics
 */
export function getStats(projectPath) {
    if (!isStpInitialized(projectPath)) {
        return { initialized: false };
    }
    const config = loadConfig(projectPath);
    const statsWindow = config.statsWindow ?? "oneWeek";
    const trackingMode = config.trackingMode ?? "commits";
    const targetRatio = getEffectiveRatio(config);
    const mode = getCurrentMode(config);
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
    const ratioHealthy = isRatioHealthy(humanValue, claudeValue, targetRatio);
    return {
        initialized: true,
        enabled: config.enabled,
        mode,
        targetRatio,
        currentRatio,
        ratioHealthy,
        statsWindow,
        trackingMode,
        lines: lineCounts,
    };
}
/**
 * Format stats for display
 */
export function formatStats(stats) {
    if (!stats.initialized) {
        return "STP is not initialized in this project. Run `stp init` to get started.";
    }
    const trackingMode = stats.trackingMode ?? "commits";
    const target = stats.targetRatio ?? 0;
    const ratio = stats.currentRatio ?? 1;
    const windowLabel = stats.statsWindow ? STATS_WINDOW_LABELS[stats.statsWindow] : "All time";
    const trackingLabel = TRACKING_MODE_LABELS[trackingMode];
    // Get values based on tracking mode for catch-up calculation
    const humanValue = trackingMode === "commits"
        ? (stats.lines?.humanCommits ?? 0)
        : (stats.lines?.humanLines ?? 0);
    const claudeValue = trackingMode === "commits"
        ? (stats.lines?.claudeCommits ?? 0)
        : (stats.lines?.claudeLines ?? 0);
    const unit = trackingMode === "commits" ? "commits" : "lines";
    // Build status line
    let statusLine;
    if (claudeValue + humanValue === 0) {
        statusLine = `✅ 🐒 No ${trackingMode} tracked yet. Go commit some code and check again.`;
    }
    else if (stats.ratioHealthy) {
        statusLine = `✅ 🐒 Human coding on target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Keep up the great work!`;
    }
    else {
        // Calculate how many more commits/lines needed to catch up
        const total = humanValue + claudeValue;
        if (target >= 1) {
            statusLine = `⚠️ 🙉 Human coding below target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Claude has written ${claudeValue} ${unit}.`;
        }
        else {
            const needed = Math.ceil((target * total - humanValue) / (1 - target));
            statusLine = `⚠️ 🙉  Human coding below target. Current: ${(ratio * 100).toFixed(0)}% Target: ${(target * 100).toFixed(0)}%. Write ${needed} more ${unit} to catch up. You can do it!`;
        }
    }
    // Format counts with alignment
    const humanLinesStr = String(stats.lines?.humanLines ?? 0);
    const claudeLinesStr = String(stats.lines?.claudeLines ?? 0);
    const humanCommitsStr = String(stats.lines?.humanCommits ?? 0);
    const claudeCommitsStr = String(stats.lines?.claudeCommits ?? 0);
    const maxLines = Math.max(humanLinesStr.length, claudeLinesStr.length);
    const maxCommits = Math.max(humanCommitsStr.length, claudeCommitsStr.length);
    // Build aligned table (no borders)
    const labelWidth = 10;
    const modeValue = `${stats.mode?.name} (${stats.mode?.description})`;
    // Determine tracking window display
    // If trackingStartCommit is set and within the stats window, show commit info instead
    const config = loadConfig(process.cwd());
    let trackingValue = `${trackingLabel} (${windowLabel})`;
    if (config.trackingStartCommit) {
        const commitInfo = getCommitInfo(process.cwd(), config.trackingStartCommit);
        if (commitInfo) {
            const statsWindowCutoff = getStatsWindowCutoff(stats.statsWindow ?? "oneWeek");
            // If no cutoff (allTime) or commit is within the window, show commit info
            if (!statsWindowCutoff || commitInfo.date >= statsWindowCutoff) {
                const truncatedTitle = commitInfo.title.length > 16
                    ? commitInfo.title.substring(0, 16) + "..."
                    : commitInfo.title;
                const dateStr = commitInfo.date.toLocaleDateString();
                trackingValue = `${trackingLabel} since: ${commitInfo.shortHash} "${truncatedTitle}" ${dateStr}`;
            }
        }
    }
    const lines = [
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
        const config = loadConfig(process.cwd());
        let pauseMsg = "STP is disabled";
        if (config.pausedUntil) {
            const pausedUntilDate = new Date(config.pausedUntil);
            pauseMsg = `⏸️  STP enforcement is paused until ${pausedUntilDate.toLocaleString()}. Claude may write code freely. Run 'stp resume' to unpause.`;
        }
        lines.splice(1, 0, pauseMsg, "");
    }
    return lines.join("\n");
}
//# sourceMappingURL=stats.js.map