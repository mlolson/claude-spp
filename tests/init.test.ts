import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  initializeDojo,
  isFullyInitialized,
  ensureInitialized,
} from "../src/init.js";
import { getDojoDir, isDojoInitialized } from "../src/config/loader.js";
import { areTaskDirsInitialized, TASK_DIRS } from "../src/tasks/directories.js";

const TEST_DIR = path.join(process.cwd(), ".test-init");

describe("Initialization", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("initializeDojo", () => {
    it("creates .dojo directory", () => {
      initializeDojo(TEST_DIR);
      expect(fs.existsSync(getDojoDir(TEST_DIR))).toBe(true);
    });

    it("creates config.json", () => {
      initializeDojo(TEST_DIR);
      const configPath = path.join(getDojoDir(TEST_DIR), "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("creates state.json", () => {
      initializeDojo(TEST_DIR);
      const statePath = path.join(getDojoDir(TEST_DIR), "state.json");
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it("creates task directories", () => {
      initializeDojo(TEST_DIR);
      const tasksDir = path.join(getDojoDir(TEST_DIR), "tasks");

      for (const dir of Object.values(TASK_DIRS)) {
        expect(fs.existsSync(path.join(tasksDir, dir))).toBe(true);
      }
    });

    it("creates .gitignore", () => {
      initializeDojo(TEST_DIR);
      const gitignorePath = path.join(getDojoDir(TEST_DIR), ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("state.json");
    });

    it("uses default preset when none specified", () => {
      const config = initializeDojo(TEST_DIR);
      expect(config.preset).toBe("balanced");
    });

    it("uses specified preset", () => {
      const config = initializeDojo(TEST_DIR, "intensive");
      expect(config.preset).toBe("intensive");
    });
  });

  describe("isFullyInitialized", () => {
    it("returns false for empty directory", () => {
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns false when only .dojo exists", () => {
      fs.mkdirSync(getDojoDir(TEST_DIR), { recursive: true });
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true after full initialization", () => {
      initializeDojo(TEST_DIR);
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("ensureInitialized", () => {
    it("initializes if not already done", () => {
      const config = ensureInitialized(TEST_DIR);

      expect(isFullyInitialized(TEST_DIR)).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it("returns existing config if already initialized", () => {
      initializeDojo(TEST_DIR, "training");

      const config = ensureInitialized(TEST_DIR);

      expect(config.preset).toBe("training");
    });
  });

  describe("Component checks", () => {
    it("isDojoInitialized checks .dojo directory", () => {
      expect(isDojoInitialized(TEST_DIR)).toBe(false);

      fs.mkdirSync(getDojoDir(TEST_DIR), { recursive: true });

      expect(isDojoInitialized(TEST_DIR)).toBe(true);
    });

    it("areTaskDirsInitialized checks all task directories", () => {
      expect(areTaskDirsInitialized(TEST_DIR)).toBe(false);

      initializeDojo(TEST_DIR);

      expect(areTaskDirsInitialized(TEST_DIR)).toBe(true);
    });
  });
});
