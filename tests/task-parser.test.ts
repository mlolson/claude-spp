import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeDojo } from "../src/init.js";
import { createTask } from "../src/tasks/generator.js";
import {
  parseTaskFile,
  parseActiveTasks,
  parseAllTasks,
  findTask,
} from "../src/tasks/parser.js";
import { moveTask } from "../src/tasks/directories.js";
import { assignTask } from "../src/tasks/assignment.js";
import { completeTask } from "../src/tasks/completion.js";

const TEST_DIR = path.join(process.cwd(), ".test-task-parser");

describe("Task Parser", () => {
  beforeEach(async () => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    await initializeDojo(TEST_DIR, 4);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("Metadata Parsing", () => {
    it("parses task title", () => {
      createTask(TEST_DIR, { title: "My Task Title", description: "Test" });
      const task = parseTaskFile(TEST_DIR, "001-my-task-title.md", "unassigned");
      expect(task.title).toBe("My Task Title");
    });

    it("parses difficulty level", () => {
      createTask(TEST_DIR, { title: "Task", description: "T", difficulty: "hard" });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.metadata.difficulty).toBe("hard");
    });

    it("parses category", () => {
      createTask(TEST_DIR, { title: "Task", description: "T", category: "bugfix" });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.metadata.category).toBe("bugfix");
    });

    it("parses skills list", () => {
      createTask(TEST_DIR, {
        title: "Task",
        description: "T",
        skills: ["typescript", "react", "node"],
      });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.metadata.skills).toContain("typescript");
      expect(task.metadata.skills).toContain("react");
      expect(task.metadata.skills).toContain("node");
    });

    it("parses files list", () => {
      createTask(TEST_DIR, {
        title: "Task",
        description: "T",
        files: ["src/index.ts", "src/utils.ts"],
      });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.metadata.files).toContain("src/index.ts");
      expect(task.metadata.files).toContain("src/utils.ts");
    });
  });

  describe("Content Parsing", () => {
    it("parses description", () => {
      createTask(TEST_DIR, {
        title: "Task",
        description: "This is the task description.\nWith multiple lines.",
      });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.description).toContain("This is the task description");
    });

    it("parses hints", () => {
      createTask(TEST_DIR, {
        title: "Task",
        description: "T",
        hints: ["First hint", "Second hint"],
      });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.hints).toHaveLength(2);
      expect(task.hints[0]).toBe("First hint");
      expect(task.hints[1]).toBe("Second hint");
    });

    it("parses acceptance criteria", () => {
      createTask(TEST_DIR, {
        title: "Task",
        description: "T",
        acceptanceCriteria: ["First criterion", "Second criterion"],
      });
      const task = parseTaskFile(TEST_DIR, "001-task.md", "unassigned");
      expect(task.acceptanceCriteria).toHaveLength(2);
      expect(task.acceptanceCriteria[0].text).toBe("First criterion");
      expect(task.acceptanceCriteria[0].completed).toBe(false);
    });

    it("parses completed criteria", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "human" });

      const task = parseTaskFile(TEST_DIR, "001-task.md", "completed");
      // After completion, criteria should be marked complete
      expect(task.acceptanceCriteria.every(c => c.completed)).toBe(true);
    });
  });

  describe("Completion Notes Parsing", () => {
    it("parses completedBy field", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "human" });

      const task = parseTaskFile(TEST_DIR, "001-task.md", "completed");
      expect(task.completionNotes.completedBy).toBe("human");
    });

    it("parses completedAt timestamp", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "claude");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "claude" });

      const task = parseTaskFile(TEST_DIR, "001-task.md", "completed");
      expect(task.completionNotes.completedAt).not.toBeNull();
    });
  });

  describe("Task Finding", () => {
    it("finds task in unassigned directory", () => {
      createTask(TEST_DIR, { title: "Find Me", description: "T" });
      const found = findTask(TEST_DIR, "001-find-me.md");
      expect(found).not.toBeNull();
      expect(found!.directory).toBe("unassigned");
    });

    it("finds task in human directory", () => {
      createTask(TEST_DIR, { title: "Find Me", description: "T" });
      moveTask(TEST_DIR, "001-find-me.md", "unassigned", "human");

      const found = findTask(TEST_DIR, "001-find-me.md");
      expect(found).not.toBeNull();
      expect(found!.directory).toBe("human");
    });

    it("finds task in completed directory", () => {
      createTask(TEST_DIR, { title: "Find Me", description: "T" });
      assignTask(TEST_DIR, "001-find-me.md", "human");
      completeTask(TEST_DIR, { filename: "001-find-me.md", completedBy: "human" });

      const found = findTask(TEST_DIR, "001-find-me.md");
      expect(found).not.toBeNull();
      expect(found!.directory).toBe("completed");
    });

    it("returns null for non-existent task", () => {
      const found = findTask(TEST_DIR, "does-not-exist.md");
      expect(found).toBeNull();
    });
  });

  describe("Bulk Parsing", () => {
    it("returns all active tasks", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      createTask(TEST_DIR, { title: "Task 3", description: "T3" });

      assignTask(TEST_DIR, "001-task-1.md", "human");
      assignTask(TEST_DIR, "002-task-2.md", "claude");

      const active = parseActiveTasks(TEST_DIR);
      expect(active).toHaveLength(3);
    });

    it("excludes completed tasks from active", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });

      assignTask(TEST_DIR, "001-task-1.md", "human");
      completeTask(TEST_DIR, { filename: "001-task-1.md", completedBy: "human" });

      const active = parseActiveTasks(TEST_DIR);
      expect(active).toHaveLength(1);
    });

    it("returns all tasks including completed", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });

      assignTask(TEST_DIR, "001-task-1.md", "human");
      completeTask(TEST_DIR, { filename: "001-task-1.md", completedBy: "human" });

      const all = parseAllTasks(TEST_DIR);
      expect(all).toHaveLength(2);
    });
  });
});
