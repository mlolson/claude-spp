import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  normalizeFilePath,
  fileMatchesPattern,
  fileMatchesPatterns,
  isStpInternalFile,
} from "../src/hooks/file-matcher.js";
import { preToolUseHook } from "../src/hooks/pre-tool-use.js";

describe("file-matcher", () => {
  const projectPath = "/Users/test/project";

  describe("normalizeFilePath", () => {
    it("should return relative path as-is", () => {
      expect(normalizeFilePath("src/test.ts", projectPath)).toBe("src/test.ts");
    });

    it("should convert absolute path to relative", () => {
      expect(normalizeFilePath("/Users/test/project/src/test.ts", projectPath)).toBe(
        "src/test.ts"
      );
    });

    it("should return original if path is outside project", () => {
      expect(normalizeFilePath("/Users/other/file.ts", projectPath)).toBe(
        "/Users/other/file.ts"
      );
    });
  });

  describe("fileMatchesPattern", () => {
    it("should match exact path", () => {
      expect(fileMatchesPattern("src/test.ts", "src/test.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test.ts", "src/other.ts", projectPath)).toBe(false);
    });

    it("should match directory prefix", () => {
      expect(fileMatchesPattern("src/components/Button.tsx", "src/components/", projectPath)).toBe(
        true
      );
      expect(fileMatchesPattern("src/utils/helpers.ts", "src/components/", projectPath)).toBe(
        false
      );
    });

    it("should match files inside directory when pattern is directory name", () => {
      expect(fileMatchesPattern("src/components/Button.tsx", "src/components", projectPath)).toBe(
        true
      );
    });

    it("should handle leading ./ in pattern", () => {
      expect(fileMatchesPattern("src/test.ts", "./src/test.ts", projectPath)).toBe(true);
    });

    it("should match glob patterns with *", () => {
      expect(fileMatchesPattern("src/test.ts", "src/*.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/nested/test.ts", "src/*.ts", projectPath)).toBe(false);
    });

    it("should match glob patterns with **", () => {
      expect(fileMatchesPattern("src/nested/deep/test.ts", "src/**/*.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test.ts", "src/**/*.ts", projectPath)).toBe(true);
    });

    it("should match glob patterns with ?", () => {
      expect(fileMatchesPattern("src/test1.ts", "src/test?.ts", projectPath)).toBe(true);
      expect(fileMatchesPattern("src/test12.ts", "src/test?.ts", projectPath)).toBe(false);
    });
  });

  describe("fileMatchesPatterns", () => {
    it("should return true if any pattern matches", () => {
      const patterns = ["src/utils/", "src/test.ts"];
      expect(fileMatchesPatterns("src/test.ts", patterns, projectPath)).toBe(true);
      expect(fileMatchesPatterns("src/utils/helper.ts", patterns, projectPath)).toBe(true);
      expect(fileMatchesPatterns("src/other.ts", patterns, projectPath)).toBe(false);
    });

    it("should return false for empty patterns", () => {
      expect(fileMatchesPatterns("src/test.ts", [], projectPath)).toBe(false);
    });
  });

  describe("isStpInternalFile", () => {
    it("should return true for files in .stp directory", () => {
      expect(isStpInternalFile(".stp/config.json", projectPath)).toBe(true);
      expect(isStpInternalFile(".stp/state.json", projectPath)).toBe(true);
    });

    it("should return true for absolute paths in .stp directory", () => {
      expect(isStpInternalFile("/Users/test/project/.stp/config.json", projectPath)).toBe(true);
    });

    it("should return false for regular project files", () => {
      expect(isStpInternalFile("src/test.ts", projectPath)).toBe(false);
    });
  });
});

describe("preToolUseHook", () => {
  let tempDir: string;
  let stpDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "stp-test-"));
    stpDir = path.join(tempDir, ".stp");
    fs.mkdirSync(stpDir, { recursive: true });

    // Create config with mode
    fs.writeFileSync(
      path.join(stpDir, "config.json"),
      JSON.stringify({
        mode: 4,
        enabled: true,
        difficulty: "medium",
      })
    );

    // Create state
    fs.writeFileSync(
      path.join(stpDir, "state.json"),
      JSON.stringify({
        session: {
          startedAt: new Date().toISOString(),
        },
      })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should allow non-write tools", () => {
    const result = preToolUseHook({
      tool: { name: "Read", input: { file_path: "src/test.ts" } },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should allow writes when STP not initialized", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "stp-empty-"));
    try {
      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: emptyDir,
      });
      expect(result.decision).toBe("allow");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("should allow writes to .stp directory", () => {
    const result = preToolUseHook({
      tool: {
        name: "Write",
        input: { file_path: path.join(tempDir, ".stp", "config.json"), content: "{}" },
      },
      cwd: tempDir,
    });
    expect(result.decision).toBe("allow");
  });

  it("should allow writes when ratio is healthy", () => {
    // Initialize git repo
    const { execSync } = require("child_process");
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
    execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
    fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
    execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });
    const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

    // Create a git history cache with healthy ratio
    // 60 human lines, 40 claude lines = 60% human (above 50%)
    fs.writeFileSync(
      path.join(stpDir, ".git_history_cache.json"),
      JSON.stringify({
        lastCommit: headCommit,
        humanLines: 60,
        claudeLines: 40,
        humanCommits: 6,
        claudeCommits: 4,
      })
    );

    const result = preToolUseHook({
      tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
      cwd: tempDir,
    });

    expect(result.decision).toBe("allow");
  });

  describe("ratio enforcement", () => {
    it("should block writes when ratio is below target", () => {
      // Initialize git repo so getLineCounts works
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });

      // Get the HEAD commit hash
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create a git history cache with unhealthy ratio (mode 4 = 50% target)
      // 10 human lines, 100 claude lines = 9% human (below 50%)
      fs.writeFileSync(
        path.join(stpDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 10,
          claudeLines: 100,
          humanCommits: 1,
          claudeCommits: 10,
        })
      );

      const result = preToolUseHook({
        tool: { name: "Write", input: { file_path: "src/test.ts", content: "test" } },
        cwd: tempDir,
      });

      expect(result.decision).toBe("block");
      expect(result.reason).toBe("ratio_below_target");
      expect(result.message).toContain("below target");
      expect(result.message).toContain("50%");
    });

    it("should always allow writes to .stp even with unhealthy ratio", () => {
      // Initialize git repo
      const { execSync } = require("child_process");
      execSync("git init", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
      execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tempDir, "init.txt"), "init");
      execSync("git add . && git commit -m 'init'", { cwd: tempDir, stdio: "ignore" });
      const headCommit = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      // Create unhealthy ratio
      fs.writeFileSync(
        path.join(stpDir, ".git_history_cache.json"),
        JSON.stringify({
          lastCommit: headCommit,
          humanLines: 0,
          claudeLines: 100,
          humanCommits: 0,
          claudeCommits: 10,
        })
      );

      const result = preToolUseHook({
        tool: {
          name: "Write",
          input: { file_path: path.join(tempDir, ".stp", "state.json"), content: "{}" },
        },
        cwd: tempDir,
      });

      expect(result.decision).toBe("allow");
    });
  });
});
