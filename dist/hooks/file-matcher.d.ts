/**
 * Normalize a file path to be relative to the project root
 * Handles both absolute and relative paths
 */
export declare function normalizeFilePath(filePath: string, projectPath: string): string;
/**
 * Check if a file path matches a pattern
 * Pattern can be:
 * - Exact path: "src/test.ts"
 * - Directory prefix: "src/components/" (matches files in that dir)
 * - Glob pattern: "src/**\/*.ts", "src/*.ts"
 */
export declare function fileMatchesPattern(filePath: string, pattern: string, projectPath: string): boolean;
/**
 * Check if a file matches any of the given patterns
 */
export declare function fileMatchesPatterns(filePath: string, patterns: string[], projectPath: string): boolean;
/**
 * Check if a file path is within the .dojo directory
 */
export declare function isDojoInternalFile(filePath: string, projectPath: string): boolean;
//# sourceMappingURL=file-matcher.d.ts.map