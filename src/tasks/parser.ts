import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { getTaskSubdir, type TaskDirectory } from "./directories.js";

/**
 * Task category types
 */
export const TaskCategorySchema = z.enum([
  "feature",
  "bugfix",
  "refactor",
  "test",
  "docs",
  "core",
]);
export type TaskCategory = z.infer<typeof TaskCategorySchema>;

/**
 * Task difficulty levels
 */
export const TaskDifficultySchema = z.enum(["easy", "medium", "hard"]);
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
 * Parse a task title from markdown (first H1)
 */
function parseTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Task";
}

/**
 * Parse metadata section from markdown
 */
function parseMetadata(content: string): TaskMetadata {
  const defaults: TaskMetadata = {
    difficulty: "medium",
    category: "feature",
    skills: [],
    files: [],
  };

  // Find metadata section
  const metadataMatch = content.match(/## Metadata\n([\s\S]*?)(?=\n##|$)/);
  if (!metadataMatch) return defaults;

  const metadataSection = metadataMatch[1];

  // Parse difficulty
  const difficultyMatch = metadataSection.match(/\*\*Difficulty\*\*:\s*(\w+)/i);
  if (difficultyMatch) {
    const parsed = TaskDifficultySchema.safeParse(difficultyMatch[1].toLowerCase());
    if (parsed.success) defaults.difficulty = parsed.data;
  }

  // Parse category
  const categoryMatch = metadataSection.match(/\*\*Category\*\*:\s*(\w+)/i);
  if (categoryMatch) {
    const parsed = TaskCategorySchema.safeParse(categoryMatch[1].toLowerCase());
    if (parsed.success) defaults.category = parsed.data;
  }

  // Parse skills (comma-separated)
  const skillsMatch = metadataSection.match(/\*\*Skills\*\*:\s*(.+)/i);
  if (skillsMatch) {
    defaults.skills = skillsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  // Parse files (comma-separated or line items)
  const filesMatch = metadataSection.match(/\*\*Files\*\*:\s*(.+)/i);
  if (filesMatch) {
    defaults.files = filesMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  return defaults;
}

/**
 * Parse description section from markdown
 */
function parseDescription(content: string): string {
  const match = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
  return match ? match[1].trim() : "";
}

/**
 * Parse hints from collapsible details sections
 */
function parseHints(content: string): string[] {
  const hints: string[] = [];
  const hintsSection = content.match(/## Hints\n([\s\S]*?)(?=\n##|$)/);

  if (!hintsSection) return hints;

  // Match <details> blocks
  const detailsRegex = /<details>\s*<summary>.*?<\/summary>\s*([\s\S]*?)<\/details>/gi;
  let match;
  while ((match = detailsRegex.exec(hintsSection[1])) !== null) {
    hints.push(match[1].trim());
  }

  return hints;
}

/**
 * Parse acceptance criteria checkboxes
 */
function parseAcceptanceCriteria(content: string): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  const section = content.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);

  if (!section) return criteria;

  // Match checkbox items: - [ ] or - [x]
  const checkboxRegex = /^-\s*\[([ xX])\]\s*(.+)$/gm;
  let match;
  while ((match = checkboxRegex.exec(section[1])) !== null) {
    criteria.push({
      completed: match[1].toLowerCase() === "x",
      text: match[2].trim(),
    });
  }

  return criteria;
}

/**
 * Parse completion notes section
 */
function parseCompletionNotes(content: string): CompletionNotes {
  const notes: CompletionNotes = {
    completedBy: null,
    completedAt: null,
    notes: null,
  };

  const section = content.match(/## Completion Notes\n([\s\S]*?)(?=\n##|$)/);
  if (!section) return notes;

  const completedByMatch = section[1].match(/\*\*Completed by\*\*:\s*(\w+)/i);
  if (completedByMatch) {
    const value = completedByMatch[1].toLowerCase();
    if (value === "human" || value === "claude") {
      notes.completedBy = value;
    }
  }

  const completedAtMatch = section[1].match(/\*\*Completed at\*\*:[ \t]*([^\n]*)/i);
  if (completedAtMatch && completedAtMatch[1].trim()) {
    notes.completedAt = completedAtMatch[1].trim() || null;
  }

  const notesMatch = section[1].match(/\*\*Notes\*\*:\s*([\s\S]*?)(?=\n-\s*\*\*|$)/i);
  if (notesMatch && notesMatch[1].trim()) {
    notes.notes = notesMatch[1].trim();
  }

  return notes;
}

/**
 * Parse a task file into a structured Task object
 */
export function parseTaskFile(
  projectPath: string,
  filename: string,
  directory: TaskDirectory
): Task {
  const filePath = path.join(getTaskSubdir(projectPath, directory), filename);
  const content = fs.readFileSync(filePath, "utf-8");

  return {
    filename,
    directory,
    title: parseTitle(content),
    metadata: parseMetadata(content),
    description: parseDescription(content),
    hints: parseHints(content),
    acceptanceCriteria: parseAcceptanceCriteria(content),
    completionNotes: parseCompletionNotes(content),
    rawContent: content,
  };
}

/**
 * Parse all tasks in a directory
 */
export function parseTasksInDirectory(
  projectPath: string,
  directory: TaskDirectory
): Task[] {
  const dirPath = getTaskSubdir(projectPath, directory);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => parseTaskFile(projectPath, f, directory));
}

/**
 * Parse all active tasks (not completed)
 */
export function parseActiveTasks(projectPath: string): Task[] {
  return [
    ...parseTasksInDirectory(projectPath, "unassigned"),
    ...parseTasksInDirectory(projectPath, "human"),
    ...parseTasksInDirectory(projectPath, "claude"),
  ];
}

/**
 * Parse all tasks including completed
 */
export function parseAllTasks(projectPath: string): Task[] {
  return [
    ...parseActiveTasks(projectPath),
    ...parseTasksInDirectory(projectPath, "completed"),
  ];
}

/**
 * Find a task by filename across all directories
 */
export function findTask(projectPath: string, filename: string): Task | null {
  const directories: TaskDirectory[] = ["unassigned", "human", "claude", "completed"];

  for (const dir of directories) {
    const filePath = path.join(getTaskSubdir(projectPath, dir), filename);
    if (fs.existsSync(filePath)) {
      return parseTaskFile(projectPath, filename, dir);
    }
  }

  return null;
}
