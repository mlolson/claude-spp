import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  normalizeFilePath,
  fileMatchesPattern,
  fileMatchesPatterns,
  findTasksForFile,
  isDojoInternalFile,
} from "../src/hooks/file-matcher.js";
import { preToolUseHook } from "../src/hooks/pre-tool-use.js";
import type { Task } from "../src/tasks/parser.js";

describe("file-matcher", () => {
  const projectPath = "/Users/test/project";

  describe("normalizeFilePath", () => {
    it("should return relative path as-is", () => {
      expect(normalizeFilePath("src/test.ts", projectPath)).toBe("src/test.ts");
    });

    it("should convert absolute path to relative", () => {
      expect(normalizeFilePath("/Users/test/project/src/test.ts", projectPath)).toBe(
        "src/test.ts"
      );
    });

    it("should return original if path is outside project", () => {
      expect(normalizeFilePath("/Users/other/file.ts", projectPath)).toBe(
        "/Users/other/file.ts"
      );
    });
  });

  describe("fileMatchesPattern", () => {
    it("should match exact path", () => {
      expect(fileMatchesPattern("src/test.ts", "src/test.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test.ts", "src/other.ts", projectPath)).toBe(false);
    });

    it("should match directory prefix", () => {
      expect(fileMatchesPattern("src/components/Button.tsx", "src/components/", projectPath)).toBe(
        true
      );
      expect(fileMatchesPattern("src/utils/helpers.ts", "src/components/", projectPath)).toBe(
        false
      );
    });

    it("should match files inside directory when pattern is directory name", () => {
      expect(fileMatchesPattern("src/components/Button.tsx", "src/components", projectPath)).toBe(
        true
      );
    });

    it("should handle leading ./ in pattern", () => {
      expect(fileMatchesPattern("src/test.ts", "./src/test.ts", projectPath)).toBe(true);
    });

    it("should match glob patterns with *", () => {
      expect(fileMatchesPattern("src/test.ts", "src/*.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/nested/test.ts", "src/*.ts", projectPath)).toBe(false);
    });

    it("should match glob patterns with **", () => {
      expect(fileMatchesPattern("src/nested/deep/test.ts", "src/**/*.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test.ts", "src/**/*.ts", projectPath)).toBe(true);
    });

    it("should match glob patterns with ?", () => {
      expect(fileMatchesPattern("src/test1.ts", "src/test?.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test12.ts", "src/test?.ts", projectPath)).toBe(false);
    });
  });

  describe("fileMatchesPatterns", () => {
    it("should return true if any pattern matches", () => {
      const patterns = ["src/utils/", "src/test.ts"];
      expect(fileMatchesPatterns("src/test.ts", patterns, projectPath)).toBe(true);
      expect(fileMatchesPatterns("src/utils/helper.ts", patterns, projectPath)).toBe(true);
      expect(fileMatchesPatterns("src/other.ts", patterns, projectPath)).toBe(false);
    });

    it("should return false for empty patterns", () => {
      expect(fileMatchesPatterns("src/test.ts", [], projectPath)).toBe(false);
    });
  });

  describe("findTasksForFile", () => {
    const mockTasks: Task[] = [
      {
        filename: "001-task.md",
        directory: "human",
        title: "Task 1",
        metadata: {
          difficulty: "easy",
          category: "feature",
          skills: [],
          files: ["src/feature/"],
        },
        description: "",
        hints: [],
        acceptanceCriteria: [],
        completionNotes: { completedBy: null, completedAt: null, notes: null },
        rawContent: "",
      },
      {
        filename: "002-task.md",
        directory: "claude",
        title: "Task 2",
        metadata: {
          difficulty: "medium",
          category: "bugfix",
          skills: [],
          files: ["src/utils/helper.ts", "src/api/**/*.ts"],
        },
        description: "",
        hints: [],
        acceptanceCriteria: [],
        completionNotes: { completedBy: null, completedAt: null, notes: null },
        rawContent: "",
      },
    ];

    it("should find matching tasks", () => {
      const matches = findTasksForFile("src/feature/component.tsx", mockTasks, projectPath);
      expect(matches).toHaveLength(1);
      expect(matches[0].title).toBe("Task 1");
    });

    it("should find tasks with glob patterns", () => {
      const matches = findTasksForFile("src/api/routes/users.ts", mockTasks, projectPath);
      expect(matches).toHaveLength(1);
      expect(matches[0].title).toBe("Task 2");
    });

    it("should return empty array if no match", () => {
      const matches = findTasksForFile("src/unrelated/file.ts", mockTasks, projectPath);
      expect(matches).toHaveLength(0);
    });
  });

  describe("isDojoInternalFile", () => {
    it("should return true for files in .dojo directory", () => {
      expect(isDojoInternalFile(".dojo/config.json", projectPath)).toBe(true);
      expect(isDojoInternalFile(".dojo/tasks/human/001-task.md", projectPath)).toBe(true);
    });

    it("should return true for absolute paths in .dojo directory", () => {
      expect(isDojoInternalFile("/Users/test/project/.dojo/config.json", projectPath)).toBe(true);
    });

    it("should return false for regular project files", () => {
      expect(isDojoInternalFile("src/test.ts", projectPath)).toBe(false);
    });
  });
});

