import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  initializeDojo,
  isFullyInitialized,
  ensureInitialized,
} from "../src/init.js";
import { getDojoDir, isDojoInitialized } from "../src/config/loader.js";

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

    it("uses specified mode", async () => {
      const config = await initializeDojo(TEST_DIR, 3);
      expect(config.mode).toBe(3);
    });
  });

  describe("isFullyInitialized", () => {
    it("returns false for empty directory", () => {
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .dojo directory exists", () => {
      fs.mkdirSync(getDojoDir(TEST_DIR), { recursive: true });
      // isFullyInitialized just checks for .dojo directory existence
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
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
  });
});
