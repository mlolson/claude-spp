import { GitProvider } from "./git-provider.js";
import { HgProvider } from "./hg-provider.js";
// Singleton instances
let gitProvider = null;
let hgProvider = null;
function getGitProvider() {
    if (!gitProvider) {
        gitProvider = new GitProvider();
    }
    return gitProvider;
}
function getHgProvider() {
    if (!hgProvider) {
        hgProvider = new HgProvider();
    }
    return hgProvider;
}
/**
 * Get the appropriate VCS provider
 *
 * @param projectPath - The project directory
 * @param vcsType - VCS type (defaults to "git")
 */
export function getProvider(projectPath, vcsType = "git") {
    switch (vcsType) {
        case "git":
            return getGitProvider();
        case "hg":
            return getHgProvider();
        default:
            throw new Error(`Unsupported VCS type: ${vcsType}`);
    }
}
// Re-export convenience functions that use auto-detection
/**
 * Get line counts using specified or auto-detected VCS
 */
export function getLineCounts(projectPath, vcsType) {
    return getProvider(projectPath, vcsType).getLineCounts(projectPath);
}
/**
 * Get line counts with window using specified or auto-detected VCS
 */
export function getLineCountsWithWindow(projectPath, options, vcsType) {
    return getProvider(projectPath, vcsType).getLineCountsWithWindow(projectPath, options);
}
/**
 * Get head commit hash using specified or auto-detected VCS
 */
export function getHeadCommitHash(projectPath, vcsType) {
    return getProvider(projectPath, vcsType).getHeadCommitHash(projectPath);
}
/**
 * Get total commit count using specified or auto-detected VCS
 */
export function getTotalCommitCount(projectPath, vcsType) {
    return getProvider(projectPath, vcsType).getTotalCommitCount(projectPath);
}
/**
 * Get commit info using specified or auto-detected VCS
 */
export function getCommitInfo(projectPath, commitHash, vcsType) {
    return getProvider(projectPath, vcsType).getCommitInfo(projectPath, commitHash);
}
/**
 * Clear cache using specified or auto-detected VCS
 */
export function clearCache(projectPath, vcsType) {
    try {
        getProvider(projectPath, vcsType).clearCache(projectPath);
    }
    catch {
        // Ignore errors if VCS not detected
    }
}
//# sourceMappingURL=index.js.map