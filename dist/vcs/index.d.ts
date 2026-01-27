import type { VcsProvider, VcsType, LineCounts, CommitInfo } from "./types.js";
export type { VcsProvider, VcsType, LineCounts, CommitInfo } from "./types.js";
/**
 * Get the appropriate VCS provider
 *
 * @param projectPath - The project directory
 * @param vcsType - VCS type (defaults to "git")
 */
export declare function getProvider(projectPath: string, vcsType?: VcsType): VcsProvider;
/**
 * Get line counts using specified or auto-detected VCS
 */
export declare function getLineCounts(projectPath: string, vcsType?: VcsType): LineCounts;
/**
 * Get line counts with window using specified or auto-detected VCS
 */
export declare function getLineCountsWithWindow(projectPath: string, options: {
    since: Date | null;
    afterCommit?: string | null;
}, vcsType?: VcsType): LineCounts;
/**
 * Get head commit hash using specified or auto-detected VCS
 */
export declare function getHeadCommitHash(projectPath: string, vcsType?: VcsType): string | null;
/**
 * Get total commit count using specified or auto-detected VCS
 */
export declare function getTotalCommitCount(projectPath: string, vcsType?: VcsType): number;
/**
 * Get commit info using specified or auto-detected VCS
 */
export declare function getCommitInfo(projectPath: string, commitHash: string, vcsType?: VcsType): CommitInfo | null;
/**
 * Clear cache using specified or auto-detected VCS
 */
export declare function clearCache(projectPath: string, vcsType?: VcsType): void;
//# sourceMappingURL=index.d.ts.map