/**
 * Task assignment directories
 */
export declare const TASK_DIRS: {
    readonly unassigned: "unassigned";
    readonly human: "human";
    readonly claude: "claude";
    readonly completed: "completed";
};
export type TaskDirectory = keyof typeof TASK_DIRS;
/**
 * Get the path to the tasks directory
 */
export declare function getTasksDir(projectPath: string): string;
/**
 * Get the path to a specific task subdirectory
 */
export declare function getTaskSubdir(projectPath: string, dir: TaskDirectory): string;
/**
 * Check if task directories are initialized
 */
export declare function areTaskDirsInitialized(projectPath: string): boolean;
/**
 * Initialize task directories
 */
export declare function initializeTaskDirs(projectPath: string): void;
/**
 * List task files in a directory
 */
export declare function listTaskFiles(projectPath: string, dir: TaskDirectory): string[];
/**
 * Move a task file from one directory to another
 */
export declare function moveTask(projectPath: string, filename: string, from: TaskDirectory, to: TaskDirectory): void;
/**
 * Get counts of tasks in each directory
 */
export declare function getTaskCounts(projectPath: string): Record<TaskDirectory, number>;
//# sourceMappingURL=directories.d.ts.map