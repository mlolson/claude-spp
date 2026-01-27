import { GitProvider } from "./git-provider.js";
import { HgProvider } from "./hg-provider.js";
import type { VcsProvider, VcsType, LineCounts, CommitInfo } from "./types.js";

export type { VcsProvider, VcsType, LineCounts, CommitInfo } from "./types.js";

// Singleton instances
let gitProvider: GitProvider | null = null;
let hgProvider: HgProvider | null = null;

function getGitProvider(): GitProvider {
  if (!gitProvider) {
    gitProvider = new GitProvider();
  }
  return gitProvider;
}

function getHgProvider(): HgProvider {
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
export function getProvider(projectPath: string, vcsType: VcsType = "git"): VcsProvider {
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
export function getLineCounts(projectPath: string, vcsType?: VcsType): LineCounts {
  return getProvider(projectPath, vcsType).getLineCounts(projectPath);
}

/**
 * Get line counts with window using specified or auto-detected VCS
 */
export function getLineCountsWithWindow(
  projectPath: string,
  options: { since: Date | null; afterCommit?: string | null },
  vcsType?: VcsType
): LineCounts {
  return getProvider(projectPath, vcsType).getLineCountsWithWindow(projectPath, options);
}

/**
 * Get head commit hash using specified or auto-detected VCS
 */
export function getHeadCommitHash(projectPath: string, vcsType?: VcsType): string | null {
  return getProvider(projectPath, vcsType).getHeadCommitHash(projectPath);
}

/**
 * Get total commit count using specified or auto-detected VCS
 */
export function getTotalCommitCount(projectPath: string, vcsType?: VcsType): number {
  return getProvider(projectPath, vcsType).getTotalCommitCount(projectPath);
}

/**
 * Get commit info using specified or auto-detected VCS
 */
export function getCommitInfo(projectPath: string, commitHash: string, vcsType?: VcsType): CommitInfo | null {
  return getProvider(projectPath, vcsType).getCommitInfo(projectPath, commitHash);
}

/**
 * Clear cache using specified or auto-detected VCS
 */
export function clearCache(projectPath: string, vcsType?: VcsType): void {
  try {
    getProvider(projectPath, vcsType).clearCache(projectPath);
  } catch {
    // Ignore errors if VCS not detected
  }
}
