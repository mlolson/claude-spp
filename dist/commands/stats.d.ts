export interface StatsResult {
    initialized: boolean;
    enabled?: boolean;
    preset?: string;
    targetRatio?: number;
    currentRatio?: number;
    ratioHealthy?: boolean;
    session?: {
        startedAt: string;
        humanLines: number;
        claudeLines: number;
    };
    tasks?: {
        unassigned: number;
        human: number;
        claude: number;
        completed: number;
    };
}
/**
 * Get current Dojo statistics
 */
export declare function getStats(projectPath: string): StatsResult;
/**
 * Format stats for display
 */
export declare function formatStats(stats: StatsResult): string;
//# sourceMappingURL=stats.d.ts.map