import { loadConfig, isDojoInitialized } from "../config/loader.js";
import { getEffectiveRatio } from "../config/schema.js";
import { loadState } from "../state/manager.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
import { getTaskCounts } from "../tasks/directories.js";
/**
 * Get current Dojo statistics
 */
export function getStats(projectPath) {
    if (!isDojoInitialized(projectPath)) {
        return { initialized: false };
    }
    const config = loadConfig(projectPath);
    const state = loadState(projectPath);
    const targetRatio = getEffectiveRatio(config);
    const currentRatio = calculateRatio(state.session);
    return {
        initialized: true,
        enabled: config.enabled,
        preset: config.preset,
        targetRatio,
        currentRatio,
        ratioHealthy: isRatioHealthy(state.session, targetRatio),
        session: {
            startedAt: state.session.startedAt,
            humanLines: state.session.humanLines,
            claudeLines: state.session.claudeLines,
        },
        tasks: getTaskCounts(projectPath),
    };
}
/**
 * Format stats for display
 */
export function formatStats(stats) {
    if (!stats.initialized) {
        return "Dojo is not initialized in this project. Run `node dist/cli.js init` to get started.";
    }
    if (!stats.enabled) {
        return "Dojo is disabled in this project.";
    }
    const lines = [
        "## Dojo Stats",
        "",
        `**Preset:** ${stats.preset}`,
        `**Target Ratio:** ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% human work`,
        `**Current Ratio:** ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% human work ${stats.ratioHealthy ? "(healthy)" : "(below target)"}`,
        "",
        "### Session",
        `- Human lines: ${stats.session?.humanLines ?? 0}`,
        `- Claude lines: ${stats.session?.claudeLines ?? 0}`,
        `- Started: ${stats.session?.startedAt ?? "N/A"}`,
        "",
        "### Tasks",
        `- Unassigned: ${stats.tasks?.unassigned ?? 0}`,
        `- Assigned to you: ${stats.tasks?.human ?? 0}`,
        `- Assigned to Claude: ${stats.tasks?.claude ?? 0}`,
        `- Completed: ${stats.tasks?.completed ?? 0}`,
    ];
    return lines.join("\n");
}
//# sourceMappingURL=stats.js.map