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
 * Reset session (start a new session)
 */
export declare function resetSession(projectPath: string): State;
//# sourceMappingURL=manager.d.ts.map