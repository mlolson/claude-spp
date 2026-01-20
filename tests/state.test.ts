import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadState,
  saveState,
} from "../src/state/manager.js";
import {
  createDefaultState,
  calculateRatio,
  isRatioHealthy,
} from "../src/state/schema.js";
import { initializeDojo } from "../src/init.js";

const TEST_DIR = path.join(process.cwd(), ".test-state");

describe("State Management", () => {
  beforeEach(async () => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    await initializeDojo(TEST_DIR, 4); // Mode 4 = 50-50
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("Session Tracking", () => {
    it("returns default state for new project", () => {
      const state = loadState(TEST_DIR);
      expect(state.session.startedAt).toBeDefined();
    });

    it("saves and loads state correctly", () => {
      const state = loadState(TEST_DIR);
      const newStartedAt = new Date().toISOString();
      state.session.startedAt = newStartedAt;
      saveState(TEST_DIR, state);

      const loaded = loadState(TEST_DIR);
      expect(loaded.session.startedAt).toBe(newStartedAt);
    });
  });

  describe("Ratio Calculation", () => {
    it("returns 1.0 when no work done", () => {
      expect(calculateRatio(0, 0)).toBe(1.0);
    });

    it("calculates correct ratio", () => {
      expect(calculateRatio(25, 75)).toBe(0.25);
    });

    it("returns 1.0 when only human worked", () => {
      expect(calculateRatio(100, 0)).toBe(1.0);
    });

    it("returns 0 when only claude worked", () => {
      expect(calculateRatio(0, 100)).toBe(0);
    });
  });

  describe("Ratio Health Check", () => {
    it("returns true when ratio meets target", () => {
      expect(isRatioHealthy(25, 75, 0.25)).toBe(true);
    });

    it("returns false when ratio below target", () => {
      expect(isRatioHealthy(10, 90, 0.25)).toBe(false);
    });

    it("returns true when ratio exceeds target", () => {
      expect(isRatioHealthy(50, 50, 0.25)).toBe(true);
    });
  });
});
