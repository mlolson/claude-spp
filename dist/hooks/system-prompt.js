import { loadConfig, isSppInitialized } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { getLineCounts } from "../git/history.js";
/**
 * Calculate how many more commits/lines the human needs to reach the target ratio
 */
function calculateCatchUp(humanValue, claudeValue, targetRatio) {
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
export function generateSystemPrompt(projectPath) {
    if (!isSppInitialized(projectPath)) {
        return "";
    }
    const config = loadConfig(projectPath);
    // If SPP is disabled, return empty
    if (!config.enabled) {
        return "";
    }
    const lineCounts = getLineCounts(projectPath);
    const trackingMode = config.trackingMode ?? "commits";
    const humanValue = trackingMode === "commits" ? lineCounts.humanCommits : lineCounts.humanLines;
    const claudeValue = trackingMode === "commits" ? lineCounts.claudeCommits : lineCounts.claudeLines;
    const unit = trackingMode === "commits" ? "commits" : "lines";
    const currentRatio = calculateRatio(humanValue, claudeValue);
    const targetRatio = getEffectiveRatio(config);
    const isHealthy = isRatioHealthy(humanValue, claudeValue, targetRatio);
    const currentMode = getCurrentMode(config);
    const lines = [
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
        "SPP tracks commits in git history, within a window and/or after a starting commit.",
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
 * Generate a compact status line for the prompt
 */
export function generateStatusLine(projectPath) {
    const config = loadConfig(projectPath);
    if (!config.enabled) {
        return "";
    }
    const lineCounts = getLineCounts(projectPath);
    const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
    const targetRatio = getEffectiveRatio(config);
    const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);
    const status = isHealthy ? "✅" : "⚠️";
    return `[SPP ${status} ${(currentRatio * 100).toFixed(0)}%/${(targetRatio * 100).toFixed(0)}% human]`;
}
//# sourceMappingURL=system-prompt.js.map