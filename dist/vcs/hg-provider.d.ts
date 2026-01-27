import { type VcsProvider, type CommitInfo, type LineCounts, type CommitWithParent } from "./types.js";
/**
 * Mercurial VCS Provider implementation
 */
export declare class HgProvider implements VcsProvider {
    readonly type: "hg";
    isRepo(projectPath: string): boolean;
    getHeadCommitHash(projectPath: string): string | null;
    getTotalCommitCount(projectPath: string): number;
    getCommitInfo(projectPath: string, commitHash: string): CommitInfo | null;
    getFullCommitMessage(projectPath: string, commitHash: string): string;
    getNthCommitHash(projectPath: string, n: number): string | null;
    isAncestor(projectPath: string, commit: string): boolean;
    getCurrentUserEmail(projectPath: string): string;
    getCommitRange(projectPath: string, startCommit: string | null, endCommit: string, since?: Date): CommitWithParent[];
    getLineDiff(projectPath: string, commitHash: string, parentHash: string | null): {
        added: number;
        removed: number;
    };
    private getCachePath;
    private loadCache;
    private saveCache;
    clearCache(projectPath: string): void;
    private parseCommit;
    getLineCounts(projectPath: string): LineCounts;
    getLineCountsWithWindow(projectPath: string, options: {
        since: Date | null;
        afterCommit?: string | null;
    }): LineCounts;
}
//# sourceMappingURL=hg-provider.d.ts.map