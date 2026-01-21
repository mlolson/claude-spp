import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadConfig,
  saveConfig,
  isStpInitialized,
  getStpDir,
} from "../src/config/loader.js";
import {
  DEFAULT_CONFIG,
  MODES,
  getEffectiveRatio,
  getCurrentMode,
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
      const stpDir = getStpDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(
        path.join(stpDir, "config.json"),
        JSON.stringify({ enabled: false, mode: 3 })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.enabled).toBe(false);
      expect(config.mode).toBe(3);
    });

    it("throws on invalid JSON", () => {
      const stpDir = getStpDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });
      fs.writeFileSync(path.join(stpDir, "config.json"), "not json");

      expect(() => loadConfig(TEST_DIR)).toThrow("Invalid JSON");
    });
  });

  describe("saveConfig", () => {
    it("creates .stp directory if needed", () => {
      saveConfig(TEST_DIR, DEFAULT_CONFIG);
      expect(fs.existsSync(getStpDir(TEST_DIR))).toBe(true);
    });

    it("writes valid JSON", () => {
      saveConfig(TEST_DIR, { ...DEFAULT_CONFIG, mode: 5 });
      const content = fs.readFileSync(
        path.join(getStpDir(TEST_DIR), "config.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);
      expect(parsed.mode).toBe(5);
    });
  });

  describe("isStpInitialized", () => {
    it("returns false when .stp does not exist", () => {
      expect(isStpInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .stp exists", () => {
      fs.mkdirSync(getStpDir(TEST_DIR), { recursive: true });
      expect(isStpInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("Modes", () => {
    it("returns mode ratio when no custom ratio", () => {
      const config: Config = { ...DEFAULT_CONFIG, mode: 4 };
      expect(getEffectiveRatio(config)).toBe(0.5); // 50-50 mode
    });

    it("returns custom ratio when set", () => {
      const config: Config = { ...DEFAULT_CONFIG, humanWorkRatio: 0.4 };
      expect(getEffectiveRatio(config)).toBe(0.4);
    });

    it("has correct mode values", () => {
      expect(MODES[0].humanRatio).toBe(0);     // Yolo
      expect(MODES[1].humanRatio).toBe(0.1);   // Padawan
      expect(MODES[2].humanRatio).toBe(0.25);  // Clever monkey
      expect(MODES[3].humanRatio).toBe(0.5);   // 50-50
      expect(MODES[4].humanRatio).toBe(0.75);  // Finger workout
      expect(MODES[5].humanRatio).toBe(1);     // Switching to guns
    });

    it("getCurrentMode returns correct mode", () => {
      const config: Config = { ...DEFAULT_CONFIG, mode: 3 };
      const mode = getCurrentMode(config);
      expect(mode.name).toBe("Clever monkey");
      expect(mode.humanRatio).toBe(0.25);
    });
  });

  describe("statsWindow", () => {
    it("defaults to oneWeek", () => {
      expect(DEFAULT_CONFIG.statsWindow).toBe("oneWeek");
    });

    it("persists different statsWindow values", () => {
      const stpDir = getStpDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });

      const config: Config = { ...DEFAULT_CONFIG, statsWindow: "oneDay" };
      saveConfig(TEST_DIR, config);

      const loaded = loadConfig(TEST_DIR);
      expect(loaded.statsWindow).toBe("oneDay");
    });

    it("persists allTime statsWindow", () => {
      const stpDir = getStpDir(TEST_DIR);
      fs.mkdirSync(stpDir, { recursive: true });

      const config: Config = { ...DEFAULT_CONFIG, statsWindow: "allTime" };
      saveConfig(TEST_DIR, config);

      const loaded = loadConfig(TEST_DIR);
      expect(loaded.statsWindow).toBe("allTime");
    });
  });
});
