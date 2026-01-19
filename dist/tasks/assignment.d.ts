import { type Task } from "./parser.js";
/**
 * Result of checking if Claude can take work
 */
export interface CanClaudeTakeWorkResult {
    allowed: boolean;
    currentRatio: number;
    targetRatio: number;
    message: string;
}
/**
 * Check if Claude is allowed to take work based on current ratio
 */
export declare function canClaudeTakeWork(projectPath: string): CanClaudeTakeWorkResult;
/**
 * Suggest who should take the next task
 */
export declare function suggestAssignee(projectPath: string): "human" | "claude";
/**
 * Assign a task to human or claude
 * Returns the updated task or null if not found
 */
export declare function assignTask(projectPath: string, filename: string, assignTo: "human" | "claude"): Task | null;
/**
 * Assign a task with automatic assignee selection based on ratio
 */
export declare function autoAssignTask(projectPath: string, filename: string): {
    task: Task | null;
    assignedTo: "human" | "claude";
    reason: string;
};
/**
 * Get tasks assigned to human
 */
export declare function getHumanTasks(projectPath: string): Task[];
/**
 * Get tasks assigned to Claude
 */
export declare function getClaudeTasks(projectPath: string): Task[];
/**
 * Get unassigned tasks
 */
export declare function getUnassignedTasks(projectPath: string): Task[];
/**
 * Pick a task for the human based on skills or difficulty
 */
export declare function pickTaskForHuman(projectPath: string, preferredSkills?: string[], preferredDifficulty?: string): Task | null;
/**
 * Reassign a task from one assignee to another
 */
export declare function reassignTask(projectPath: string, filename: string, from: "human" | "claude", to: "human" | "claude"): Task | null;
/**
 * Format assignment result for display
 */
export declare function formatAssignmentResult(task: Task | null, assignedTo: "human" | "claude", reason: string): string;
//# sourceMappingURL=assignment.d.ts.map