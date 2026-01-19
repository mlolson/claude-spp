import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeDojo } from "../src/init.js";
import {
  createTask,
  generateFilename,
  getNextTaskId,
  generateTaskContent,
  TASK_TEMPLATES,
} from "../src/tasks/generator.js";
import { listTaskFiles } from "../src/tasks/directories.js";

const TEST_DIR = path.join(process.cwd(), ".test-task-generator");

describe("Task Generator", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    initializeDojo(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("Filename Generation", () => {
    it("generates correct filename with padded ID", () => {
      expect(generateFilename(1, "Add User Auth")).toBe("001-add-user-auth.md");
      expect(generateFilename(42, "Fix Bug")).toBe("042-fix-bug.md");
      expect(generateFilename(100, "Test")).toBe("100-test.md");
    });

    it("removes special characters from title", () => {
      expect(generateFilename(1, "Fix Bug!!!")).toBe("001-fix-bug.md");
      expect(generateFilename(1, "Add @#$ Feature")).toBe("001-add-feature.md");
    });

    it("truncates long titles", () => {
      const longTitle = "This is a very long title that should be truncated to fifty characters";
      const filename = generateFilename(1, longTitle);
      expect(filename.length).toBeLessThanOrEqual(60); // 3 + 1 + 50 + 3 = 57 max
    });
  });

  describe("Task Creation", () => {
    it("creates task file in unassigned directory", () => {
      const result = createTask(TEST_DIR, {
        title: "Test Task",
        description: "A test description",
      });

      expect(result.filename).toBe("001-test-task.md");
      expect(fs.existsSync(result.filepath)).toBe(true);
      expect(listTaskFiles(TEST_DIR, "unassigned")).toContain("001-test-task.md");
    });

    it("auto-increments task ID", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "First" });
      createTask(TEST_DIR, { title: "Task 2", description: "Second" });
      createTask(TEST_DIR, { title: "Task 3", description: "Third" });

      expect(getNextTaskId(TEST_DIR)).toBe(4);
    });

    it("includes all metadata in generated content", () => {
      const content = generateTaskContent({
        title: "My Task",
        description: "Do something important",
        difficulty: "hard",
        category: "feature",
        skills: ["typescript", "react"],
        files: ["src/index.ts"],
      });

      expect(content).toContain("# My Task");
      expect(content).toContain("**Difficulty**: hard");
      expect(content).toContain("**Category**: feature");
      expect(content).toContain("typescript, react");
      expect(content).toContain("src/index.ts");
    });

    it("includes hints as collapsible sections", () => {
      const content = generateTaskContent({
        title: "Task",
        description: "Test",
        hints: ["First hint", "Second hint"],
      });

      expect(content).toContain("<details>");
      expect(content).toContain("First hint");
      expect(content).toContain("Second hint");
    });

    it("includes acceptance criteria as checkboxes", () => {
      const content = generateTaskContent({
        title: "Task",
        description: "Test",
        acceptanceCriteria: ["Criterion 1", "Criterion 2"],
      });

      expect(content).toContain("- [ ] Criterion 1");
      expect(content).toContain("- [ ] Criterion 2");
    });
  });

  describe("Task Templates", () => {
    it("creates feature template", () => {
      const template = TASK_TEMPLATES.feature("Add Login", "Create login form");
      expect(template.category).toBe("feature");
      expect(template.title).toBe("Add Login");
      expect(template.acceptanceCriteria).toContain("Feature implemented as described");
    });

    it("creates bugfix template", () => {
      const template = TASK_TEMPLATES.bugfix("Fix Crash", "App crashes on load");
      expect(template.category).toBe("bugfix");
      expect(template.acceptanceCriteria).toContain("Bug is fixed");
      expect(template.acceptanceCriteria).toContain("Regression test added");
    });

    it("creates refactor template", () => {
      const template = TASK_TEMPLATES.refactor("Clean Up", "Refactor utils");
      expect(template.category).toBe("refactor");
      expect(template.acceptanceCriteria).toContain("No functional changes");
    });

    it("creates test template", () => {
      const template = TASK_TEMPLATES.test("Add Tests", "Write unit tests");
      expect(template.category).toBe("test");
      expect(template.difficulty).toBe("easy");
    });

    it("creates docs template", () => {
      const template = TASK_TEMPLATES.docs("Update Docs", "Document API");
      expect(template.category).toBe("docs");
      expect(template.difficulty).toBe("easy");
    });
  });
});
