import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadConfig,
  saveConfig,
  isDojoInitialized,
  getDojoDir,
} from "../src/config/loader.js";
import {
  DEFAULT_CONFIG,
  PRESET_RATIOS,
  getEffectiveRatio,
  type Config,
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
      const dojoDir = getDojoDir(TEST_DIR);
      fs.mkdirSync(dojoDir, { recursive: true });
      fs.writeFileSync(
        path.join(dojoDir, "config.json"),
        JSON.stringify({ enabled: false, preset: "intensive" })
      );

      const config = loadConfig(TEST_DIR);
      expect(config.enabled).toBe(false);
      expect(config.preset).toBe("intensive");
    });

    it("throws on invalid JSON", () => {
      const dojoDir = getDojoDir(TEST_DIR);
      fs.mkdirSync(dojoDir, { recursive: true });
      fs.writeFileSync(path.join(dojoDir, "config.json"), "not json");

      expect(() => loadConfig(TEST_DIR)).toThrow("Invalid JSON");
    });
  });

  describe("saveConfig", () => {
    it("creates .dojo directory if needed", () => {
      saveConfig(TEST_DIR, DEFAULT_CONFIG);
      expect(fs.existsSync(getDojoDir(TEST_DIR))).toBe(true);
    });

    it("writes valid JSON", () => {
      saveConfig(TEST_DIR, { ...DEFAULT_CONFIG, preset: "training" });
      const content = fs.readFileSync(
        path.join(getDojoDir(TEST_DIR), "config.json"),
        "utf-8"
      );
      const parsed = JSON.parse(content);
      expect(parsed.preset).toBe("training");
    });
  });

  describe("isDojoInitialized", () => {
    it("returns false when .dojo does not exist", () => {
      expect(isDojoInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .dojo exists", () => {
      fs.mkdirSync(getDojoDir(TEST_DIR), { recursive: true });
      expect(isDojoInitialized(TEST_DIR)).toBe(true);
    });
  });

  describe("Presets", () => {
    it("returns preset ratio when no custom ratio", () => {
      const config: Config = { ...DEFAULT_CONFIG, preset: "balanced" };
      expect(getEffectiveRatio(config)).toBe(PRESET_RATIOS.balanced);
    });

    it("returns custom ratio when set", () => {
      const config: Config = { ...DEFAULT_CONFIG, humanWorkRatio: 0.4 };
      expect(getEffectiveRatio(config)).toBe(0.4);
    });

    it("has correct preset values", () => {
      expect(PRESET_RATIOS.light).toBe(0.1);
      expect(PRESET_RATIOS.balanced).toBe(0.25);
      expect(PRESET_RATIOS.intensive).toBe(0.5);
      expect(PRESET_RATIOS.training).toBe(0.75);
    });
  });
});
