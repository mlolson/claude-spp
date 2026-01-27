import { z } from "zod";
/**
 * Mode definition
 */
export interface Mode {
    number: number;
    name: string;
    humanRatio: number;
    description: string;
}
/**
 * Available modes for work distribution
 */
export declare const MODES: Mode[];
/**
 * Get mode by number
 */
export declare function getModeByNumber(num: number): Mode | undefined;
/**
 * Get mode by name (case-insensitive)
 */
export declare function getModeByName(name: string): Mode | undefined;
/**
 * Stats window options for filtering commit history
 */
export declare const StatsWindowSchema: z.ZodEnum<["oneDay", "oneWeek", "allTime"]>;
export type StatsWindow = z.infer<typeof StatsWindowSchema>;
/**
 * Tracking mode options - what to count for ratio calculation
 */
export declare const TrackingModeSchema: z.ZodEnum<["commits", "lines"]>;
export type TrackingMode = z.infer<typeof TrackingModeSchema>;
/**
 * VCS type options
 */
export declare const VcsTypeSchema: z.ZodEnum<["git", "hg"]>;
export type VcsType = z.infer<typeof VcsTypeSchema>;
/**
 * Human-readable labels for tracking modes
 */
export declare const TRACKING_MODE_LABELS: Record<TrackingMode, string>;
/**
 * Human-readable labels for stats windows
 */
export declare const STATS_WINDOW_LABELS: Record<StatsWindow, string>;
/**
 * Get cutoff date for a stats window
 * @returns Date for filtering or null for allTime (no filter)
 */
export declare function getStatsWindowCutoff(window: StatsWindow): Date | null;
/**
 * Main configuration schema for .dojo/config.json
 */
export declare const ConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    mode: z.ZodDefault<z.ZodNumber>;
    statsWindow: z.ZodDefault<z.ZodEnum<["oneDay", "oneWeek", "allTime"]>>;
    trackingMode: z.ZodDefault<z.ZodEnum<["commits", "lines"]>>;
    pausedUntil: z.ZodOptional<z.ZodString>;
    trackingStartCommit: z.ZodOptional<z.ZodString>;
    vcsType: z.ZodOptional<z.ZodEnum<["git", "hg"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    mode: number;
    statsWindow: "oneDay" | "oneWeek" | "allTime";
    trackingMode: "commits" | "lines";
    pausedUntil?: string | undefined;
    trackingStartCommit?: string | undefined;
    vcsType?: "git" | "hg" | undefined;
}, {
    enabled?: boolean | undefined;
    mode?: number | undefined;
    statsWindow?: "oneDay" | "oneWeek" | "allTime" | undefined;
    trackingMode?: "commits" | "lines" | undefined;
    pausedUntil?: string | undefined;
    trackingStartCommit?: string | undefined;
    vcsType?: "git" | "hg" | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: Config;
/**
 * Get the current mode from config
 */
export declare function getCurrentMode(config: Config): Mode;
/**
 * Get the effective human work ratio from config
 */
export declare function getEffectiveRatio(config: Config): number;
//# sourceMappingURL=schema.d.ts.map