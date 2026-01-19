import { z } from "zod";
import { type TaskDirectory } from "./directories.js";
/**
 * Task category types
 */
export declare const TaskCategorySchema: z.ZodEnum<["feature", "bugfix", "refactor", "test", "docs", "core"]>;
export type TaskCategory = z.infer<typeof TaskCategorySchema>;
/**
 * Task difficulty levels
 */
export declare const TaskDifficultySchema: z.ZodEnum<["easy", "medium", "hard"]>;
export type TaskDifficulty = z.infer<typeof TaskDifficultySchema>;
/**
 * Parsed task metadata
 */
export interface TaskMetadata {
    difficulty: TaskDifficulty;
    category: TaskCategory;
    skills: string[];
    files: string[];
}
/**
 * Acceptance criteria item
 */
export interface AcceptanceCriterion {
    text: string;
    completed: boolean;
}
/**
 * Completion notes
 */
export interface CompletionNotes {
    completedBy: "human" | "claude" | null;
    completedAt: string | null;
    notes: string | null;
}
/**
 * Fully parsed task
 */
export interface Task {
    filename: string;
    directory: TaskDirectory;
    title: string;
    metadata: TaskMetadata;
    description: string;
    hints: string[];
    acceptanceCriteria: AcceptanceCriterion[];
    completionNotes: CompletionNotes;
    rawContent: string;
}
/**
 * Parse a task file into a structured Task object
 */
export declare function parseTaskFile(projectPath: string, filename: string, directory: TaskDirectory): Task;
/**
 * Parse all tasks in a directory
 */
export declare function parseTasksInDirectory(projectPath: string, directory: TaskDirectory): Task[];
/**
 * Parse all active tasks (not completed)
 */
export declare function parseActiveTasks(projectPath: string): Task[];
/**
 * Parse all tasks including completed
 */
export declare function parseAllTasks(projectPath: string): Task[];
/**
 * Find a task by filename across all directories
 */
export declare function findTask(projectPath: string, filename: string): Task | null;
//# sourceMappingURL=parser.d.ts.map