describe("preToolUseHook", () => {
  let tempDir: string;
  let dojoDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dojo-test-"));
    dojoDir = path.join(tempDir, ".dojo");
    fs.mkdirSync(dojoDir, { recursive: true });

    // Create config
    fs.writeFileSync(
      path.join(dojoDir, "config.json"),
      JSON.stringify({
        preset: "balanced",
        enabled: true,
        humanRatioTarget: 0.25,
      })
    );

    // Create task directories
    fs.mkdirSync(path.join(dojoDir, "tasks", "human"), { recursive: true });
    fs.mkdirSync(path.join(dojoDir, "tasks", "claude"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should allow non-write tools", () => {
    const result = preToolUseHook({
      tool: { name: "Read", input: { file_path: "src/test.ts" } },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should allow writes when Dojo not initialized", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "dojo-empty-"));
    try {
      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: emptyDir,
      });
      expect(result.decision).toBe("allow");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("should allow writes to .dojo directory", () => {
    const result = preToolUseHook({
      tool: {
        name: "Write",
        input: { file_path: path.join(tempDir, ".dojo", "config.json"), content: "{}" },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should allow writes when no active tasks exist", () => {
    const result = preToolUseHook({
      tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should allow writes when file matches active task", () => {
    // Create a task with files
    fs.writeFileSync(
      path.join(dojoDir, "tasks", "human", "001-task.md"),
      `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/feature/

## Description
A task
`
    );

    const result = preToolUseHook({
      tool: {
        name: "Write",
        input: { file_path: path.join(tempDir, "src", "feature", "test.ts"), content: "test" },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should ask when file does not match any active task", () => {
    // Create a task with files
    fs.writeFileSync(
      path.join(dojoDir, "tasks", "claude", "001-task.md"),
      `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/feature/

## Description
A task
`
    );

    const result = preToolUseHook({
      tool: {
        name: "Write",
        input: { file_path: path.join(tempDir, "src", "other", "test.ts"), content: "test" },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("ask");
    expect(result.reason).toBe("file_not_in_task");
    expect(result.message).toContain("not part of any active Dojo task");
  });

  it("should handle Edit tool", () => {
    fs.writeFileSync(
      path.join(dojoDir, "tasks", "human", "001-task.md"),
      `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/test.ts

## Description
A task
`
    );

    const result = preToolUseHook({
      tool: {
        name: "Edit",
        input: {
          file_path: path.join(tempDir, "src", "test.ts"),
          old_string: "old",
          new_string: "new",
        },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should handle NotebookEdit tool", () => {
    fs.writeFileSync(
      path.join(dojoDir, "tasks", "claude", "001-task.md"),
      `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: notebooks/**/*.ipynb

## Description
A task
`
    );

    const result = preToolUseHook({
      tool: {
        name: "NotebookEdit",
        input: {
          notebook_path: path.join(tempDir, "notebooks", "analysis.ipynb"),
          new_source: "print('hello')",
        },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });
});
