import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
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
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("initializeStp", () => {
    it("creates .stp directory", async () => {
      await initializeStp(TEST_DIR, 4);
      expect(fs.existsSync(getStpDir(TEST_DIR))).toBe(true);
    });

    it("creates config.json", async () => {
      await initializeStp(TEST_DIR, 4);
      const configPath = path.join(getStpDir(TEST_DIR), "config.json");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("uses specified mode", async () => {
      const config = await initializeStp(TEST_DIR, 3);
      expect(config.mode).toBe(3);
    });
  });

  describe("isFullyInitialized", () => {
    it("returns false for empty directory", () => {
      expect(isFullyInitialized(TEST_DIR)).toBe(false);
    });

    it("returns true when .stp directory exists", () => {
      fs.mkdirSync(getStpDir(TEST_DIR), { recursive: true });
      // isFullyInitialized just checks for .stp directory existence
      expect(isFullyInitialized(TEST_DIR)).toBe(true);
    });

    it("returns true after full initialization", async () => {
      await initializeStp(TEST_DIR, 4);
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
      await initializeStp(TEST_DIR, 5);

      const config = await ensureInitialized(TEST_DIR);

      expect(config.mode).toBe(5);
    });
  });

  describe("Component checks", () => {
    it("isStpInitialized checks .stp directory", () => {
      expect(isStpInitialized(TEST_DIR)).toBe(false);

      fs.mkdirSync(getStpDir(TEST_DIR), { recursive: true });

      expect(isStpInitialized(TEST_DIR)).toBe(true);
    });
  });
});
