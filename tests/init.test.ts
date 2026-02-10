import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  initializeSpp,
  isFullyInitialized,
  ensureInitialized,
} from "../src/init.js";
import { getSppDir, isSppInitialized } from "../src/config/loader.js";

const TEST_DIR = path.join(process.cwd(), ".test-init");

// Skip global install check in tests
beforeAll(() => {
  process.env.SPP_SKIP_GLOBAL_CHECK = "1";
});

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
    fs.writeFileSync(path.join(hooksDir, "post-commit"), "# <SPP>\n# SPP post-commit hook\n# </SPP>\n");
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("initializeSpp", () => {
    it("creates .claude-spp directory", async () => {
      await initializeSpp(TEST_DIR, { modeType: "weeklyGoal", targetPercentage: 25, trackingMode: "commits", vcsType: "git" });
      expect(fs.existsSync(getSppDir(TEST_DIR))).toBe(true);
    });

    it("creates config.json", async () => {
      await initializeSpp(TEST_DIR, { modeType: "weeklyGoal", targetPercentage: 25, trackingMode: "commits", vcsType: "git" });
      const configPath = path.join(getSppDir(TEST_DIR), "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("uses weekly goal mode with percentage target", async () => {
      const config = await initializeSpp(TEST_DIR, { modeType: "weeklyGoal", targetPercentage: 25, trackingMode: "commits", vcsType: "git" });
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.targetPercentage).toBe(25);
    });

    it("supports custom percentage target", async () => {
      const config = await initializeSpp(TEST_DIR, {
        modeType: "weeklyGoal",
        targetPercentage: 50,
        trackingMode: "commits",
        vcsType: "git",
      });
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.targetPercentage).toBe(50);
    });

    it("uses specified statsWindow", async () => {
      const config = await initializeSpp(TEST_DIR, {
        modeType: "weeklyGoal",
        targetPercentage: 25,
        trackingMode: "commits",
        statsWindow: "oneDay",
        vcsType: "git",
      });
      expect(config.statsWindow).toBe("oneDay");
    });
  });

  describe("isFullyInitialized", () => {
    it("returns false for empty directory", () => {
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .claude-spp directory exists", () => {
      fs.mkdirSync(getSppDir(TEST_DIR), { recursive: true });
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });

    it("returns true after full initialization", async () => {
      await initializeSpp(TEST_DIR, { modeType: "weeklyGoal", targetPercentage: 25, trackingMode: "commits", vcsType: "git" });
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("ensureInitialized", () => {
    it("initializes if not already done", async () => {
      const config = await ensureInitialized(TEST_DIR, { modeType: "weeklyGoal", targetPercentage: 25, trackingMode: "commits", vcsType: "git" });

      expect(isFullyInitialized(TEST_DIR)).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it("returns existing config if already initialized", async () => {
      await initializeSpp(TEST_DIR, {
        modeType: "weeklyGoal",
        targetPercentage: 50,
        trackingMode: "commits",
        statsWindow: "allTime",
        vcsType: "git",
      });

      const config = await ensureInitialized(TEST_DIR);

      expect(config.modeType).toBe("weeklyGoal");
      expect(config.targetPercentage).toBe(50);
      expect(config.statsWindow).toBe("allTime");
    });
  });

  describe("Component checks", () => {
    it("isSppInitialized checks .claude-spp directory", () => {
      expect(isSppInitialized(TEST_DIR)).toBe(false);

      fs.mkdirSync(getSppDir(TEST_DIR), { recursive: true });

      expect(isSppInitialized(TEST_DIR)).toBe(true);
    });
  });
});
