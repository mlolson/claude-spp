import { type Config } from "./schema.js";
/**
 * Get the path to the .claude-spp directory for a project
 * Checks local project directory first, then falls back to ~/.claude-spp-configs/<project-dirname>
 */
export declare function getSppDir(projectPath: string): string;
/**
 * Get the local .claude-spp directory path (always in project root)
 * Used when we explicitly want the local path, e.g., for creating new configs
 */
export declare function getLocalSppDir(projectPath: string): string;
/**
 * Get the fallback .claude-spp directory path (always in home dir)
 * Used when we explicitly want the fallback path
 */
export declare function getExternalSppDir(projectPath: string): string;
/**
 * Get the path to the config file
 */
export declare function getConfigPath(projectPath: string): string;
/**
 * Check if SPP is initialized in the project
 */
export declare function isSppInitialized(projectPath: string): boolean;
/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 * Auto-unpauses if pausedUntil time has passed
 */
export declare function loadConfig(projectPath: string): Config;
/**
 * Save config to file
 */
export declare function saveConfig(projectPath: string, config: Config): void;
/**
 * Initialize SPP in a project with default config
 */
export declare function initializeConfig(projectPath: string): Config;
//# sourceMappingURL=loader.d.ts.map