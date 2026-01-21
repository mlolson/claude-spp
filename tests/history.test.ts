import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { getLineCountsWithWindow, clearCache } from "../src/git/history.js";

const TEST_DIR = path.join(process.cwd(), ".test-history");

function runGit(cmd: string): void {
  execSync(cmd, { cwd: TEST_DIR, stdio: "ignore" });
}

function createCommit(message: string, content: string, filename = "file.txt"): void {
  fs.writeFileSync(path.join(TEST_DIR, filename), content);
  runGit(`git add ${filename}`);
  runGit(`git commit -m "${message}"`);
}

function createClaudeCommit(message: string, content: string, filename = "file.txt"): void {
  fs.writeFileSync(path.join(TEST_DIR, filename), content);
  runGit(`git add ${filename}`);
  runGit(`git commit -m "${message}" -m "Co-Authored-By: Claude <noreply@anthropic.com>"`);
}

describe("Git History", () => {
  beforeEach(() => {
    // Clean up any existing test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    // Initialize git repo
    runGit("git init");
    runGit("git config user.email 'test@test.com'");
    runGit("git config user.name 'Test User'");
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe("getLineCountsWithWindow", () => {
    it("returns all commits when since is null", () => {
      createCommit("first commit", "line1\nline2\nline3");
      createCommit("second commit", "line1\nline2\nline3\nline4\nline5");

      const counts = getLineCountsWithWindow(TEST_DIR, { since: null });

      expect(counts.humanCommits).toBe(2);
      expect(counts.claudeCommits).toBe(0);
      expect(counts.humanLines).toBeGreaterThan(0);
    });

    it("returns zero counts when since is in the future", () => {
      createCommit("first commit", "line1\nline2\nline3");

      // Use a date far in the future
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const counts = getLineCountsWithWindow(TEST_DIR, { since: futureDate });

      expect(counts.humanCommits).toBe(0);
      expect(counts.claudeCommits).toBe(0);
      expect(counts.humanLines).toBe(0);
      expect(counts.claudeLines).toBe(0);
    });

    it("attributes commits with Co-Authored-By: Claude to Claude", () => {
      createCommit("human commit", "human line");
      createClaudeCommit("claude commit", "human line\nclaude line");

      const counts = getLineCountsWithWindow(TEST_DIR, { since: null });

      expect(counts.humanCommits).toBe(1);
      expect(counts.claudeCommits).toBe(1);
      expect(counts.humanLines).toBeGreaterThan(0);
      expect(counts.claudeLines).toBeGreaterThan(0);
    });

    it("filters commits by time window", () => {
      // Create a commit
      createCommit("recent commit", "line1");

      // Get counts with a cutoff from 1 hour ago (should include the commit)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const countsWithRecent = getLineCountsWithWindow(TEST_DIR, { since: oneHourAgo });
      expect(countsWithRecent.humanCommits).toBe(1);

      // Get counts with a cutoff from 1 minute in the future (should exclude the commit)
      const oneMinuteFromNow = new Date(Date.now() + 60 * 1000);
      const countsExcluded = getLineCountsWithWindow(TEST_DIR, { since: oneMinuteFromNow });
      expect(countsExcluded.humanCommits).toBe(0);
    });

    it("does not use cache for time-filtered queries", () => {
      createCommit("first commit", "line1");

      // First call with since filter
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const firstCounts = getLineCountsWithWindow(TEST_DIR, { since: oneHourAgo });

      // Both should not be from cache when using time filter
      expect(firstCounts.fromCache).toBe(false);
    });

    it("uses cache for null since (allTime)", () => {
      createCommit("first commit", "line1");

      // Clear any existing cache
      clearCache(TEST_DIR);

      // First call populates cache
      const firstCounts = getLineCountsWithWindow(TEST_DIR, { since: null });
      expect(firstCounts.fromCache).toBe(false);

      // Second call uses cache
      const secondCounts = getLineCountsWithWindow(TEST_DIR, { since: null });
      expect(secondCounts.fromCache).toBe(true);
    });
  });
});
