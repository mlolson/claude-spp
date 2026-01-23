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
 * Get the current HEAD commit hash (exported version)
 */
export declare function getHeadCommitHash(projectPath: string): string | null;
/**
 * Get total number of commits in the repo
 */
export declare function getTotalCommitCount(projectPath: string): number;
/**
 * Commit info for display
 */
export interface CommitInfo {
    shortHash: string;
    title: string;
    date: Date;
}
/**
 * Get info about a specific commit
 * Returns null if the commit doesn't exist
 */
export declare function getCommitInfo(projectPath: string, commitHash: string): CommitInfo | null;
/**
 * Get the hash of the Nth commit (1-indexed, chronological order)
 * Returns null if there aren't enough commits
 */
export declare function getNthCommitHash(projectPath: string, n: number): string | null;
/**
 * Clear the cache
 */
export declare function clearCache(projectPath: string): void;
/**
 * Calculate line counts from git history with caching
 */
export declare function getLineCounts(projectPath: string): LineCounts;
/**
 * Get line counts with optional filters
 * @param since If null, no time filter. If Date, filters commits after this date.
 * @param afterCommit If provided, only includes commits after this commit hash (exclusive).
 */
export declare function getLineCountsWithWindow(projectPath: string, options: {
    since: Date | null;
    afterCommit?: string | null;
}): LineCounts;
//# sourceMappingURL=history.d.ts.map