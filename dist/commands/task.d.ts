import { type TaskDirectory } from "../tasks/directories.js";
export interface TaskInfo {
    filename: string;
    title: string;
    directory: TaskDirectory;
    difficulty: string;
    category: string;
}
/**
 * List all active tasks (not completed)
 */
export declare function listTasks(projectPath: string): TaskInfo[];
/**
 * Format task list for display
 */
export declare function formatTaskList(tasks: TaskInfo[]): string;
//# sourceMappingURL=task.d.ts.map