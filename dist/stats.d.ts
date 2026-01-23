import { type Mode, type StatsWindow, type TrackingMode } from "./config/schema.js";
/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export declare function calculateRatio(humanLines: number, claudeLines: number): number;
/**
 * Check if the human work ratio meets the target
 */
export declare function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean;
export interface StatsResult {
    initialized: boolean;
    enabled?: boolean;
    mode?: Mode;
    targetRatio?: number;
    currentRatio?: number;
    ratioHealthy?: boolean;
    statsWindow?: StatsWindow;
    trackingMode?: TrackingMode;
    lines?: {
        humanLines: number;
        claudeLines: number;
        humanCommits: number;
        claudeCommits: number;
        fromCache: boolean;
        commitsScanned: number;
    };
    session?: {
        startedAt: string;
    };
}
/**
 * Get current SPP statistics
 */
export declare function getStats(projectPath: string): StatsResult;
/**
 * Format stats for display
 */
export declare function formatStats(stats: StatsResult): string;
//# sourceMappingURL=stats.d.ts.map