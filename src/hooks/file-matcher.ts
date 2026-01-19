import * as path from "node:path";
import type { Task } from "../tasks/parser.js";

/**
 * Normalize a file path to be relative to the project root
 * Handles both absolute and relative paths
 */
export function normalizeFilePath(filePath: string, projectPath: string): string {
  // If already relative, return as-is
  if (!path.isAbsolute(filePath)) {
    return filePath;
  }

  // Make absolute path relative to project
  const relativePath = path.relative(projectPath, filePath);

  // If the path goes outside the project (starts with ..), return original
  if (relativePath.startsWith("..")) {
    return filePath;
  }

  return relativePath;
}

/**
 * Convert a simple glob pattern to a regex
 * Supports: * (any chars except /), ** (any chars including /), ? (single char)
 */
function globToRegex(pattern: string): RegExp {
  let regex = pattern
    // Escape special regex chars except * and ?
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // ** matches anything including path separators
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    // * matches anything except path separators
    .replace(/\*/g, "[^/]*")
    // ? matches single character
    .replace(/\?/g, ".")
    // Restore ** as match-all
    .replace(/<<<GLOBSTAR>>>/g, ".*");

  // Anchor to start and end
  return new RegExp(`^${regex}$`);
}

/**
 * Check if a file path matches a pattern
 * Pattern can be:
 * - Exact path: "src/test.ts"
 * - Directory prefix: "src/components/" (matches files in that dir)
 * - Glob pattern: "src/**\/*.ts", "src/*.ts"
 */
export function fileMatchesPattern(
  filePath: string,
  pattern: string,
  projectPath: string
): boolean {
  // Normalize the file path
  const normalizedFile = normalizeFilePath(filePath, projectPath);

  // Normalize the pattern (remove leading ./)
  let normalizedPattern = pattern.replace(/^\.\//, "");

  // If pattern ends with /, it's a directory prefix - match anything inside
  if (normalizedPattern.endsWith("/")) {
    return normalizedFile.startsWith(normalizedPattern);
  }

  // If pattern contains glob characters, use glob matching
  if (normalizedPattern.includes("*") || normalizedPattern.includes("?")) {
    const regex = globToRegex(normalizedPattern);
    return regex.test(normalizedFile);
  }

  // Otherwise, exact match or directory prefix match
  if (normalizedFile === normalizedPattern) {
    return true;
  }

  // Also match if pattern is a directory and file is inside it
  if (normalizedFile.startsWith(normalizedPattern + "/")) {
    return true;
  }

  return false;
}

/**
 * Check if a file matches any of the given patterns
 */
export function fileMatchesPatterns(
  filePath: string,
  patterns: string[],
  projectPath: string
): boolean {
  return patterns.some((pattern) =>
    fileMatchesPattern(filePath, pattern, projectPath)
  );
}

/**
 * Find all tasks that include a file in their metadata.files
 */
export function findTasksForFile(
  filePath: string,
  tasks: Task[],
  projectPath: string
): Task[] {
  return tasks.filter((task) =>
    fileMatchesPatterns(filePath, task.metadata.files, projectPath)
  );
}

/**
 * Check if a file path is within the .dojo directory
 */
export function isDojoInternalFile(filePath: string, projectPath: string): boolean {
  const normalizedFile = normalizeFilePath(filePath, projectPath);
  return normalizedFile.startsWith(".dojo/") || normalizedFile === ".dojo";
}
