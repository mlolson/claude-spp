/**
 * Driver role in pair programming
 */
export type Driver = "claude" | "human";
/**
 * Pair programming session state
 */
export interface PairSession {
    /** Current driver */
    driver: Driver;
    /** Task being worked on */
    task: string;
    /** ISO timestamp when session started */
    startedAt: string;
    /** Number of contributions by Claude */
    claudeContributions: number;
    /** Number of contributions by human */
    humanContributions: number;
    /** Number of times drivers have rotated */
    rotationCount: number;
    /** Contributions since last rotation (for prompting) */
    contributionsSinceRotation: number;
}
/**
 * Check if a pair session is active
 */
export declare function hasPairSession(projectPath: string): boolean;
/**
 * Load the current pair session
 */
export declare function loadPairSession(projectPath: string): PairSession | null;
/**
 * Save the pair session
 */
export declare function savePairSession(projectPath: string, session: PairSession): void;
/**
 * Start a new pair session
 */
export declare function startPairSession(projectPath: string, task: string, startingDriver?: Driver): PairSession;
/**
 * End the current pair session
 */
export declare function endPairSession(projectPath: string): PairSession | null;
/**
 * Rotate the driver
 */
export declare function rotateDriver(projectPath: string): PairSession | null;
/**
 * Record a contribution and return updated session
 */
export declare function recordContribution(projectPath: string, by: Driver): PairSession | null;
/**
 * Check if it's time to suggest a rotation
 * Suggests rotation after 3-5 contributions from current driver
 */
export declare function shouldSuggestRotation(session: PairSession): boolean;
/**
 * Get the other driver
 */
export declare function otherDriver(driver: Driver): Driver;
/**
 * Format session duration
 */
export declare function formatDuration(startedAt: string): string;
/**
 * Format session for display
 */
export declare function formatPairSession(session: PairSession): string;
/**
 * Format session summary (for when ending session)
 */
export declare function formatSessionSummary(session: PairSession): string;
//# sourceMappingURL=pair-session.d.ts.map