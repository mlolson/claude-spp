import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { initializeDojo } from "../src/init.js";
import { createTask } from "../src/tasks/generator.js";
import { addHumanLines, addClaudeLines } from "../src/state/manager.js";
import {
  canClaudeTakeWork,
  suggestAssignee,
  assignTask,
  autoAssignTask,
  getHumanTasks,
  getClaudeTasks,
  getUnassignedTasks,
  pickTaskForHuman,
  reassignTask,
} from "../src/tasks/assignment.js";

const TEST_DIR = path.join(process.cwd(), ".test-task-assignment");

describe("Task Assignment", () => {
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

  describe("Work Ratio Check", () => {
    it("allows claude when no work has been done", () => {
      const result = canClaudeTakeWork(TEST_DIR);
      expect(result.allowed).toBe(true);
      expect(result.currentRatio).toBe(1.0);
    });

    it("allows claude when ratio is healthy", () => {
      addHumanLines(TEST_DIR, 30);
      addClaudeLines(TEST_DIR, 70);

      const result = canClaudeTakeWork(TEST_DIR);
      expect(result.allowed).toBe(true);
    });

    it("blocks claude when ratio is unhealthy", () => {
      addClaudeLines(TEST_DIR, 100);

      const result = canClaudeTakeWork(TEST_DIR);
      expect(result.allowed).toBe(false);
      expect(result.currentRatio).toBe(0);
    });

    it("returns correct message", () => {
      addClaudeLines(TEST_DIR, 100);

      const result = canClaudeTakeWork(TEST_DIR);
      expect(result.message).toContain("below target");
    });
  });

  describe("Assignee Suggestion", () => {
    it("suggests claude when ratio is healthy", () => {
      expect(suggestAssignee(TEST_DIR)).toBe("claude");
    });

    it("suggests human when ratio is unhealthy", () => {
      addClaudeLines(TEST_DIR, 100);
      expect(suggestAssignee(TEST_DIR)).toBe("human");
    });

    it("suggests claude after human does enough work", () => {
      addClaudeLines(TEST_DIR, 75);
      addHumanLines(TEST_DIR, 25);
      expect(suggestAssignee(TEST_DIR)).toBe("claude");
    });
  });

  describe("Manual Assignment", () => {
    it("assigns task to human", () => {
      createTask(TEST_DIR, { title: "Test", description: "T" });

      const task = assignTask(TEST_DIR, "001-test.md", "human");

      expect(task).not.toBeNull();
      expect(task!.directory).toBe("human");
    });

    it("assigns task to claude", () => {
      createTask(TEST_DIR, { title: "Test", description: "T" });

      const task = assignTask(TEST_DIR, "001-test.md", "claude");

      expect(task).not.toBeNull();
      expect(task!.directory).toBe("claude");
    });

    it("returns null for non-existent task", () => {
      const task = assignTask(TEST_DIR, "does-not-exist.md", "human");
      expect(task).toBeNull();
    });

    it("moves task between assignees", () => {
      createTask(TEST_DIR, { title: "Test", description: "T" });
      assignTask(TEST_DIR, "001-test.md", "human");

      const task = assignTask(TEST_DIR, "001-test.md", "claude");

      expect(task).not.toBeNull();
      expect(task!.directory).toBe("claude");
      expect(getHumanTasks(TEST_DIR)).toHaveLength(0);
      expect(getClaudeTasks(TEST_DIR)).toHaveLength(1);
    });
  });

  describe("Auto Assignment", () => {
    it("auto-assigns to claude when ratio is healthy", () => {
      createTask(TEST_DIR, { title: "Test", description: "T" });

      const result = autoAssignTask(TEST_DIR, "001-test.md");

      expect(result.assignedTo).toBe("claude");
      expect(result.task!.directory).toBe("claude");
    });

    it("auto-assigns to human when ratio is unhealthy", () => {
      addClaudeLines(TEST_DIR, 100);
      createTask(TEST_DIR, { title: "Test", description: "T" });

      const result = autoAssignTask(TEST_DIR, "001-test.md");

      expect(result.assignedTo).toBe("human");
      expect(result.task!.directory).toBe("human");
    });

    it("includes reason in result", () => {
      createTask(TEST_DIR, { title: "Test", description: "T" });

      const result = autoAssignTask(TEST_DIR, "001-test.md");

      expect(result.reason).toBeTruthy();
    });
  });

  describe("Task Getters", () => {
    it("gets human tasks", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      assignTask(TEST_DIR, "001-task-1.md", "human");

      const tasks = getHumanTasks(TEST_DIR);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].filename).toBe("001-task-1.md");
    });

    it("gets claude tasks", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      assignTask(TEST_DIR, "002-task-2.md", "claude");

      const tasks = getClaudeTasks(TEST_DIR);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].filename).toBe("002-task-2.md");
    });

    it("gets unassigned tasks", () => {
      createTask(TEST_DIR, { title: "Task 1", description: "T1" });
      createTask(TEST_DIR, { title: "Task 2", description: "T2" });
      assignTask(TEST_DIR, "001-task-1.md", "human");

      const tasks = getUnassignedTasks(TEST_DIR);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].filename).toBe("002-task-2.md");
    });
  });

  describe("Pick Task for Human", () => {
    it("picks task matching preferred skills", () => {
      createTask(TEST_DIR, {
        title: "React Task",
        description: "R",
        skills: ["react", "typescript"],
      });
      createTask(TEST_DIR, {
        title: "Python Task",
        description: "P",
        skills: ["python"],
      });

      const picked = pickTaskForHuman(TEST_DIR, ["typescript"]);

      expect(picked).not.toBeNull();
      expect(picked!.metadata.skills).toContain("typescript");
    });

    it("assigns picked task to human", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });

      const picked = pickTaskForHuman(TEST_DIR);

      expect(picked!.directory).toBe("human");
      expect(getUnassignedTasks(TEST_DIR)).toHaveLength(0);
    });

    it("returns null when no tasks available", () => {
      const picked = pickTaskForHuman(TEST_DIR);
      expect(picked).toBeNull();
    });
  });

  describe("Reassign Task", () => {
    it("reassigns from human to claude", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "human");

      const task = reassignTask(TEST_DIR, "001-task.md", "human", "claude");

      expect(task).not.toBeNull();
      expect(task!.directory).toBe("claude");
    });

    it("returns null if task not in source directory", () => {
      createTask(TEST_DIR, { title: "Task", description: "T" });
      assignTask(TEST_DIR, "001-task.md", "claude");

      const task = reassignTask(TEST_DIR, "001-task.md", "human", "claude");

      expect(task).toBeNull();
    });
  });
});
