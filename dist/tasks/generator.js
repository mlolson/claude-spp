import * as fs from "node:fs";
import * as path from "node:path";
import { getTaskSubdir, listTaskFiles } from "./directories.js";
/**
 * Get the next task ID by scanning existing tasks
 */
export function getNextTaskId(projectPath) {
    const directories = ["unassigned", "human", "claude", "completed"];
    let maxId = 0;
    for (const dir of directories) {
        const files = listTaskFiles(projectPath, dir);
        for (const file of files) {
            const match = file.match(/^(\d+)-/);
            if (match) {
                const id = parseInt(match[1], 10);
                if (id > maxId)
                    maxId = id;
            }
        }
    }
    return maxId + 1;
}
/**
 * Generate a filename from task ID and title
 */
export function generateFilename(id, title) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);
    const paddedId = id.toString().padStart(3, "0");
    return `${paddedId}-${slug}.md`;
}
/**
 * Generate markdown content for a task
 */
export function generateTaskContent(input) {
    const { title, description, difficulty = "medium", category = "feature", skills = [], files = [], hints = [], acceptanceCriteria = [], } = input;
    const lines = [
        `# ${title}`,
        "",
        "## Metadata",
        `- **Difficulty**: ${difficulty}`,
        `- **Category**: ${category}`,
        `- **Skills**: ${skills.join(", ") || "general"}`,
        `- **Files**: ${files.join(", ") || "TBD"}`,
        "",
        "## Description",
        "",
        description,
        "",
        "## Hints",
        "",
    ];
    // Add hints as collapsible sections
    if (hints.length > 0) {
        hints.forEach((hint, index) => {
            lines.push("<details>");
            lines.push(`<summary>Hint ${index + 1}</summary>`);
            lines.push(hint);
            lines.push("</details>");
            lines.push("");
        });
    }
    else {
        lines.push("<details>");
        lines.push("<summary>Hint 1</summary>");
        lines.push("Try breaking the problem into smaller pieces.");
        lines.push("</details>");
        lines.push("");
    }
    lines.push("## Acceptance Criteria");
    lines.push("");
    if (acceptanceCriteria.length > 0) {
        acceptanceCriteria.forEach((criterion) => {
            lines.push(`- [ ] ${criterion}`);
        });
    }
    else {
        lines.push("- [ ] Implementation complete");
        lines.push("- [ ] Tests pass");
    }
    lines.push("");
    lines.push("## Completion Notes");
    lines.push("");
    lines.push("<!-- Filled in when task is completed -->");
    lines.push("- **Completed by**:");
    lines.push("- **Completed at**:");
    lines.push("- **Notes**:");
    lines.push("");
    return lines.join("\n");
}
/**
 * Create a new task file
 */
export function createTask(projectPath, input, directory = "unassigned") {
    const id = getNextTaskId(projectPath);
    const filename = generateFilename(id, input.title);
    const content = generateTaskContent(input);
    const dirPath = getTaskSubdir(projectPath, directory);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    const filepath = path.join(dirPath, filename);
    fs.writeFileSync(filepath, content, "utf-8");
    return { filename, filepath };
}
/**
 * Create multiple tasks at once
 */
export function createTasks(projectPath, inputs, directory = "unassigned") {
    return inputs.map((input) => createTask(projectPath, input, directory));
}
/**
 * Template tasks for common scenarios
 */
export const TASK_TEMPLATES = {
    /**
     * Feature implementation task
     */
    feature: (title, description, files = []) => ({
        title,
        description,
        category: "feature",
        difficulty: "medium",
        files,
        acceptanceCriteria: [
            "Feature implemented as described",
            "Unit tests added",
            "No regressions in existing tests",
        ],
    }),
    /**
     * Bug fix task
     */
    bugfix: (title, description, files = []) => ({
        title,
        description,
        category: "bugfix",
        difficulty: "medium",
        files,
        acceptanceCriteria: [
            "Bug is fixed",
            "Regression test added",
            "Root cause documented",
        ],
    }),
    /**
     * Refactoring task
     */
    refactor: (title, description, files = []) => ({
        title,
        description,
        category: "refactor",
        difficulty: "medium",
        files,
        acceptanceCriteria: [
            "Code refactored as described",
            "All existing tests pass",
            "No functional changes",
        ],
    }),
    /**
     * Test writing task
     */
    test: (title, description, files = []) => ({
        title,
        description,
        category: "test",
        difficulty: "easy",
        files,
        acceptanceCriteria: [
            "Tests written and passing",
            "Edge cases covered",
            "Good test names and organization",
        ],
    }),
    /**
     * Documentation task
     */
    docs: (title, description, files = []) => ({
        title,
        description,
        category: "docs",
        difficulty: "easy",
        files,
        acceptanceCriteria: [
            "Documentation is clear and accurate",
            "Examples included where appropriate",
            "Formatting is consistent",
        ],
    }),
};
//# sourceMappingURL=generator.js.map