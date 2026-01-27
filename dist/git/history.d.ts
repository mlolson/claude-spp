/**
 * Backward compatibility re-exports from VCS module
 * @deprecated Import from "../vcs/index.js" instead
 */
export { getLineCounts, getLineCountsWithWindow, getHeadCommitHash, getTotalCommitCount, getCommitInfo, clearCache, type LineCounts, type CommitInfo, } from "../vcs/index.js";
export declare function getNthCommitHash(projectPath: string, n: number): string | null;
//# sourceMappingURL=history.d.ts.map