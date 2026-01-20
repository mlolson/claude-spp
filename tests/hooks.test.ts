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

    // Create config with mode
    fs.writeFileSync(
      path.join(dojoDir, "config.json"),
      JSON.stringify({
        mode: 4,
        enabled: true,
        difficulty: "medium",
      })
    );

    // Create state with no current task
    fs.writeFileSync(
      path.join(dojoDir, "state.json"),
      JSON.stringify({
        session: {
          startedAt: new Date().toISOString(),
          currentTask: null,
        },
      })
    );

    // Create task directories
    fs.mkdirSync(path.join(dojoDir, "tasks", "human"), { recursive: true });
    fs.mkdirSync(path.join(dojoDir, "tasks", "claude"), { recursive: true });
    fs.mkdirSync(path.join(dojoDir, "tasks", "unassigned"), { recursive: true });
    fs.mkdirSync(path.join(dojoDir, "tasks", "completed"), { recursive: true });
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

  it("should block writes when no task is focused", () => {
    const result = preToolUseHook({
      tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
      cwd: tempDir,
    });
    expect(result.decision).toBe("block");
    expect(result.reason).toBe("no_current_task");
  });

  it("should allow writes when a task is focused", () => {
    // Create a task file
    fs.writeFileSync(
      path.join(dojoDir, "tasks", "claude", "001-task.md"),
      `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/

## Description
A task
`
    );

    // Update state with current task
    fs.writeFileSync(
      path.join(dojoDir, "state.json"),
      JSON.stringify({
        session: {
          startedAt: new Date().toISOString(),
          currentTask: "001-task.md",
        },
      })
    );

    const result = preToolUseHook({
      tool: {
        name: "Write",
        input: { file_path: path.join(tempDir, "src", "test.ts"), content: "test" },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should handle Edit tool", () => {
    // Create a task and focus it
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

    fs.writeFileSync(
      path.join(dojoDir, "state.json"),
      JSON.stringify({
        session: {
          startedAt: new Date().toISOString(),
          currentTask: "001-task.md",
        },
      })
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
    // Create a task and focus it
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

    fs.writeFileSync(
      path.join(dojoDir, "state.json"),
      JSON.stringify({
        session: {
          startedAt: new Date().toISOString(),
          currentTask: "001-task.md",
        },
      })
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

  describe("ratio enforcement", () => {
    it("should block writes when ratio is below target", () => {
      // Initialize git repo so getLineCounts works
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });

      // Get the HEAD commit hash
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create a git history cache with unhealthy ratio (mode 4 = 50% target)
      // 10 human lines, 100 claude lines = 9% human (below 50%)
      fs.writeFileSync(
        path.join(dojoDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 10,
          claudeLines: 100,
          humanCommits: 1,
          claudeCommits: 10,
        })
      );

      // Create a task and focus it
      fs.writeFileSync(
        path.join(dojoDir, "tasks", "claude", "001-task.md"),
        `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/

## Description
A task
`
      );

      fs.writeFileSync(
        path.join(dojoDir, "state.json"),
        JSON.stringify({
          session: {
            startedAt: new Date().toISOString(),
            currentTask: "001-task.md",
          },
        })
      );

      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: tempDir,
      });

      expect(result.decision).toBe("block");
      expect(result.reason).toBe("ratio_below_target");
      expect(result.message).toContain("below target");
      expect(result.message).toContain("50%");
    });

    it("should allow writes when ratio is healthy", () => {
      // Initialize git repo
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create a git history cache with healthy ratio
      // 60 human lines, 40 claude lines = 60% human (above 50%)
      fs.writeFileSync(
        path.join(dojoDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 60,
          claudeLines: 40,
          humanCommits: 6,
          claudeCommits: 4,
        })
      );

      // Create a task and focus it
      fs.writeFileSync(
        path.join(dojoDir, "tasks", "claude", "001-task.md"),
        `# Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/

## Description
A task
`
      );

      fs.writeFileSync(
        path.join(dojoDir, "state.json"),
        JSON.stringify({
          session: {
            startedAt: new Date().toISOString(),
            currentTask: "001-task.md",
          },
        })
      );

      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: tempDir,
      });

      expect(result.decision).toBe("allow");
    });

    it("should suggest human tasks when ratio is unhealthy", () => {
      // Initialize git repo
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create unhealthy ratio
      fs.writeFileSync(
        path.join(dojoDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 0,
          claudeLines: 100,
          humanCommits: 0,
          claudeCommits: 10,
        })
      );

      // Create a human task
      fs.writeFileSync(
        path.join(dojoDir, "tasks", "human", "001-human-task.md"),
        `# Human Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/

## Description
A task for the human
`
      );

      // Focus a Claude task
      fs.writeFileSync(
        path.join(dojoDir, "tasks", "claude", "002-claude-task.md"),
        `# Claude Task

## Metadata
**Difficulty**: easy
**Category**: feature
**Skills**: typescript
**Files**: src/

## Description
A task
`
      );

      fs.writeFileSync(
        path.join(dojoDir, "state.json"),
        JSON.stringify({
          session: {
            startedAt: new Date().toISOString(),
            currentTask: "002-claude-task.md",
          },
        })
      );

      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: tempDir,
      });

      expect(result.decision).toBe("block");
      expect(result.reason).toBe("ratio_below_target");
      expect(result.message).toContain("Tasks assigned to human");
      expect(result.message).toContain("001-human-task.md");
    });

    it("should always allow writes to .dojo even with unhealthy ratio", () => {
      // Initialize git repo
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create unhealthy ratio
      fs.writeFileSync(
        path.join(dojoDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 0,
          claudeLines: 100,
          humanCommits: 0,
          claudeCommits: 10,
        })
      );

      const result = preToolUseHook({
        tool: {
          name: "Write",
          input: { file_path: path.join(tempDir, ".dojo", "state.json"), content: "{}" },
        },
        cwd: tempDir,
      });

      expect(result.decision).toBe("allow");
    });
  });
});
