import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadState,
  saveState,
  addHumanLines,
  addClaudeLines,
  resetSession,
} from "../src/state/manager.js";
import {
  createDefaultState,
  calculateRatio,
  isRatioHealthy,
  type Session,
} from "../src/state/schema.js";
import { initializeDojo } from "../src/init.js";

const TEST_DIR = path.join(process.cwd(), ".test-state");

describe("State Management", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    initializeDojo(TEST_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("Session Tracking", () => {
    it("returns default state for new project", () => {
      const state = loadState(TEST_DIR);
      expect(state.session.humanLines).toBe(0);
      expect(state.session.claudeLines).toBe(0);
    });

    it("increments human line count", () => {
      addHumanLines(TEST_DIR, 50);
      const state = loadState(TEST_DIR);
      expect(state.session.humanLines).toBe(50);
    });

    it("accumulates human lines across calls", () => {
      addHumanLines(TEST_DIR, 50);
      addHumanLines(TEST_DIR, 30);
      const state = loadState(TEST_DIR);
      expect(state.session.humanLines).toBe(80);
    });

    it("increments claude line count", () => {
      addClaudeLines(TEST_DIR, 100);
      const state = loadState(TEST_DIR);
      expect(state.session.claudeLines).toBe(100);
    });

    it("resets session to zero", () => {
      addHumanLines(TEST_DIR, 50);
      addClaudeLines(TEST_DIR, 100);
      resetSession(TEST_DIR);
      const state = loadState(TEST_DIR);
      expect(state.session.humanLines).toBe(0);
      expect(state.session.claudeLines).toBe(0);
    });
  });

  describe("Ratio Calculation", () => {
    it("returns 1.0 when no work done", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 0,
        claudeLines: 0,
      };
      expect(calculateRatio(session)).toBe(1.0);
    });

    it("calculates correct ratio", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 25,
        claudeLines: 75,
      };
      expect(calculateRatio(session)).toBe(0.25);
    });

    it("returns 1.0 when only human worked", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 100,
        claudeLines: 0,
      };
      expect(calculateRatio(session)).toBe(1.0);
    });

    it("returns 0 when only claude worked", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 0,
        claudeLines: 100,
      };
      expect(calculateRatio(session)).toBe(0);
    });
  });

  describe("Ratio Health Check", () => {
    it("returns true when ratio meets target", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 25,
        claudeLines: 75,
      };
      expect(isRatioHealthy(session, 0.25)).toBe(true);
    });

    it("returns false when ratio below target", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 10,
        claudeLines: 90,
      };
      expect(isRatioHealthy(session, 0.25)).toBe(false);
    });

    it("returns true when ratio exceeds target", () => {
      const session: Session = {
        startedAt: new Date().toISOString(),
        humanLines: 50,
        claudeLines: 50,
      };
      expect(isRatioHealthy(session, 0.25)).toBe(true);
    });
  });
});
