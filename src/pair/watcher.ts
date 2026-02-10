import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { watch } from "chokidar";
import { getSppDir } from "../config/loader.js";
import { appendToTranscript, formatTime } from "./transcript.js";

// --- Types ---
interface FileState {
  content: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

// --- Constants ---
const DEBOUNCE_MS = 500;
const IGNORED_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.hg/**",
  "**/.claude-spp/**",
  "**/.claude/**",
  "**/dist/**",
  "**/.DS_Store",
];
const MAX_FILE_SIZE_BYTES = 1_000_000; // 1MB

// --- State ---
const fileStates = new Map<string, FileState>();

// --- Binary detection ---

/**
 * Check if a file is binary by looking for null bytes in the first 8KB.
 */
export function isBinaryFile(filePath: string): boolean {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return true; // If we can't read it, treat as binary
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

// --- Diff computation ---

/**
 * Compute a unified diff between old and new content using the system `diff` command.
 * Returns the diff hunks (everything from @@ lines onward), or empty string if identical.
 */
export function computeDiff(oldContent: string, newContent: string): string {
  const tmpOld = path.join(os.tmpdir(), `spp-old-${process.pid}`);
  const tmpNew = path.join(os.tmpdir(), `spp-new-${process.pid}`);
  try {
    fs.writeFileSync(tmpOld, oldContent);
    fs.writeFileSync(tmpNew, newContent);
    // diff exits 0 when files are identical
    execFileSync("diff", ["-u", tmpOld, tmpNew], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return ""; // Identical
  } catch (err: unknown) {
    // diff exits 1 when files differ — that's the normal case
    if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 1 && "stdout" in err) {
      const output = (err as { stdout: string }).stdout;
      const lines = output.split("\n");
      // Strip the --- / +++ header lines, keep from first @@ onward
      const hhIdx = lines.findIndex((l) => l.startsWith("@@"));
      if (hhIdx >= 0) {
        return lines.slice(hhIdx).join("\n").trimEnd();
      }
      return output.trimEnd();
    }
    // diff exits 2 on real error — skip this change
    return "";
  } finally {
    try { fs.unlinkSync(tmpOld); } catch { /* ignore */ }
    try { fs.unlinkSync(tmpNew); } catch { /* ignore */ }
  }
}

// --- File change handling ---

function cacheFileContent(absPath: string, projectPath: string): void {
  const relPath = path.relative(projectPath, absPath);
  if (relPath.startsWith(".claude-spp")) return;
  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) return;
    if (isBinaryFile(absPath)) return;
    const content = fs.readFileSync(absPath, "utf-8");
    fileStates.set(relPath, { content, debounceTimer: null });
  } catch {
    // File unreadable — skip
  }
}

function processFileChange(
  absPath: string,
  relPath: string,
  projectPath: string,
): void {
  let newContent: string;
  try {
    const stat = fs.statSync(absPath);
    if (stat.size > MAX_FILE_SIZE_BYTES) return;
    if (isBinaryFile(absPath)) return;
    newContent = fs.readFileSync(absPath, "utf-8");
  } catch {
    return; // File deleted or unreadable
  }

  const state = fileStates.get(relPath);
  const oldContent = state?.content ?? "";

  // Dedup: skip if content unchanged
  if (newContent === oldContent) return;

  const diff = computeDiff(oldContent, newContent);
  if (!diff) return;

  const time = formatTime();
  appendToTranscript(projectPath, `${time} — Saved ${relPath}`, `\`\`\`diff\n${diff}\n\`\`\``);

  // Update state
  fileStates.set(relPath, { content: newContent, debounceTimer: null });
}

function handleFileEvent(
  absPath: string,
  projectPath: string,
): void {
  const relPath = path.relative(projectPath, absPath);

  // Guard against recursive transcript recording
  if (relPath.startsWith(".claude-spp")) return;
  const state = fileStates.get(relPath);

  // Clear existing debounce timer
  if (state?.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  const timer = setTimeout(() => {
    processFileChange(absPath, relPath, projectPath);
  }, DEBOUNCE_MS);

  // Update or create state with new timer (preserve content)
  if (state) {
    state.debounceTimer = timer;
  } else {
    fileStates.set(relPath, { content: "", debounceTimer: timer });
  }
}

// --- Main entry point ---

/**
 * Run the file watcher. This function blocks until SIGTERM/SIGINT.
 * Called by `spp watcher:start <projectPath>`.
 */
export function runWatcher(projectPath: string): void {
  // Ensure spp dir exists for transcript
  const sppDir = getSppDir(projectPath);
  if (!fs.existsSync(sppDir)) {
    fs.mkdirSync(sppDir, { recursive: true });
  }

  let isReady = false;

  const watcher = watch(projectPath, {
    ignored: IGNORED_PATTERNS,
    persistent: true,
    ignoreInitial: false, // We want add events for initial scan to cache content
  });

  // During initial scan: cache content silently
  watcher.on("add", (filePath: string) => {
    if (!isReady) {
      cacheFileContent(filePath, projectPath);
      return;
    }
    // Real new file after initial scan
    handleFileEvent(filePath, projectPath);
  });

  watcher.on("change", (filePath: string) => {
    handleFileEvent(filePath, projectPath);
  });

  watcher.on("ready", () => {
    isReady = true;
  });

  // Graceful shutdown
  const shutdown = () => {
    watcher.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
