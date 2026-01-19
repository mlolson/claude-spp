import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeDojo } from "../src/init.js";
import { createTask } from "../src/tasks/generator.js";
import { assignTask } from "../src/tasks/assignment.js";
import { loadState } from "../src/state/manager.js";
import { listTaskFiles } from "../src/tasks/directories.js";
import {
  completeTask,
  reopenTask,
  getCompletedTasks,
  getCompletionStats,
} from "../src/tasks/completion.js";

const TEST_DIR = path.join(process.cwd(), ".test-task-completion");

describe("Task Completion", () => {
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

  describe("Complete Task", () => {
    it("moves task to completed directory", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");

      completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "human",
      });

      expect(listTaskFiles(TEST_DIR, "completed")).toContain("001-task.md");
      expect(listTaskFiles(TEST_DIR, "human")).not.toContain("001-task.md");
    });

    it("records completedBy in task", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");

      const result = completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "human",
      });

      expect(result.task!.completionNotes.completedBy).toBe("human");
    });

    it("records completedAt timestamp", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "claude");

      const result = completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "claude",
      });

      expect(result.task!.completionNotes.completedAt).not.toBeNull();
    });

    it("updates line count stats", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");

      completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "human",
        linesOfCode: 75,
      });

      const state = loadState(TEST_DIR);
      expect(state.session.humanLines).toBe(75);
    });

    it("updates claude line count", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "claude");

      completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "claude",
        linesOfCode: 100,
      });

      const state = loadState(TEST_DIR);
      expect(state.session.claudeLines).toBe(100);
    });

    it("returns success result", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");

      const result = completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "human",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("completed");
    });

    it("fails for non-existent task", () => {
      const result = completeTask(TEST_DIR, {
        filename: "does-not-exist.md",
        completedBy: "human",
      });

      expect(result.success).toBe(false);
      expect(result.task).toBeNull();
    });

    it("fails for already completed task", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "human" });

      const result = completeTask(TEST_DIR, {
        filename: "001-task.md",
        completedBy: "human",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already completed");
    });
  });

  describe("Reopen Task", () => {
    it("moves task back to unassigned", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "human" });

      const result = reopenTask(TEST_DIR, "001-task.md");

      expect(result.success).toBe(true);
      expect(result.task!.directory).toBe("unassigned");
    });

    it("clears completion notes", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "human" });

      const result = reopenTask(TEST_DIR, "001-task.md");

      expect(result.task!.completionNotes.completedBy).toBeNull();
      expect(result.task!.completionNotes.completedAt).toBeNull();
    });

    it("fails for non-completed task", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });

      const result = reopenTask(TEST_DIR, "001-task.md");

      expect(result.success).toBe(false);
    });
  });

  describe("Completion Stats", () => {
    it("returns empty stats when no completed tasks", () => {
      const stats = getCompletionStats(TEST_DIR);

      expect(stats.total).toBe(0);
      expect(stats.byHuman).toBe(0);
      expect(stats.byClaude).toBe(0);
    });

    it("counts completed tasks by human", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      assignTask(TEST_DIR, "001-task-1.md", "human");
      assignTask(TEST_DIR, "002-task-2.md", "human");
      completeTask(TEST_DIR, { filename: "001-task-1.md", completedBy: "human" });
      completeTask(TEST_DIR, { filename: "002-task-2.md", completedBy: "human" });

      const stats = getCompletionStats(TEST_DIR);

      expect(stats.total).toBe(2);
      expect(stats.byHuman).toBe(2);
    });

    it("counts completed tasks by claude", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "claude");
      completeTask(TEST_DIR, { filename: "001-task.md", completedBy: "claude" });

      const stats = getCompletionStats(TEST_DIR);

      expect(stats.total).toBe(1);
      expect(stats.byClaude).toBe(1);
    });

    it("separates human and claude completions", () => {
      createTask(TEST_DIR, { title: "Human Task", description: "H" });
      createTask(TEST_DIR, { title: "Claude Task", description: "C" });
      assignTask(TEST_DIR, "001-human-task.md", "human");
      assignTask(TEST_DIR, "002-claude-task.md", "claude");
      completeTask(TEST_DIR, { filename: "001-human-task.md", completedBy: "human" });
      completeTask(TEST_DIR, { filename: "002-claude-task.md", completedBy: "claude" });

      const stats = getCompletionStats(TEST_DIR);

      expect(stats.total).toBe(2);
      expect(stats.byHuman).toBe(1);
      expect(stats.byClaude).toBe(1);
    });
  });

  describe("Get Completed Tasks", () => {
    it("returns empty array when no completed tasks", () => {
      const tasks = getCompletedTasks(TEST_DIR);
      expect(tasks).toHaveLength(0);
    });

    it("returns all completed tasks", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      assignTask(TEST_DIR, "001-task-1.md", "human");
      assignTask(TEST_DIR, "002-task-2.md", "claude");
      completeTask(TEST_DIR, { filename: "001-task-1.md", completedBy: "human" });
      completeTask(TEST_DIR, { filename: "002-task-2.md", completedBy: "claude" });

      const tasks = getCompletedTasks(TEST_DIR);

      expect(tasks).toHaveLength(2);
    });
  });
});
