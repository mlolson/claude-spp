import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod";

const CACHE_FILE = ".claude-stp/.git_history_cache.json";

/**
 * Cache schema for git history line counts
 */
const GitHistoryCacheSchema = z.object({
  userEmail: z.string(),
  lastCommit: z.string(),
  humanLines: z.number().int().min(0),
  claudeLines: z.number().int().min(0),
  humanCommits: z.number().int().min(0),
  claudeCommits: z.number().int().min(0),
});

type GitHistoryCache = z.infer<typeof GitHistoryCacheSchema>;

/**
 * Line count result
 */
export interface LineCounts {
  humanLines: number;
  claudeLines: number;
  humanCommits: number;
  claudeCommits: number;
  fromCache: boolean;
  commitsScanned: number;
}

/**
 * Check if we're in a git repository
 */
function isGitRepo(projectPath: string): boolean {
  try {
    execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current HEAD commit hash
 */
function getHeadCommit(projectPath: string): string | null {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get the current HEAD commit hash (exported version)
 */
export function getHeadCommitHash(projectPath: string): string | null {
  return getHeadCommit(projectPath);
}

/**
 * Get total number of commits in the repo
 */
export function getTotalCommitCount(projectPath: string): number {
  try {
    const output = execSync("git rev-list --count HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
    });
    return parseInt(output.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Commit info for display
 */
export interface CommitInfo {
  shortHash: string;
  title: string;
  date: Date;
}

/**
 * Get info about a specific commit
 * Returns null if the commit doesn't exist
 */
export function getCommitInfo(projectPath: string, commitHash: string): CommitInfo | null {
  // Format: short hash, subject (title), ISO date
  const output = execSync(`git log -1 --format="%h%x00%s%x00%cI" ${commitHash}`, {
    cwd: projectPath,
    encoding: "utf-8",
  }).trim();

  if (!output) {
    return null;
  }

  const [shortHash, title, dateStr] = output.split("\0");
  return {
    shortHash,
    title,
    date: new Date(dateStr),
  };
}

/**
 * Get the hash of the Nth commit (1-indexed, chronological order)
 * Returns null if there aren't enough commits
 */
export function getNthCommitHash(projectPath: string, n: number): string | null {
  try {
    // Get all commits in chronological order (oldest first)
    const output = execSync(`git rev-list --reverse HEAD`, {
      cwd: projectPath,
      encoding: "utf-8",
    });

    const commits = output.trim().split("\n").filter(Boolean);
    if (commits.length >= n) {
      return commits[n - 1]; // n is 1-indexed
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a commit is an ancestor of HEAD
 */
function isAncestor(projectPath: string, commit: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${commit} HEAD`, {
      cwd: projectPath,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the cache file path
 */
function getCachePath(projectPath: string): string {
  return path.join(projectPath, CACHE_FILE);
}

/**
 * Load cache from file
 */
function loadCache(projectPath: string): GitHistoryCache | null {
  const cachePath = getCachePath(projectPath);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(cachePath, "utf-8");
    const json = JSON.parse(raw);
    return GitHistoryCacheSchema.parse(json);
  } catch {
    return null;
  }
}

/**
 * Save cache to file
 */
function saveCache(projectPath: string, cache: GitHistoryCache): void {
  const cachePath = getCachePath(projectPath);
  const stpDir = path.dirname(cachePath);

  if (!fs.existsSync(stpDir)) {
    fs.mkdirSync(stpDir, { recursive: true });
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
}

/**
 * Clear the cache
 */
export function clearCache(projectPath: string): void {
  const cachePath = getCachePath(projectPath);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
  }
}

/**
 * Parse a commit to get line counts and attribution
 */
function parseCommit(
  projectPath: string,
  commitHash: string,
  parentHash: string | null
): { humanLines: number; claudeLines: number; isClaudeCommit: boolean } {
  // Check if commit is co-authored by Claude
  const message = execSync(`git log -1 --format="%B" ${commitHash}`, {
    cwd: projectPath,
    encoding: "utf-8",
  });

  const isClaude = /Co-Authored-By:.*Claude/i.test(message);

  // Get lines added in this commit
  let linesAdded = 0;
  let linesDeleted = 0;
  try {
    let diffCmd: string;
    if (parentHash) {
      diffCmd = `git diff --numstat ${parentHash} ${commitHash}`;
    } else {
      // First commit - diff against empty tree
      diffCmd = `git diff --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 ${commitHash}`;
    }

    const numstat = execSync(diffCmd, {
      cwd: projectPath,
      encoding: "utf-8",
    });

    // Parse numstat output: "added\tdeleted\tfilename"
    for (const line of numstat.split("\n")) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const added = parseInt(parts[0], 10);
        const deleted = parseInt(parts[1], 10);
        if (!isNaN(added)) {
          linesAdded += added;
        }
        if (!isNaN(deleted)) {
          linesDeleted += deleted;
        }
      }
    }
  } catch {
    // Ignore errors (e.g., binary files)
  }

  return {
    humanLines: isClaude ? 0 : linesAdded + linesDeleted,
    claudeLines: isClaude ? linesAdded + linesDeleted : 0,
    isClaudeCommit: isClaude,
  };
}

function getCurrentGitUser(projectPath: string): string {
  const gitUser = execSync("git config user.email", {
    cwd: projectPath,
    encoding: "utf-8",
  }).trim();
  if (!gitUser) {
    throw new Error("git user.email is not set.");
  }
  return gitUser;
}

/**
 * Get commit hashes from startCommit (exclusive) to endCommit (inclusive)
 * Returns array of { hash, parent } objects, oldest first
 * @param since Optional date to filter commits (git --since flag)
 */
function getCommitRange(
  projectPath: string,
  startCommit: string | null,
  endCommit: string,
  since?: Date
): Array<{ hash: string; parent: string | null }> {
  try {
    const range = startCommit ? `${startCommit}..${endCommit}` : endCommit;

    // Build git log command with optional --since flag
    const sinceArg = since ? `--since="${since.toISOString()}"` : "";
    const userEmail = getCurrentGitUser(projectPath);
    const authorArg = userEmail ? `--author="${userEmail}"` : "";
    const cmd = `git log --reverse --format="%H %P" ${authorArg} ${sinceArg} ${range}`.trim();

    // Get commits with their parents
    const output = execSync(cmd, {
      cwd: projectPath,
      encoding: "utf-8",
    });

    const commits: Array<{ hash: string; parent: string | null }> = [];

    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      const parts = line.trim().split(" ");
      const hash = parts[0];
      const parent = parts[1] || null;
      commits.push({ hash, parent });
    }

    return commits;
  } catch {
    return [];
  }
}

/**
 * Calculate line counts from git history with caching
 */
export function getLineCounts(projectPath: string): LineCounts {
  // Default result for non-git repos
  if (!isGitRepo(projectPath)) {
    throw new Error("Must be a git repo");
  }

  const head = getHeadCommit(projectPath);
  if (!head) {
    throw new Error("Head commit not found");
  }

  const currentGitUser = getCurrentGitUser(projectPath);

  // Try to load cache
  const cache = loadCache(projectPath);

  // Check if cache is valid and up to date
  if (cache && cache.lastCommit === head && cache.userEmail === currentGitUser) {
    return {
      humanLines: cache.humanLines,
      claudeLines: cache.claudeLines,
      humanCommits: cache.humanCommits,
      claudeCommits: cache.claudeCommits,
      fromCache: true,
      commitsScanned: 0,
    };
  }

  // Check if cache is valid but needs incremental update
  let startCommit: string | null = null;
  let humanLines = 0;
  let claudeLines = 0;
  let humanCommits = 0;
  let claudeCommits = 0;

  if (cache && cache.userEmail === currentGitUser && isAncestor(projectPath, cache.lastCommit)) {
    // Cache is valid, start from there
    startCommit = cache.lastCommit;
    humanLines = cache.humanLines;
    claudeLines = cache.claudeLines;
    humanCommits = cache.humanCommits;
    claudeCommits = cache.claudeCommits;
  }

  // Get commits to process
  const commits = getCommitRange(projectPath, startCommit, head);

  // Process each commit
  for (const { hash, parent } of commits) {
    const result = parseCommit(projectPath, hash, parent);
    humanLines += result.humanLines;
    claudeLines += result.claudeLines;
    if (result.isClaudeCommit) {
      claudeCommits++;
    } else {
      humanCommits++;
    }
  }

  // Save updated cache
  saveCache(projectPath, {
    userEmail: currentGitUser,
    lastCommit: head,
    humanLines,
    claudeLines,
    humanCommits,
    claudeCommits,
  });

  return {
    humanLines,
    claudeLines,
    humanCommits,
    claudeCommits,
    fromCache: false,
    commitsScanned: commits.length,
  };
}

/**
 * Get line counts with optional filters
 * @param since If null, no time filter. If Date, filters commits after this date.
 * @param afterCommit If provided, only includes commits after this commit hash (exclusive).
 */
export function getLineCountsWithWindow(
  projectPath: string,
  options: { since: Date | null; afterCommit?: string | null }
): LineCounts {
  // If no filters at all, use the cached version
  if (options.since === null && !options.afterCommit) {
    return getLineCounts(projectPath);
  }

  // Filtered query bypasses cache
  if (!isGitRepo(projectPath)) {
    throw new Error("Must be a git repo");
  }

  const head = getHeadCommit(projectPath);
  if (!head) {
    throw new Error("Head commit not found");
  }

  // Get commits with optional start commit filter
  const startCommit = options.afterCommit ?? null;
  const commits = getCommitRange(projectPath, startCommit, head, options.since ?? undefined);

  let humanLines = 0;
  let claudeLines = 0;
  let humanCommits = 0;
  let claudeCommits = 0;

  // Process each commit
  for (const { hash, parent } of commits) {
    const result = parseCommit(projectPath, hash, parent);
    humanLines += result.humanLines;
    claudeLines += result.claudeLines;
    if (result.isClaudeCommit) {
      claudeCommits++;
    } else {
      humanCommits++;
    }
  }

  return {
    humanLines,
    claudeLines,
    humanCommits,
    claudeCommits,
    fromCache: false,
    commitsScanned: commits.length,
  };
}
