import { type Config, type StatsWindow, type TrackingMode } from "./config/schema.js";
/**
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export declare function installGitHook(projectPath: string): void;
export declare function promptUser(prompt: string): Promise<string>;
/**
 * Initialize SPP in a project
 * Creates .claude-spp directory with config
 * @param projectPath Path to the project
 * @param modeNumber Optional mode number to skip the mode prompt
 * @param statsWindow Optional stats window to skip the stats window prompt
 * @param trackingMode Optional tracking mode to skip the tracking mode prompt
 */
export declare function initializeSpp(projectPath: string, modeNumber?: number, statsWindow?: StatsWindow, trackingMode?: TrackingMode): Promise<Config>;
/**
 * Check if SPP is fully initialized
 */
export declare function isFullyInitialized(projectPath: string): boolean;
/**
 * Ensure SPP is initialized, initializing if needed
 */
export declare function ensureInitialized(projectPath: string, modeNumber?: number, statsWindow?: StatsWindow, trackingMode?: TrackingMode): Promise<Config>;
//# sourceMappingURL=init.d.ts.map