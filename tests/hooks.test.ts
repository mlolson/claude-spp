import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  normalizeFilePath,
  fileMatchesPattern,
  fileMatchesPatterns,
  isSppInternalFile,
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

  describe("isSppInternalFile", () => {
    it("should return true for files in .claude-spp directory", () => {
      expect(isSppInternalFile(".claude-spp/config.json", projectPath)).toBe(true);
      expect(isSppInternalFile(".claude-spp/state.json", projectPath)).toBe(true);
    });

    it("should return true for absolute paths in .claude-spp directory", () => {
      expect(isSppInternalFile("/Users/test/project/.claude-spp/config.json", projectPath)).toBe(true);
    });

    it("should return false for regular project files", () => {
      expect(isSppInternalFile("src/test.ts", projectPath)).toBe(false);
    });
  });
});

describe("preToolUseHook", () => {
  let tempDir: string;
  let stpDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-"));
    stpDir = path.join(tempDir, ".claude-spp");
    fs.mkdirSync(stpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(stpDir, "config.json"),
      JSON.stringify(config)
    );
  }

  function initGitRepo(): void {
    const { execSync } = require("child_process");
    execSync("git init", { cwd: tempDir, stdio: "ignore" });
    execSync("git config user.email 'test@test.com'", { cwd: tempDir, stdio: "ignore" });
    execSync("git config user.name 'Test'", { cwd: tempDir, stdio: "ignore" });
  }

  it("should allow non-write tools", () => {
    writeConfig({ modeType: "weeklyGoal", targetPercentage: 25, enabled: true });
    const result = preToolUseHook({
      tool_name: "Read",
      tool_input: { file_path: "src/test.ts" },
      cwd: tempDir,
    });
    expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  it("should allow writes when SPP not initialized", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-empty-"));
    try {
      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: emptyDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("should allow writes to .claude-spp directory", () => {
    writeConfig({ modeType: "weeklyGoal", targetPercentage: 25, enabled: true });
    const result = preToolUseHook({
      tool_name: "Write",
      tool_input: { file_path: path.join(tempDir, ".claude-spp", "config.json"), content: "{}" },
      cwd: tempDir,
    });
    expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
  });

  describe("drive mode", () => {
    it("should block writes in drive mode", () => {
      writeConfig({ modeType: "weeklyGoal", targetPercentage: 25, enabled: true, driveMode: true });
      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain("Drive mode");
    });
  });

  describe("weekly goal percentage enforcement", () => {
    it("should block writes when ratio is below target", () => {
      initGitRepo();
      writeConfig({ modeType: "weeklyGoal", targetPercentage: 50, trackingMode: "commits", enabled: true });

      // Create many Claude commits, few human commits
      const { execSync } = require("child_process");
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(tempDir, `claude${i}.txt`), `claude code ${i}`);
        execSync(`git add . && git commit -m "Add claude${i}\n\nCo-Authored-By: Claude <claude@anthropic.com>"`, { cwd: tempDir, stdio: "ignore" });
      }
      fs.writeFileSync(path.join(tempDir, "human.txt"), "human code");
      execSync("git add . && git commit -m 'human commit'", { cwd: tempDir, stdio: "ignore" });

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain("below target");
    });

    it("should allow writes when ratio is healthy", () => {
      initGitRepo();
      writeConfig({ modeType: "weeklyGoal", targetPercentage: 50, trackingMode: "commits", enabled: true });

      // Create healthy ratio: more human commits than Claude
      const { execSync } = require("child_process");
      for (let i = 0; i < 6; i++) {
        fs.writeFileSync(path.join(tempDir, `human${i}.txt`), `human code ${i}`);
        execSync(`git add . && git commit -m "human commit ${i}"`, { cwd: tempDir, stdio: "ignore" });
      }
      for (let i = 0; i < 4; i++) {
        fs.writeFileSync(path.join(tempDir, `claude${i}.txt`), `claude code ${i}`);
        execSync(`git add . && git commit -m "Add claude${i}\n\nCo-Authored-By: Claude <claude@anthropic.com>"`, { cwd: tempDir, stdio: "ignore" });
      }

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });
  });

  describe("pair programming enforcement", () => {
    it("should block writes when human is driving", () => {
      writeConfig({
        modeType: "pairProgramming",
        enabled: true,
        pairSession: {
          active: true,
          currentDriver: "human",
          task: "test task",
          humanTurns: 0,
          claudeTurns: 0,
        },
      });

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain("human is currently driving");
    });

    it("should allow writes when Claude is driving", () => {
      writeConfig({
        modeType: "pairProgramming",
        enabled: true,
        pairSession: {
          active: true,
          currentDriver: "claude",
          task: "test task",
          humanTurns: 0,
          claudeTurns: 0,
        },
      });

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });

    it("should allow writes when no active pair session", () => {
      writeConfig({
        modeType: "pairProgramming",
        enabled: true,
      });

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });
  });

  describe("learning project enforcement", () => {
    it("should always allow writes in learning project mode", () => {
      writeConfig({
        modeType: "learningProject",
        enabled: true,
      });

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "src/test.ts", content: "test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });
  });

  describe("common bypasses", () => {
    it("should always allow .claude-spp writes even with unhealthy ratio", () => {
      initGitRepo();
      writeConfig({ modeType: "weeklyGoal", targetPercentage: 50, trackingMode: "commits", enabled: true });

      const { execSync } = require("child_process");
      for (let i = 0; i < 10; i++) {
        fs.writeFileSync(path.join(tempDir, `claude${i}.txt`), `claude code ${i}`);
        execSync(`git add . && git commit -m "Add claude${i}\n\nCo-Authored-By: Claude <claude@anthropic.com>"`, { cwd: tempDir, stdio: "ignore" });
      }

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: path.join(tempDir, ".claude-spp", "state.json"), content: "{}" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });

    it("should always allow markdown files", () => {
      writeConfig({ modeType: "weeklyGoal", targetPercentage: 25, enabled: true });
      initGitRepo();

      const result = preToolUseHook({
        tool_name: "Write",
        tool_input: { file_path: "README.md", content: "# Test" },
        cwd: tempDir,
      });
      expect(result.hookSpecificOutput.permissionDecision).toBe("allow");
    });
  });
});
