import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  initializeStp,
  isFullyInitialized,
  ensureInitialized,
} from "../src/init.js";
import { getStpDir, isStpInitialized } from "../src/config/loader.js";

const TEST_DIR = path.join(process.cwd(), ".test-init");

describe("Initialization", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Initialize git repo (required for installGitHook)
    execSync("git init", { cwd: TEST_DIR, stdio: "ignore" });
    execSync("git config user.email 'test@test.com'", { cwd: TEST_DIR, stdio: "ignore" });
    execSync("git config user.name 'Test'", { cwd: TEST_DIR, stdio: "ignore" });

    // Create the source hook file that installGitHook expects
    const hooksDir = path.join(TEST_DIR, "src", "git", "hooks");
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.writeFileSync(path.join(hooksDir, "post-commit"), "# <STP>\n# STP post-commit hook\n# </STP>\n");
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("initializeStp", () => {
    it("creates .claude-stp directory", async () => {
      await initializeStp(TEST_DIR, 4, "oneWeek", "commits");
      expect(fs.existsSync(getStpDir(TEST_DIR))).toBe(true);
    });

    it("creates config.json", async () => {
      await initializeStp(TEST_DIR, 4, "oneWeek", "commits");
      const configPath = path.join(getStpDir(TEST_DIR), "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("uses specified mode", async () => {
      const config = await initializeStp(TEST_DIR, 3, "oneWeek", "commits");
      expect(config.mode).toBe(3);
    });

    it("uses specified statsWindow", async () => {
      const config = await initializeStp(TEST_DIR, 4, "oneDay", "commits");
      expect(config.statsWindow).toBe("oneDay");
    });
  });

  describe("isFullyInitialized", () => {
    it("returns false for empty directory", () => {
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .claude-stp directory exists", () => {
      fs.mkdirSync(getStpDir(TEST_DIR), { recursive: true });
      // isFullyInitialized just checks for .claude-stp directory existence
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });

    it("returns true after full initialization", async () => {
      await initializeStp(TEST_DIR, 4, "oneWeek", "commits");
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("ensureInitialized", () => {
    it("initializes if not already done", async () => {
      const config = await ensureInitialized(TEST_DIR, 4, "oneWeek", "commits");

      expect(isFullyInitialized(TEST_DIR)).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it("returns existing config if already initialized", async () => {
      await initializeStp(TEST_DIR, 5, "allTime", "commits");

      const config = await ensureInitialized(TEST_DIR);

      expect(config.mode).toBe(5);
      expect(config.statsWindow).toBe("allTime");
    });
  });

  describe("Component checks", () => {
    it("isStpInitialized checks .claude-stp directory", () => {
      expect(isStpInitialized(TEST_DIR)).toBe(false);

      fs.mkdirSync(getStpDir(TEST_DIR), { recursive: true });

      expect(isStpInitialized(TEST_DIR)).toBe(true);
    });
  });
});
