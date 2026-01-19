import { type Config, type Preset } from "./config/schema.js";
/**
 * Initialize Dojo in a project
 * Creates .dojo directory with config, state, and task directories
 */
export declare function initializeDojo(projectPath: string, preset?: Preset): Promise<Config>;
/**
 * Check if Dojo is fully initialized
 */
export declare function isFullyInitialized(projectPath: string): boolean;
/**
 * Ensure Dojo is initialized, initializing if needed
 */
export declare function ensureInitialized(projectPath: string, preset?: Preset): Promise<Config>;
//# sourceMappingURL=init.d.ts.map