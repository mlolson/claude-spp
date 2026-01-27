import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import { VcsHistoryCacheSchema, } from "./types.js";
import { getSppDir } from "../config/loader.js";
const CACHE_FILENAME = ".vcs_history_cache.json";
/**
 * Mercurial VCS Provider implementation
 */
export class HgProvider {
    type = "hg";
    isRepo(projectPath) {
        try {
            execSync("hg root", { cwd: projectPath, stdio: "ignore" });
            return true;
        }
        catch {
            return false;
        }
    }
    getHeadCommitHash(projectPath) {
        try {
            return execSync('hg log -r . --template "{node}"', {
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
            // Count all ancestors of current revision including itself
            const output = execSync('hg log -r "ancestors(.) or ." --template "x"', {
                cwd: projectPath,
                encoding: "utf-8",
            });
            return output.length;
        }
        catch {
            return 0;
        }
    }
    getCommitInfo(projectPath, commitHash) {
        try {
            // Get short hash, first line of description, and date
            const output = execSync(`hg log -r "${commitHash}" --template "{node|short}\\0{desc|firstline}\\0{date|isodate}"`, {
                cwd: projectPath,
                encoding: "utf-8",
            }).trim();
            if (!output) {
                return null;
            }
            const [shortHash, title, dateStr] = output.split("\0");
            // Parse Mercurial's isodate format: "2024-01-15 10:30 -0500"
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
        return execSync(`hg log -r "${commitHash}" --template "{desc}"`, {
            cwd: projectPath,
            encoding: "utf-8",
        });
    }
    getNthCommitHash(projectPath, n) {
        try {
            // Get all commits in chronological order (oldest first)
            const output = execSync('hg log -r "sort(ancestors(.) or ., rev)" --template "{node}\\n"', {
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
            // Check if commit is in the ancestors of the current working directory parent
            const output = execSync(`hg log -r "ancestors(.) and ${commit}" --template "{node}"`, {
                cwd: projectPath,
                encoding: "utf-8",
            });
            return output.trim().length > 0;
        }
        catch {
            return false;
        }
    }
    getCurrentUserEmail(projectPath) {
        try {
            const username = execSync("hg config ui.username", {
                cwd: projectPath,
                encoding: "utf-8",
            }).trim();
            if (!username) {
                throw new Error("hg ui.username is not set.");
            }
            // Extract email from "Name <email>" format if present
            const emailMatch = username.match(/<([^>]+)>/);
            if (emailMatch) {
                return emailMatch[1];
            }
            // If it looks like an email already, return it
            if (username.includes("@")) {
                return username;
            }
            // Return the whole username as identifier
            return username;
        }
        catch {
            throw new Error("hg ui.username is not set.");
        }
    }
    getCommitRange(projectPath, startCommit, endCommit, since) {
        try {
            // Build revset expression
            let revset;
            if (startCommit) {
                // Commits after startCommit up to and including endCommit
                revset = `(${startCommit}::${endCommit}) and not ${startCommit}`;
            }
            else {
                // All ancestors including endCommit
                revset = `ancestors(${endCommit}) or ${endCommit}`;
            }
            // Add date filter if specified
            if (since) {
                const dateStr = since.toISOString().split("T")[0]; // YYYY-MM-DD
                revset = `(${revset}) and date(">=${dateStr}")`;
            }
            // Filter by current user
            const userEmail = this.getCurrentUserEmail(projectPath);
            // Escape special characters in email for revset
            const escapedUser = userEmail.replace(/[\\'"]/g, "\\$&");
            revset = `(${revset}) and author("${escapedUser}")`;
            // Sort by revision number (chronological order)
            const cmd = `hg log -r "sort(${revset}, rev)" --template "{node} {p1node}\\n"`;
            const output = execSync(cmd, {
                cwd: projectPath,
                encoding: "utf-8",
            });
            const commits = [];
            const nullNode = "0".repeat(40); // Mercurial's null node
            for (const line of output.split("\n")) {
                if (!line.trim())
                    continue;
                const parts = line.trim().split(" ");
                const hash = parts[0];
                const parent = parts[1] === nullNode ? null : parts[1];
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
            // Use hg diff with the change option to get diff for a specific commit
            // The --stat option gives a summary, but we need line counts
            // Use regular diff and count +/- lines
            let diffCmd;
            if (parentHash) {
                diffCmd = `hg diff -r ${parentHash} -r ${commitHash}`;
            }
            else {
                // First commit - diff against null
                diffCmd = `hg diff -r null -r ${commitHash}`;
            }
            const diff = execSync(diffCmd, {
                cwd: projectPath,
                encoding: "utf-8",
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large diffs
            });
            // Count lines starting with + or - (excluding +++ and --- header lines)
            for (const line of diff.split("\n")) {
                if (line.startsWith("+") && !line.startsWith("+++")) {
                    added++;
                }
                else if (line.startsWith("-") && !line.startsWith("---")) {
                    removed++;
                }
            }
        }
        catch {
            // Ignore errors (e.g., binary files)
        }
        return { added, removed };
    }
    getCachePath(projectPath) {
        return path.join(getSppDir(projectPath), CACHE_FILENAME);
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
            throw new Error("Must be a mercurial repo");
        }
        const head = this.getHeadCommitHash(projectPath);
        if (!head) {
            throw new Error("Head commit not found");
        }
        const currentUser = this.getCurrentUserEmail(projectPath);
        const cache = this.loadCache(projectPath);
        if (cache && cache.lastCommit === head && cache.userEmail === currentUser) {
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
        if (cache && cache.userEmail === currentUser && this.isAncestor(projectPath, cache.lastCommit)) {
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
            userEmail: currentUser,
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
            throw new Error("Must be a mercurial repo");
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
//# sourceMappingURL=hg-provider.js.map