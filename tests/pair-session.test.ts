import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  hasPairSession,
  loadPairSession,
  startPairSession,
  endPairSession,
  rotateDriver,
  recordContribution,
  shouldSuggestRotation,
  formatPairSession,
  formatSessionSummary,
  otherDriver,
} from "../src/pair-session.js";

describe("Pair Session", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-pair-test-"));
    fs.mkdirSync(path.join(testDir, ".claude-spp"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("hasPairSession", () => {
    it("returns false when no session exists", () => {
      expect(hasPairSession(testDir)).toBe(false);
    });

    it("returns true when session exists", () => {
      startPairSession(testDir, "Test task");
      expect(hasPairSession(testDir)).toBe(true);
    });
  });

  describe("startPairSession", () => {
    it("creates a new session with defaults", () => {
      const session = startPairSession(testDir, "Build a feature");
      expect(session.task).toBe("Build a feature");
      expect(session.driver).toBe("claude");
      expect(session.claudeContributions).toBe(0);
      expect(session.humanContributions).toBe(0);
      expect(session.rotationCount).toBe(0);
      expect(session.contributionsSinceRotation).toBe(0);
      expect(session.startedAt).toBeDefined();
    });

    it("allows specifying starting driver", () => {
      const session = startPairSession(testDir, "Task", "human");
      expect(session.driver).toBe("human");
    });
  });

  describe("loadPairSession", () => {
    it("returns null when no session exists", () => {
      expect(loadPairSession(testDir)).toBeNull();
    });

    it("loads existing session", () => {
      startPairSession(testDir, "Test task", "human");
      const loaded = loadPairSession(testDir);
      expect(loaded).not.toBeNull();
      expect(loaded!.task).toBe("Test task");
      expect(loaded!.driver).toBe("human");
    });
  });

  describe("endPairSession", () => {
    it("returns null when no session exists", () => {
      expect(endPairSession(testDir)).toBeNull();
    });

    it("removes session and returns final state", () => {
      startPairSession(testDir, "Test task");
      const ended = endPairSession(testDir);
      expect(ended).not.toBeNull();
      expect(ended!.task).toBe("Test task");
      expect(hasPairSession(testDir)).toBe(false);
    });
  });

  describe("rotateDriver", () => {
    it("returns null when no session exists", () => {
      expect(rotateDriver(testDir)).toBeNull();
    });

    it("switches from claude to human", () => {
      startPairSession(testDir, "Task", "claude");
      const rotated = rotateDriver(testDir);
      expect(rotated!.driver).toBe("human");
      expect(rotated!.rotationCount).toBe(1);
      expect(rotated!.contributionsSinceRotation).toBe(0);
    });

    it("switches from human to claude", () => {
      startPairSession(testDir, "Task", "human");
      const rotated = rotateDriver(testDir);
      expect(rotated!.driver).toBe("claude");
    });

    it("increments rotation count", () => {
      startPairSession(testDir, "Task");
      rotateDriver(testDir);
      rotateDriver(testDir);
      const session = loadPairSession(testDir);
      expect(session!.rotationCount).toBe(2);
    });
  });

  describe("recordContribution", () => {
    it("returns null when no session exists", () => {
      expect(recordContribution(testDir, "claude")).toBeNull();
    });

    it("increments claude contributions", () => {
      startPairSession(testDir, "Task");
      recordContribution(testDir, "claude");
      recordContribution(testDir, "claude");
      const session = loadPairSession(testDir);
      expect(session!.claudeContributions).toBe(2);
      expect(session!.humanContributions).toBe(0);
    });

    it("increments human contributions", () => {
      startPairSession(testDir, "Task");
      recordContribution(testDir, "human");
      const session = loadPairSession(testDir);
      expect(session!.humanContributions).toBe(1);
    });

    it("tracks contributions since rotation", () => {
      startPairSession(testDir, "Task");
      recordContribution(testDir, "claude");
      recordContribution(testDir, "claude");
      let session = loadPairSession(testDir);
      expect(session!.contributionsSinceRotation).toBe(2);

      rotateDriver(testDir);
      session = loadPairSession(testDir);
      expect(session!.contributionsSinceRotation).toBe(0);

      recordContribution(testDir, "human");
      session = loadPairSession(testDir);
      expect(session!.contributionsSinceRotation).toBe(1);
    });
  });

  describe("shouldSuggestRotation", () => {
    it("returns false when under 3 contributions", () => {
      const session = startPairSession(testDir, "Task");
      session.contributionsSinceRotation = 2;
      expect(shouldSuggestRotation(session)).toBe(false);
    });

    it("returns true when at 3 contributions", () => {
      const session = startPairSession(testDir, "Task");
      session.contributionsSinceRotation = 3;
      expect(shouldSuggestRotation(session)).toBe(true);
    });

    it("returns true when over 3 contributions", () => {
      const session = startPairSession(testDir, "Task");
      session.contributionsSinceRotation = 5;
      expect(shouldSuggestRotation(session)).toBe(true);
    });
  });

  describe("otherDriver", () => {
    it("returns human for claude", () => {
      expect(otherDriver("claude")).toBe("human");
    });

    it("returns claude for human", () => {
      expect(otherDriver("human")).toBe("claude");
    });
  });

  describe("formatPairSession", () => {
    it("formats session for display", () => {
      const session = startPairSession(testDir, "Building a cool feature");
      session.claudeContributions = 3;
      session.humanContributions = 2;
      const output = formatPairSession(session);
      expect(output).toContain("Pair Programming Session");
      expect(output).toContain("Building a cool feature");
      expect(output).toContain("Claude");
      expect(output).toContain("Human");
    });

    it("includes rotation suggestion when appropriate", () => {
      const session = startPairSession(testDir, "Task");
      session.contributionsSinceRotation = 4;
      const output = formatPairSession(session);
      expect(output).toContain("Consider rotating");
    });
  });

  describe("formatSessionSummary", () => {
    it("formats session summary", () => {
      const session = startPairSession(testDir, "Feature work");
      session.claudeContributions = 5;
      session.humanContributions = 5;
      session.rotationCount = 3;
      const output = formatSessionSummary(session);
      expect(output).toContain("Complete");
      expect(output).toContain("Feature work");
      expect(output).toContain("50%");
    });
  });
});
