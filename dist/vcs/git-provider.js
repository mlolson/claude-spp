import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { VcsHistoryCacheSchema, } from "./types.js";
const CACHE_FILE = ".claude-spp/.vcs_history_cache.json";
/**
 * Git VCS Provider implementation
 */
export class GitProvider {
    type = "git";
    isRepo(projectPath) {
        try {
            execSync("git rev-parse --git-dir", { cwd: projectPath, stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    getHeadCommitHash(projectPath) {
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
    getTotalCommitCount(projectPath) {
        try {
            const output = execSync("git rev-list --count HEAD", {
                cwd: projectPath,
                encoding: "utf-8",
            });
            return parseInt(output.trim(), 10) || 0;
        }
        catch {
            return 0;
        }
    }
    getCommitInfo(projectPath, commitHash) {
        try {
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
        catch {
            return null;
        }
    }
    getFullCommitMessage(projectPath, commitHash) {
        return execSync(`git log -1 --format="%B" ${commitHash}`, {
            cwd: projectPath,
            encoding: "utf-8",
        });
    }
    getNthCommitHash(projectPath, n) {
        try {
            const output = execSync(`git rev-list --reverse HEAD`, {
                cwd: projectPath,
                encoding: "utf-8",
            });
            const commits = output.trim().split("\n").filter(Boolean);
            if (commits.length >= n) {
                return commits[n - 1];
            }
            return null;
        }
        catch {
            return null;
        }
    }
    isAncestor(projectPath, commit) {
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
    getCurrentUserEmail(projectPath) {
        const gitUser = execSync("git config user.email", {
            cwd: projectPath,
            encoding: "utf-8",
        }).trim();
        if (!gitUser) {
            throw new Error("git user.email is not set.");
        }
        return gitUser;
    }
    getCommitRange(projectPath, startCommit, endCommit, since) {
        try {
            const range = startCommit ? `${startCommit}..${endCommit}` : endCommit;
            const sinceArg = since ? `--since="${since.toISOString()}"` : "";
            const userEmail = this.getCurrentUserEmail(projectPath);
            const authorArg = userEmail ? `--author="${userEmail}"` : "";
            const cmd = `git log --reverse --format="%H %P" ${authorArg} ${sinceArg} ${range}`.trim();
            const output = execSync(cmd, {
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
    getLineDiff(projectPath, commitHash, parentHash) {
        let added = 0;
        let removed = 0;
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
            for (const line of numstat.split("\n")) {
                if (!line.trim())
                    continue;
                const parts = line.split("\t");
                if (parts.length >= 2) {
                    const addedCount = parseInt(parts[0], 10);
                    const removedCount = parseInt(parts[1], 10);
                    if (!isNaN(addedCount)) {
                        added += addedCount;
                    }
                    if (!isNaN(removedCount)) {
                        removed += removedCount;
                    }
                }
            }
        }
        catch {
            // Ignore errors (e.g., binary files)
        }
        return { added, removed };
    }
    getCachePath(projectPath) {
        return path.join(projectPath, CACHE_FILE);
    }
    loadCache(projectPath) {
        const cachePath = this.getCachePath(projectPath);
        if (!fs.existsSync(cachePath)) {
            return null;
        }
        try {
            const raw = fs.readFileSync(cachePath, "utf-8");
            const json = JSON.parse(raw);
            return VcsHistoryCacheSchema.parse(json);
        }
        catch {
            return null;
        }
    }
    saveCache(projectPath, cache) {
        const cachePath = this.getCachePath(projectPath);
        const sppDir = path.dirname(cachePath);
        if (!fs.existsSync(sppDir)) {
            fs.mkdirSync(sppDir, { recursive: true });
        }
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + "\n", "utf-8");
    }
    clearCache(projectPath) {
        const cachePath = this.getCachePath(projectPath);
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
        }
    }
    parseCommit(projectPath, commitHash, parentHash) {
        const message = this.getFullCommitMessage(projectPath, commitHash);
        const isClaude = /Co-Authored-By:.*Claude/i.test(message);
        const { added, removed } = this.getLineDiff(projectPath, commitHash, parentHash);
        const totalLines = added + removed;
        return {
            humanLines: isClaude ? 0 : totalLines,
            claudeLines: isClaude ? totalLines : 0,
            isClaudeCommit: isClaude,
        };
    }
    getLineCounts(projectPath) {
        if (!this.isRepo(projectPath)) {
            throw new Error("Must be a git repo");
        }
        const head = this.getHeadCommitHash(projectPath);
        if (!head) {
            throw new Error("Head commit not found");
        }
        const currentGitUser = this.getCurrentUserEmail(projectPath);
        const cache = this.loadCache(projectPath);
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
        let startCommit = null;
        let humanLines = 0;
        let claudeLines = 0;
        let humanCommits = 0;
        let claudeCommits = 0;
        if (cache && cache.userEmail === currentGitUser && this.isAncestor(projectPath, cache.lastCommit)) {
            startCommit = cache.lastCommit;
            humanLines = cache.humanLines;
            claudeLines = cache.claudeLines;
            humanCommits = cache.humanCommits;
            claudeCommits = cache.claudeCommits;
        }
        const commits = this.getCommitRange(projectPath, startCommit, head);
        for (const { hash, parent } of commits) {
            const result = this.parseCommit(projectPath, hash, parent);
            humanLines += result.humanLines;
            claudeLines += result.claudeLines;
            if (result.isClaudeCommit) {
                claudeCommits++;
            }
            else {
                humanCommits++;
            }
        }
        this.saveCache(projectPath, {
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
    getLineCountsWithWindow(projectPath, options) {
        if (options.since === null && !options.afterCommit) {
            return this.getLineCounts(projectPath);
        }
        if (!this.isRepo(projectPath)) {
            throw new Error("Must be a git repo");
        }
        const head = this.getHeadCommitHash(projectPath);
        if (!head) {
            throw new Error("Head commit not found");
        }
        const startCommit = options.afterCommit ?? null;
        const commits = this.getCommitRange(projectPath, startCommit, head, options.since ?? undefined);
        let humanLines = 0;
        let claudeLines = 0;
        let humanCommits = 0;
        let claudeCommits = 0;
        for (const { hash, parent } of commits) {
            const result = this.parseCommit(projectPath, hash, parent);
            humanLines += result.humanLines;
            claudeLines += result.claudeLines;
            if (result.isClaudeCommit) {
                claudeCommits++;
            }
            else {
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
}
//# sourceMappingURL=git-provider.js.map