import { type TaskDirectory } from "./directories.js";
import { type TaskCategory, type TaskDifficulty } from "./parser.js";
/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
    title: string;
    description: string;
    difficulty?: TaskDifficulty;
    category?: TaskCategory;
    skills?: string[];
    files?: string[];
    hints?: string[];
    acceptanceCriteria?: string[];
}
/**
 * Get the next task ID by scanning existing tasks
 */
export declare function getNextTaskId(projectPath: string): number;
/**
 * Generate a filename from task ID and title
 */
export declare function generateFilename(id: number, title: string): string;
/**
 * Generate markdown content for a task
 */
export declare function generateTaskContent(input: CreateTaskInput): string;
/**
 * Create a new task file
 */
export declare function createTask(projectPath: string, input: CreateTaskInput, directory?: TaskDirectory): {
    filename: string;
    filepath: string;
};
/**
 * Create multiple tasks at once
 */
export declare function createTasks(projectPath: string, inputs: CreateTaskInput[], directory?: TaskDirectory): {
    filename: string;
    filepath: string;
}[];
/**
 * Template tasks for common scenarios
 */
export declare const TASK_TEMPLATES: {
    /**
     * Feature implementation task
     */
    feature: (title: string, description: string, files?: string[]) => CreateTaskInput;
    /**
     * Bug fix task
     */
    bugfix: (title: string, description: string, files?: string[]) => CreateTaskInput;
    /**
     * Refactoring task
     */
    refactor: (title: string, description: string, files?: string[]) => CreateTaskInput;
    /**
     * Test writing task
     */
    test: (title: string, description: string, files?: string[]) => CreateTaskInput;
    /**
     * Documentation task
     */
    docs: (title: string, description: string, files?: string[]) => CreateTaskInput;
};
//# sourceMappingURL=generator.d.ts.map