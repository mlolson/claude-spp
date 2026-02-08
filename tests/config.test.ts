import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadConfig,
  saveConfig,
  isSppInitialized,
  getSppDir,
} from "../src/config/loader.js";
import {
  DEFAULT_CONFIG,
  getTargetRatio,
  getModeTypeName,
  getModeTypeDescription,
  type Config,
  type StatsWindow,
} from "../src/config/schema.js";

const TEST_DIR = path.join(process.cwd(), ".test-config");

describe("Configuration", () => {
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

  describe("loadConfig", () => {
    it("returns default config when no config file exists", () => {
      const config = loadConfig(TEST_DIR);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it("loads config from file", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: false, modeType: "weeklyGoal", goalType: "commits" })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.enabled).toBe(false);
      expect(config.modeType).toBe("weeklyGoal");
    });

    it("throws on invalid JSON", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(path.join(stpDir, "config.json"), "not json");

      expect(() => loadConfig(TEST_DIR)).toThrow("Invalid JSON");
    });
  });

  describe("saveConfig", () => {
    it("creates .claude-spp directory if needed", () => {
      saveConfig(TEST_DIR, DEFAULT_CONFIG);
      expect(fs.existsSync(getSppDir(TEST_DIR))).toBe(true);
    });

    it("writes valid JSON", () => {
      saveConfig(TEST_DIR, { ...DEFAULT_CONFIG, modeType: "pairProgramming" });
      const content = fs.readFileSync(
        path.join(getSppDir(TEST_DIR), "config.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);
      expect(parsed.modeType).toBe("pairProgramming");
    });
  });

  describe("isSppInitialized", () => {
    it("returns false when .claude-spp does not exist", () => {
      expect(isSppInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .claude-spp exists", () => {
      fs.mkdirSync(getSppDir(TEST_DIR), { recursive: true });
      expect(isSppInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("Mode types", () => {
    it("has correct default config values", () => {
      expect(DEFAULT_CONFIG.modeType).toBe("weeklyGoal");
      expect(DEFAULT_CONFIG.goalType).toBe("commits");
      expect(DEFAULT_CONFIG.weeklyCommitGoal).toBe(5);
      expect(DEFAULT_CONFIG.targetPercentage).toBe(25);
    });

    it("getModeTypeName returns correct names", () => {
      expect(getModeTypeName("weeklyGoal")).toBe("Weekly Goal");
      expect(getModeTypeName("pairProgramming")).toBe("Pair Programming");
      expect(getModeTypeName("learningProject")).toBe("Learning Project");
    });

    it("getModeTypeDescription for weekly goal commits", () => {
      const config: Config = { ...DEFAULT_CONFIG, modeType: "weeklyGoal", goalType: "commits", weeklyCommitGoal: 5 };
      expect(getModeTypeDescription(config)).toBe("Weekly Goal (5 commits/week)");
    });

    it("getModeTypeDescription for weekly goal percentage", () => {
      const config: Config = { ...DEFAULT_CONFIG, modeType: "weeklyGoal", goalType: "percentage", targetPercentage: 25, trackingMode: "commits" };
      expect(getModeTypeDescription(config)).toBe("Weekly Goal (25% human, commits)");
    });

    it("getModeTypeDescription for pair programming", () => {
      const config: Config = { ...DEFAULT_CONFIG, modeType: "pairProgramming" };
      expect(getModeTypeDescription(config)).toBe("Pair Programming");
    });

    it("getModeTypeDescription for learning project", () => {
      const config: Config = { ...DEFAULT_CONFIG, modeType: "learningProject" };
      expect(getModeTypeDescription(config)).toBe("Learning Project (coming soon)");
    });

    it("getTargetRatio for percentage mode", () => {
      const config: Config = { ...DEFAULT_CONFIG, modeType: "weeklyGoal", goalType: "percentage", targetPercentage: 50 };
      expect(getTargetRatio(config)).toBe(0.5);
    });

    it("getTargetRatio returns 0 for non-percentage modes", () => {
      expect(getTargetRatio({ ...DEFAULT_CONFIG, modeType: "weeklyGoal", goalType: "commits" })).toBe(0);
      expect(getTargetRatio({ ...DEFAULT_CONFIG, modeType: "pairProgramming" })).toBe(0);
      expect(getTargetRatio({ ...DEFAULT_CONFIG, modeType: "learningProject" })).toBe(0);
    });
  });

  describe("Config migration", () => {
    it("migrates old mode 3 (Clever monkey 25%) to weeklyGoal percentage 25%", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, mode: 3 })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.goalType).toBe("percentage");
      expect(config.targetPercentage).toBe(25);
      // Old mode field should be gone
      expect((config as Record<string, unknown>).mode).toBeUndefined();
    });

    it("migrates old mode 4 (Wise monkey 50%) to weeklyGoal percentage 50%", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, mode: 4 })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.goalType).toBe("percentage");
      expect(config.targetPercentage).toBe(50);
    });

    it("migrates old mode 1 (Lazy monkey 0%) to weeklyGoal percentage 10%", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, mode: 1 })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.goalType).toBe("percentage");
      expect(config.targetPercentage).toBe(10);
    });

    it("migrates old mode 5 (Crazy monkey 100%) to weeklyGoal percentage 100%", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, mode: 5 })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.modeType).toBe("weeklyGoal");
      expect(config.goalType).toBe("percentage");
      expect(config.targetPercentage).toBe(100);
    });

    it("writes migrated config back to disk", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, mode: 3 })
      );

      loadConfig(TEST_DIR);

      // Read again - should load new format without triggering migration
      const raw = fs.readFileSync(path.join(stpDir, "config.json"), "utf-8");
      const json = JSON.parse(raw);
      expect(json.modeType).toBe("weeklyGoal");
      expect(json.mode).toBeUndefined();
    });

    it("does not migrate if modeType already exists", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: true, modeType: "pairProgramming" })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.modeType).toBe("pairProgramming");
    });
  });

  describe("statsWindow", () => {
    it("defaults to oneWeek", () => {
      expect(DEFAULT_CONFIG.statsWindow).toBe("oneWeek");
    });

    it("persists different statsWindow values", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });

      const config: Config = { ...DEFAULT_CONFIG, statsWindow: "oneDay" };
      saveConfig(TEST_DIR, config);

      const loaded = loadConfig(TEST_DIR);
      expect(loaded.statsWindow).toBe("oneDay");
    });

    it("persists allTime statsWindow", () => {
      const stpDir = getSppDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });

      const config: Config = { ...DEFAULT_CONFIG, statsWindow: "allTime" };
      saveConfig(TEST_DIR, config);

      const loaded = loadConfig(TEST_DIR);
      expect(loaded.statsWindow).toBe("allTime");
    });
  });
});
