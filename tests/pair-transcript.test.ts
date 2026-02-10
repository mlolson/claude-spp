import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  getTranscriptPath,
  getTranscriptsDir,
  getTranscript,
  clearTranscript,
  archiveTranscript,
  appendToTranscript,
  formatTime,
  listTranscripts,
} from "../src/pair/transcript.js";
import { computeDiff, isBinaryFile, loadGitignorePatterns, gitignorePatternToGlobs } from "../src/pair/watcher.js";
import { userPromptHook, stopHook } from "../src/pair/hooks.js";

describe("transcript operations", () => {
  let tempDir: string;
  let sppDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-transcript-"));
    sppDir = path.join(tempDir, ".claude-spp");
    fs.mkdirSync(sppDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("getTranscriptPath returns correct path", () => {
    const p = getTranscriptPath(tempDir);
    expect(p).toBe(path.join(sppDir, "pair-transcript.md"));
  });

  it("getTranscript returns empty string when no transcript exists", () => {
    expect(getTranscript(tempDir)).toBe("");
  });

  it("getTranscript reads existing transcript file", () => {
    fs.writeFileSync(path.join(sppDir, "pair-transcript.md"), "hello world");
    expect(getTranscript(tempDir)).toBe("hello world");
  });

  it("clearTranscript removes the transcript file", () => {
    const transcriptPath = path.join(sppDir, "pair-transcript.md");
    fs.writeFileSync(transcriptPath, "data");
    clearTranscript(tempDir);
    expect(fs.existsSync(transcriptPath)).toBe(false);
  });

  it("clearTranscript is a no-op when no transcript exists", () => {
    clearTranscript(tempDir); // Should not throw
  });

  it("getTranscriptsDir returns correct path", () => {
    const p = getTranscriptsDir(tempDir);
    expect(p).toBe(path.join(sppDir, "transcripts"));
  });

  it("archiveTranscript moves file into transcripts/ subdirectory", () => {
    const transcriptPath = path.join(sppDir, "pair-transcript.md");
    fs.writeFileSync(transcriptPath, "archived data");
    const result = archiveTranscript(tempDir);
    expect(result).not.toBeNull();
    expect(result).toContain("transcripts");
    expect(result).toContain("pair-transcript-");
    expect(result).toContain(".md");
    expect(fs.existsSync(transcriptPath)).toBe(false);
    expect(fs.existsSync(result!)).toBe(true);
    expect(fs.readFileSync(result!, "utf-8")).toBe("archived data");
  });

  it("archiveTranscript creates transcripts/ directory if needed", () => {
    const transcriptPath = path.join(sppDir, "pair-transcript.md");
    fs.writeFileSync(transcriptPath, "data");
    const transcriptsDir = path.join(sppDir, "transcripts");
    expect(fs.existsSync(transcriptsDir)).toBe(false);
    archiveTranscript(tempDir);
    expect(fs.existsSync(transcriptsDir)).toBe(true);
  });

  it("archiveTranscript returns null when no transcript exists", () => {
    expect(archiveTranscript(tempDir)).toBeNull();
  });

  it("appendToTranscript creates file and appends entry", () => {
    appendToTranscript(tempDir, "12:00 — Saved src/foo.ts", "```diff\n+hello\n```");
    const content = getTranscript(tempDir);
    expect(content).toContain("## 12:00 — Saved src/foo.ts");
    expect(content).toContain("+hello");
  });

  it("appendToTranscript appends multiple entries", () => {
    appendToTranscript(tempDir, "12:00 — First", "body1");
    appendToTranscript(tempDir, "12:05 — Second", "body2");
    const content = getTranscript(tempDir);
    expect(content).toContain("## 12:00 — First");
    expect(content).toContain("## 12:05 — Second");
  });

  it("formatTime returns HH:MM format", () => {
    const time = formatTime(new Date("2024-01-15T14:30:00"));
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it("listTranscripts returns empty array when no transcripts/ dir", () => {
    expect(listTranscripts(tempDir)).toEqual([]);
  });

  it("listTranscripts returns empty array when transcripts/ is empty", () => {
    fs.mkdirSync(path.join(sppDir, "transcripts"), { recursive: true });
    expect(listTranscripts(tempDir)).toEqual([]);
  });

  it("listTranscripts returns entries sorted by date descending", () => {
    const transcriptsDir = path.join(sppDir, "transcripts");
    fs.mkdirSync(transcriptsDir, { recursive: true });
    fs.writeFileSync(path.join(transcriptsDir, "pair-transcript-2024-01-10T10-00-00.md"), "first");
    fs.writeFileSync(path.join(transcriptsDir, "pair-transcript-2024-01-12T14-30-00.md"), "third");
    fs.writeFileSync(path.join(transcriptsDir, "pair-transcript-2024-01-11T09-15-00.md"), "second");

    const entries = listTranscripts(tempDir);
    expect(entries).toHaveLength(3);
    expect(entries[0].filename).toBe("pair-transcript-2024-01-12T14-30-00.md");
    expect(entries[1].filename).toBe("pair-transcript-2024-01-11T09-15-00.md");
    expect(entries[2].filename).toBe("pair-transcript-2024-01-10T10-00-00.md");
    expect(entries[0].path).toBe(path.join(transcriptsDir, "pair-transcript-2024-01-12T14-30-00.md"));
  });

  it("listTranscripts ignores non-transcript files", () => {
    const transcriptsDir = path.join(sppDir, "transcripts");
    fs.mkdirSync(transcriptsDir, { recursive: true });
    fs.writeFileSync(path.join(transcriptsDir, "pair-transcript-2024-01-10T10-00-00.md"), "valid");
    fs.writeFileSync(path.join(transcriptsDir, "random-file.md"), "ignored");
    fs.writeFileSync(path.join(transcriptsDir, "notes.txt"), "ignored");

    const entries = listTranscripts(tempDir);
    expect(entries).toHaveLength(1);
  });
});

describe("diff computation", () => {
  it("produces unified diff for changed content", () => {
    const diff = computeDiff("line1\nline2\nline3\n", "line1\nmodified\nline3\n");
    expect(diff).toContain("-line2");
    expect(diff).toContain("+modified");
    expect(diff).toContain("@@");
  });

  it("produces all-added diff for new content", () => {
    const diff = computeDiff("", "new line 1\nnew line 2\n");
    expect(diff).toContain("+new line 1");
    expect(diff).toContain("+new line 2");
  });

  it("returns empty string when content is identical", () => {
    const diff = computeDiff("same\n", "same\n");
    expect(diff).toBe("");
  });

  it("handles multi-line changes", () => {
    const old = "a\nb\nc\nd\ne\n";
    const updated = "a\nB\nC\nd\ne\n";
    const diff = computeDiff(old, updated);
    expect(diff).toContain("-b");
    expect(diff).toContain("-c");
    expect(diff).toContain("+B");
    expect(diff).toContain("+C");
  });
});

describe("binary detection", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-binary-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("detects binary files", () => {
    const filePath = path.join(tempDir, "binary.bin");
    const buf = Buffer.alloc(100);
    buf[50] = 0; // null byte
    buf.write("hello", 0);
    fs.writeFileSync(filePath, buf);
    expect(isBinaryFile(filePath)).toBe(true);
  });

  it("detects text files", () => {
    const filePath = path.join(tempDir, "text.txt");
    fs.writeFileSync(filePath, "this is a text file\nwith multiple lines\n");
    expect(isBinaryFile(filePath)).toBe(false);
  });
});

describe("conversation hooks", () => {
  let tempDir: string;
  let sppDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-hooks-"));
    sppDir = path.join(tempDir, ".claude-spp");
    fs.mkdirSync(sppDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeConfig(config: Record<string, unknown>): void {
    fs.writeFileSync(
      path.join(sppDir, "config.json"),
      JSON.stringify(config),
    );
  }

  function writeDriveConfig(): void {
    writeConfig({
      modeType: "weeklyGoal",
      enabled: true,
      driveMode: true,
    });
  }

  describe("userPromptHook", () => {
    it("appends user message when drive mode is active", () => {
      writeDriveConfig();
      userPromptHook({
        cwd: tempDir,
        prompt: "How do I fix the auth bug?",
      });
      const transcript = getTranscript(tempDir);
      expect(transcript).toContain("Human → Claude");
      expect(transcript).toContain("How do I fix the auth bug?");
    });

    it("skips when drive mode is off", () => {
      writeConfig({ modeType: "weeklyGoal", enabled: true, driveMode: false });
      userPromptHook({
        cwd: tempDir,
        prompt: "Hello",
      });
      expect(getTranscript(tempDir)).toBe("");
    });

    it("skips empty prompts", () => {
      writeDriveConfig();
      userPromptHook({
        cwd: tempDir,
        prompt: "   ",
      });
      expect(getTranscript(tempDir)).toBe("");
    });
  });

  describe("stopHook", () => {
    it("appends Claude response from transcript JSONL when drive mode is active", () => {
      writeDriveConfig();
      // Create a mock Claude Code transcript JSONL
      const transcriptPath = path.join(tempDir, "conversation.jsonl");
      const lines = [
        JSON.stringify({ role: "user", content: "Hello" }),
        JSON.stringify({ role: "assistant", content: "Hi there! How can I help?" }),
      ];
      fs.writeFileSync(transcriptPath, lines.join("\n"));

      stopHook({
        cwd: tempDir,
        transcript_path: transcriptPath,
      });
      const transcript = getTranscript(tempDir);
      expect(transcript).toContain("Claude → Human");
      expect(transcript).toContain("Hi there! How can I help?");
    });

    it("handles array content blocks in assistant message", () => {
      writeDriveConfig();
      const transcriptPath = path.join(tempDir, "conversation.jsonl");
      const lines = [
        JSON.stringify({
          role: "assistant",
          content: [
            { type: "text", text: "Here is the answer." },
            { type: "tool_use", id: "123" },
          ],
        }),
      ];
      fs.writeFileSync(transcriptPath, lines.join("\n"));

      stopHook({
        cwd: tempDir,
        transcript_path: transcriptPath,
      });
      const transcript = getTranscript(tempDir);
      expect(transcript).toContain("Here is the answer.");
    });

    it("truncates long responses", () => {
      writeDriveConfig();
      const transcriptPath = path.join(tempDir, "conversation.jsonl");
      const longMessage = "x".repeat(3000);
      const lines = [
        JSON.stringify({ role: "assistant", content: longMessage }),
      ];
      fs.writeFileSync(transcriptPath, lines.join("\n"));

      stopHook({
        cwd: tempDir,
        transcript_path: transcriptPath,
      });
      const transcript = getTranscript(tempDir);
      expect(transcript).toContain("... (truncated)");
      expect(transcript.length).toBeLessThan(3000);
    });

    it("skips when no transcript_path provided", () => {
      writeDriveConfig();
      stopHook({
        cwd: tempDir,
      });
      expect(getTranscript(tempDir)).toBe("");
    });

    it("skips when drive mode is off", () => {
      writeConfig({
        modeType: "weeklyGoal",
        enabled: true,
        driveMode: false,
      });
      const transcriptPath = path.join(tempDir, "conversation.jsonl");
      fs.writeFileSync(transcriptPath, JSON.stringify({ role: "assistant", content: "hello" }));

      stopHook({
        cwd: tempDir,
        transcript_path: transcriptPath,
      });
      expect(getTranscript(tempDir)).toBe("");
    });
  });
});

describe("gitignore pattern conversion", () => {
  it("converts unanchored file pattern", () => {
    expect(gitignorePatternToGlobs("*.log")).toEqual(["**/*.log", "**/*.log/**"]);
  });

  it("converts unanchored directory pattern (trailing slash)", () => {
    expect(gitignorePatternToGlobs("coverage/")).toEqual(["**/coverage/**"]);
  });

  it("converts unanchored bare name", () => {
    expect(gitignorePatternToGlobs(".env")).toEqual(["**/.env", "**/.env/**"]);
  });

  it("converts anchored pattern (leading slash)", () => {
    expect(gitignorePatternToGlobs("/build")).toEqual(["build", "build/**"]);
  });

  it("converts anchored directory pattern (leading + trailing slash)", () => {
    expect(gitignorePatternToGlobs("/build/")).toEqual(["build/**"]);
  });

  it("converts pattern with middle slash (implicitly anchored)", () => {
    expect(gitignorePatternToGlobs("src/generated")).toEqual([
      "src/generated",
      "src/generated/**",
    ]);
  });

  it("converts pattern with middle and trailing slash", () => {
    expect(gitignorePatternToGlobs("src/generated/")).toEqual(["src/generated/**"]);
  });

  it("converts wildcard directory pattern", () => {
    expect(gitignorePatternToGlobs("*.pyc")).toEqual(["**/*.pyc", "**/*.pyc/**"]);
  });
});

describe("loadGitignorePatterns", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spp-test-gitignore-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns empty array when no .gitignore exists", () => {
    expect(loadGitignorePatterns(tempDir)).toEqual([]);
  });

  it("parses typical .gitignore file", () => {
    fs.writeFileSync(
      path.join(tempDir, ".gitignore"),
      "# dependencies\nnode_modules\n\n# build output\ndist/\n\n# env files\n.env\n",
    );
    const patterns = loadGitignorePatterns(tempDir);
    expect(patterns).toContain("**/node_modules");
    expect(patterns).toContain("**/node_modules/**");
    expect(patterns).toContain("**/dist/**");
    expect(patterns).toContain("**/.env");
  });

  it("skips comments and empty lines", () => {
    fs.writeFileSync(
      path.join(tempDir, ".gitignore"),
      "# this is a comment\n\n   \n*.log\n",
    );
    const patterns = loadGitignorePatterns(tempDir);
    expect(patterns).toEqual(["**/*.log", "**/*.log/**"]);
  });

  it("skips negation patterns", () => {
    fs.writeFileSync(
      path.join(tempDir, ".gitignore"),
      "*.log\n!important.log\n",
    );
    const patterns = loadGitignorePatterns(tempDir);
    expect(patterns).toEqual(["**/*.log", "**/*.log/**"]);
  });
});
