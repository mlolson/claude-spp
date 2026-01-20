import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { z } from "zod";
const CACHE_FILE = ".dojo/.git_history_cache.json";
/**
 * Cache schema for git history line counts
 */
const GitHistoryCacheSchema = z.object({
    lastCommit: z.string(),
    humanLines: z.number().int().min(0),
    claudeLines: z.number().int().min(0),
    humanCommits: z.number().int().min(0),
    claudeCommits: z.number().int().min(0),
});
/**
 * Check if we're in a git repository
 */
function isGitRepo(projectPath) {
    try {
        execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the current HEAD commit hash
 */
function getHeadCommit(projectPath) {
    try {
        return execSync("git rev-parse HEAD", {
            cwd: projectPath,
            encoding: "utf-8",
        }).trim();
    }
    catch {
        return null;
    }
}
/**
 * Check if a commit is an ancestor of HEAD
 */
function isAncestor(projectPath, commit) {
    try {
        execSync(`git merge-base --is-ancestor ${commit} HEAD`, {
            cwd: projectPath,
            stdio: "ignore",
        });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the cache file path
 */
function getCachePath(projectPath) {
    return path.join(projectPath, CACHE_FILE);
}
/**
 * Load cache from file
 */
function loadCache(projectPath) {
    const cachePath = getCachePath(projectPath);
    if (!fs.existsSync(cachePath)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(cachePath, "utf-8");
        const json = JSON.parse(raw);
        return GitHistoryCacheSchema.parse(json);
    }
    catch {
        return null;
    }
}
/**
 * Save cache to file
 */
function saveCache(projectPath, cache) {
    const cachePath = getCachePath(projectPath);
    const dojoDir = path.dirname(cachePath);
    if (!fs.existsSync(dojoDir)) {
        fs.mkdirSync(dojoDir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
}
/**
 * Clear the cache
 */
export function clearCache(projectPath) {
    const cachePath = getCachePath(projectPath);
    if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
    }
}
/**
 * Parse a commit to get line counts and attribution
 */
function parseCommit(projectPath, commitHash, parentHash) {
    // Check if commit is co-authored by Claude
    const message = execSync(`git log -1 --format="%B" ${commitHash}`, {
        cwd: projectPath,
        encoding: "utf-8",
    });
    const isClaude = /Co-Authored-By:.*Claude/i.test(message);
    // Get lines added in this commit
    let linesAdded = 0;
    try {
        let diffCmd;
        if (parentHash) {
            diffCmd = `git diff --numstat ${parentHash} ${commitHash}`;
        }
        else {
            // First commit - diff against empty tree
            diffCmd = `git diff --numstat 4b825dc642cb6eb9a060e54bf8d69288fbee4904 ${commitHash}`;
        }
        const numstat = execSync(diffCmd, {
            cwd: projectPath,
            encoding: "utf-8",
        });
        // Parse numstat output: "added\tdeleted\tfilename"
        for (const line of numstat.split("\n")) {
            if (!line.trim())
                continue;
            const parts = line.split("\t");
            if (parts.length >= 2) {
                const added = parseInt(parts[0], 10);
                if (!isNaN(added)) {
                    linesAdded += added;
                }
            }
        }
    }
    catch {
        // Ignore errors (e.g., binary files)
    }
    return {
        humanLines: isClaude ? 0 : linesAdded,
        claudeLines: isClaude ? linesAdded : 0,
        isClaudeCommit: isClaude,
    };
}
/**
 * Get commit hashes from startCommit (exclusive) to endCommit (inclusive)
 * Returns array of { hash, parent } objects, oldest first
 */
function getCommitRange(projectPath, startCommit, endCommit) {
    try {
        const range = startCommit ? `${startCommit}..${endCommit}` : endCommit;
        // Get commits with their parents
        const output = execSync(`git log --reverse --format="%H %P" ${range}`, {
            cwd: projectPath,
            encoding: "utf-8",
        });
        const commits = [];
        for (const line of output.split("\n")) {
            if (!line.trim())
                continue;
            const parts = line.trim().split(" ");
            const hash = parts[0];
            const parent = parts[1] || null;
            commits.push({ hash, parent });
        }
        return commits;
    }
    catch {
        return [];
    }
}
/**
 * Calculate line counts from git history with caching
 */
export function getLineCounts(projectPath) {
    // Default result for non-git repos
    if (!isGitRepo(projectPath)) {
        return {
            humanLines: 0,
            claudeLines: 0,
            humanCommits: 0,
            claudeCommits: 0,
            fromCache: false,
            commitsScanned: 0,
        };
    }
    const head = getHeadCommit(projectPath);
    if (!head) {
        return {
            humanLines: 0,
            claudeLines: 0,
            humanCommits: 0,
            claudeCommits: 0,
            fromCache: false,
            commitsScanned: 0,
        };
    }
    // Try to load cache
    const cache = loadCache(projectPath);
    // Check if cache is valid and up to date
    if (cache && cache.lastCommit === head) {
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
    let startCommit = null;
    let humanLines = 0;
    let claudeLines = 0;
    let humanCommits = 0;
    let claudeCommits = 0;
    if (cache && isAncestor(projectPath, cache.lastCommit)) {
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
        }
        else {
            humanCommits++;
        }
    }
    // Save updated cache
    saveCache(projectPath, {
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
 * Force recalculation by clearing cache first
 */
export function recalculateLineCounts(projectPath) {
    clearCache(projectPath);
    return getLineCounts(projectPath);
}
//# sourceMappingURL=history.js.map