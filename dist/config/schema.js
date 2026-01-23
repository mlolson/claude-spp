import { z } from "zod";
/**
 * Available modes for work distribution
 */
export const MODES = [
    { number: 1, name: "Lazy monkey", humanRatio: 0, description: "100% AI coding" },
    { number: 2, name: "Curious monkey", humanRatio: 0.1, description: "90% AI / 10% human" },
    { number: 3, name: "Clever monkey", humanRatio: 0.25, description: "75% AI / 25% human" },
    { number: 4, name: "Wise monkey", humanRatio: 0.5, description: "50% AI / 50% human" },
    { number: 5, name: "Crazy monkey", humanRatio: 1, description: "100% human coding" },
];
/**
 * Get mode by number
 */
export function getModeByNumber(num) {
    return MODES.find((m) => m.number === num);
}
/**
 * Get mode by name (case-insensitive)
 */
export function getModeByName(name) {
    return MODES.find((m) => m.name.toLowerCase() === name.toLowerCase());
}
/**
 * Stats window options for filtering commit history
 */
export const StatsWindowSchema = z.enum(["oneDay", "oneWeek", "allTime"]);
/**
 * Tracking mode options - what to count for ratio calculation
 */
export const TrackingModeSchema = z.enum(["commits", "lines"]);
/**
 * Human-readable labels for tracking modes
 */
export const TRACKING_MODE_LABELS = {
    commits: "Commits",
    lines: "Lines of code",
};
/**
 * Human-readable labels for stats windows
 */
export const STATS_WINDOW_LABELS = {
    oneDay: "Last 24 hours",
    oneWeek: "Last 7 days",
    allTime: "All time",
};
/**
 * Get cutoff date for a stats window
 * @returns Date for filtering or null for allTime (no filter)
 */
export function getStatsWindowCutoff(window) {
    const now = new Date();
    switch (window) {
        case "oneDay":
            return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        case "oneWeek":
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "allTime":
            return null;
    }
}
/**
 * Main configuration schema for .dojo/config.json
 */
export const ConfigSchema = z.object({
    // Whether Dojo is enabled for this project
    enabled: z.boolean().default(true),
    // Mode number (1-6)
    mode: z.number().int().min(1).max(6).default(4),
    // Stats window for filtering commit history
    statsWindow: StatsWindowSchema.default("oneWeek"),
    // Tracking mode - what to count for ratio calculation
    trackingMode: TrackingModeSchema.default("commits"),
    // ISO timestamp when SPP pause expires (set by pause command)
    pausedUntil: z.string().optional(),
    // Git commit hash of the last commit to exclude from tracking
    // Set to the 10th commit hash once we reach MIN_COMMITS_FOR_TRACKING
    // Stats only include commits after this one
    trackingStartCommit: z.string().optional(),
});
/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    enabled: true,
    mode: 3,
    statsWindow: "oneWeek",
    trackingMode: "commits",
};
/**
 * Get the current mode from config
 */
export function getCurrentMode(config) {
    return getModeByNumber(config.mode) ?? MODES[3]; // Default to 50-50
}
/**
 * Get the effective human work ratio from config
 */
export function getEffectiveRatio(config) {
    // Use mode
    const mode = getCurrentMode(config);
    return mode.humanRatio;
}
//# sourceMappingURL=schema.js.map