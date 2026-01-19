import { type State, type Session } from "./schema.js";
/**
 * Get the path to the state file
 */
export declare function getStatePath(projectPath: string): string;
/**
 * Load state from file
 * Returns new default state if file doesn't exist
 */
export declare function loadState(projectPath: string): State;
/**
 * Save state to file
 */
export declare function saveState(projectPath: string, state: State): void;
/**
 * Update session statistics
 */
export declare function updateSession(projectPath: string, updates: Partial<Session>): State;
/**
 * Add lines to human count
 */
export declare function addHumanLines(projectPath: string, lines: number): State;
/**
 * Add lines to Claude count
 */
export declare function addClaudeLines(projectPath: string, lines: number): State;
/**
 * Reset session statistics (start a new session)
 */
export declare function resetSession(projectPath: string): State;
/**
 * Set the current focused task
 */
export declare function setCurrentTask(projectPath: string, taskFilename: string | null): State;
/**
 * Get the current focused task filename
 */
export declare function getCurrentTask(projectPath: string): string | null;
/**
 * Clear the current focused task
 */
export declare function clearCurrentTask(projectPath: string): State;
//# sourceMappingURL=manager.d.ts.map