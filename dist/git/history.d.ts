/**
 * Line count result
 */
export interface LineCounts {
    humanLines: number;
    claudeLines: number;
    humanCommits: number;
    claudeCommits: number;
    fromCache: boolean;
    commitsScanned: number;
}
/**
 * Clear the cache
 */
export declare function clearCache(projectPath: string): void;
/**
 * Calculate line counts from git history with caching
 */
export declare function getLineCounts(projectPath: string): LineCounts;
/**
 * Force recalculation by clearing cache first
 */
export declare function recalculateLineCounts(projectPath: string): LineCounts;
//# sourceMappingURL=history.d.ts.map