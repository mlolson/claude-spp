import { type Task } from "./parser.js";
/**
 * Completion input
 */
export interface CompleteTaskInput {
    filename: string;
    completedBy: "human" | "claude";
    linesOfCode?: number;
    notes?: string;
}
/**
 * Completion result
 */
export interface CompleteTaskResult {
    success: boolean;
    task: Task | null;
    message: string;
    updatedRatio?: number;
    commitHash?: string;
}
/**
 * Complete a task
 */
export declare function completeTask(projectPath: string, input: CompleteTaskInput): CompleteTaskResult;
/**
 * Reopen a completed task (move back to unassigned)
 */
export declare function reopenTask(projectPath: string, filename: string): CompleteTaskResult;
/**
 * Get completed tasks
 */
export declare function getCompletedTasks(projectPath: string): Task[];
/**
 * Get completion statistics
 */
export declare function getCompletionStats(projectPath: string): {
    total: number;
    byHuman: number;
    byClaude: number;
};
/**
 * Format completion result for display
 */
export declare function formatCompletionResult(result: CompleteTaskResult): string;
//# sourceMappingURL=completion.d.ts.map