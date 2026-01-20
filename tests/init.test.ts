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
    it("creates .dojo directory", async () => {
      await initializeDojo(TEST_DIR, 4);
      expect(fs.existsSync(getDojoDir(TEST_DIR))).toBe(true);
    });

    it("creates config.json", async () => {
      await initializeDojo(TEST_DIR, 4);
      const configPath = path.join(getDojoDir(TEST_DIR), "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("creates state.json", async () => {
      await initializeDojo(TEST_DIR, 4);
      const statePath = path.join(getDojoDir(TEST_DIR), "state.json");
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it("creates task directories", async () => {
      await initializeDojo(TEST_DIR, 4);
      const tasksDir = path.join(getDojoDir(TEST_DIR), "tasks");

      for (const dir of Object.values(TASK_DIRS)) {
        expect(fs.existsSync(path.join(tasksDir, dir))).toBe(true);
      }
    });

    it("creates .gitignore", async () => {
      await initializeDojo(TEST_DIR, 4);
      const gitignorePath = path.join(getDojoDir(TEST_DIR), ".gitignore");
      expect(fs.existsSync(gitignorePath)).toBe(true);

      const content = fs.readFileSync(gitignorePath, "utf-8");
      expect(content).toContain("state.json");
    });

    it("uses specified mode", async () => {
      const config = await initializeDojo(TEST_DIR, 3);
      expect(config.mode).toBe(3);
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

    it("returns true after full initialization", async () => {
      await initializeDojo(TEST_DIR, 4);
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("ensureInitialized", () => {
    it("initializes if not already done", async () => {
      const config = await ensureInitialized(TEST_DIR, 4);

      expect(isFullyInitialized(TEST_DIR)).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it("returns existing config if already initialized", async () => {
      await initializeDojo(TEST_DIR, 5);

      const config = await ensureInitialized(TEST_DIR);

      expect(config.mode).toBe(5);
    });
  });

  describe("Component checks", () => {
    it("isDojoInitialized checks .dojo directory", () => {
      expect(isDojoInitialized(TEST_DIR)).toBe(false);

      fs.mkdirSync(getDojoDir(TEST_DIR), { recursive: true });

      expect(isDojoInitialized(TEST_DIR)).toBe(true);
    });

    it("areTaskDirsInitialized checks all task directories", async () => {
      expect(areTaskDirsInitialized(TEST_DIR)).toBe(false);

      await initializeDojo(TEST_DIR, 4);

      expect(areTaskDirsInitialized(TEST_DIR)).toBe(true);
    });
  });
});
