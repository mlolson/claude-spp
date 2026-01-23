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
//# sourceMappingURL=schema.js.map