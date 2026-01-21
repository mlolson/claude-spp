import { type Config } from "./schema.js";
/**
 * Get the path to the .stp directory for a project
 */
export declare function getStpDir(projectPath: string): string;
/**
 * Get the path to the config file
 */
export declare function getConfigPath(projectPath: string): string;
/**
 * Check if STP is initialized in the project
 */
export declare function isStpInitialized(projectPath: string): boolean;
/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 */
export declare function loadConfig(projectPath: string): Config;
/**
 * Save config to file
 */
export declare function saveConfig(projectPath: string, config: Config): void;
/**
 * Initialize STP in a project with default config
 */
export declare function initializeConfig(projectPath: string, preset?: string): Config;
//# sourceMappingURL=loader.d.ts.map