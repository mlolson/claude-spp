import { type Config } from "./config/schema.js";
/**
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export declare function installGitHook(projectPath: string): void;
/**
 * Initialize STP in a project
 * Creates .stp directory with config
 */
export declare function initializeStp(projectPath: string, modeNumber?: number): Promise<Config>;
/**
 * Check if STP is fully initialized
 */
export declare function isFullyInitialized(projectPath: string): boolean;
/**
 * Ensure STP is initialized, initializing if needed
 */
export declare function ensureInitialized(projectPath: string, modeNumber?: number): Promise<Config>;
//# sourceMappingURL=init.d.ts.map