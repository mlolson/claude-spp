import { type Task } from "./parser.js";
/**
 * Result of focusing on a task
 */
export interface FocusTaskResult {
    success: boolean;
    task: Task | null;
    message: string;
    autoAssigned: boolean;
}
/**
 * Focus on a task for work
 * If task is unassigned, auto-assigns to Claude
 * If task is completed, returns error
 */
export declare function focusTask(projectPath: string, filename: string): FocusTaskResult;
/**
 * Get the currently focused task
 */
export declare function getCurrentFocusedTask(projectPath: string): Task | null;
//# sourceMappingURL=focus.d.ts.map