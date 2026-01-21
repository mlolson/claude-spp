/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export declare function calculateRatio(humanLines: number, claudeLines: number): number;
/**
 * Check if the human work ratio meets the target
 */
export declare function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean;
//# sourceMappingURL=schema.d.ts.map