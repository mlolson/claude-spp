import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig, saveConfig, isSppInitialized, getSppDir } from "./config/loader.js";
import { DEFAULT_CONFIG, MODES, STATS_WINDOW_LABELS, StatsWindowSchema, TRACKING_MODE_LABELS, TrackingModeSchema, } from "./config/schema.js";
import { getTotalCommitCount, getHeadCommitHash, } from "./vcs/index.js";
/**
 * Add an entry to .gitignore or .hgignore
 * Creates the ignore file if it doesn't exist
 */
function addToIgnoreFile(projectPath, entry, vcsType) {
    const ignoreFileName = vcsType === "git" ? ".gitignore" : ".hgignore";
    const ignorePath = path.join(projectPath, ignoreFileName);
    if (!fs.existsSync(ignorePath)) {
        console.log(`Creating ${ignoreFileName}...`);
        // For .hgignore, we need to specify syntax
        const content = vcsType === "hg" ? `syntax: glob\n${entry}\n` : `${entry}\n`;
        fs.writeFileSync(ignorePath, content, "utf-8");
        console.log(`Added "${entry}" to ${ignoreFileName}`);
        return;
    }
    const content = fs.readFileSync(ignorePath, "utf-8");
    const lines = content.split("\n").map(line => line.trim());
    if (lines.includes(entry)) {
        console.log(`"${entry}" already in ${ignoreFileName}`);
        return;
    }
    console.log(`Adding "${entry}" to ${ignoreFileName}...`);
    const newContent = content.trimEnd() + "\n" + entry + "\n";
    fs.writeFileSync(ignorePath, newContent, "utf-8");
    console.log(`Added "${entry}" to ${ignoreFileName}`);
}
/**
 * Check if the spp command is available globally
 */
function isSppCommandAvailable() {
    try {
        execSync("which spp", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Prompt user to install claude-spp globally
 * Skipped when SPP_SKIP_GLOBAL_CHECK=1 (for testing)
 */
function ensureGlobalInstall() {
    if (process.env.SPP_SKIP_GLOBAL_CHECK === "1") {
        return;
    }
    if (!isSppCommandAvailable()) {
        const packageName = "git+https://github.com/mlolson/claude-spp.git";
        throw new Error(`spp command not found. Please install:\n  npm install -g ${packageName}`);
    }
}
/**
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export function installGitHook(projectPath) {
    const gitHooksDir = path.join(projectPath, ".git", "hooks");
    const hookPath = path.join(gitHooksDir, "post-commit");
    // Resolve hook source relative to this module (in the installed package)
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const sourceHook = path.join(__dirname, "git", "hooks", "post-commit");
    // Check if source hook exists
    if (!fs.existsSync(sourceHook)) {
        throw new Error(`Source hook not found at: ${sourceHook}`);
    }
    // Ensure hooks directory exists
    if (!fs.existsSync(gitHooksDir)) {
        fs.mkdirSync(gitHooksDir, { recursive: true });
    }
    // Read source hook content
    const sourceContent = fs.readFileSync(sourceHook, "utf-8");
    const sourceContentWithShebang = "#!/bin/bash\n" + sourceContent;
    // Check if hook already contains our content
    if (fs.existsSync(hookPath)) {
        const existingContent = fs.readFileSync(hookPath, "utf-8");
        if (existingContent.includes("# <SPP>")) {
            fs.writeFileSync(hookPath, existingContent.replace(/# <SPP>[\s\S]*?# <\/SPP>/g, sourceContent));
        }
        else {
            if (existingContent.trim() === "") {
                // Hook exists but is empty - write full contents
                fs.writeFileSync(hookPath, sourceContentWithShebang);
            }
            else {
                // Hook exists and is not empty - append without shebang
                const newContent = existingContent.trimEnd() + "\n\n" + sourceContent;
                fs.writeFileSync(hookPath, newContent);
            }
        }
    }
    else {
        fs.writeFileSync(hookPath, sourceContentWithShebang);
    }
    // Ensure the file is executable
    fs.chmodSync(hookPath, 0o755);
}
/**
 * Install VCS hook based on detected VCS type
 * Note: Only Git hooks are supported currently
 */
export function installVcsHook(projectPath, vcsType) {
    if (vcsType === "git") {
        installGitHook(projectPath);
    }
    // Mercurial does not use a post-commit hook
}
/**
 * Prompt user to select a mode interactively
 */
async function promptForMode() {
    console.log("\nAvailable modes:\n");
    const maxNameLen = Math.max(...MODES.map(m => m.name.length));
    for (const mode of MODES) {
        const paddedName = mode.name.padEnd(maxNameLen);
        const defaultMarker = mode.number === 4 ? " (default)" : "";
        console.log(`  ${mode.number}. ${paddedName}   ${mode.description}${defaultMarker}`);
    }
    console.log("");
    let modeNumber = undefined;
    while (modeNumber === undefined) {
        const userResponse = await promptUser(`Select a mode [1-${MODES.length}, or press Enter for ${MODES[DEFAULT_CONFIG.mode - 1].description}]: `);
        if (userResponse === "") {
            modeNumber = DEFAULT_CONFIG.mode;
        }
        else {
            modeNumber = parseInt(userResponse, 10);
            if (modeNumber < 1 || modeNumber > MODES.length) {
                console.log(`Invalid mode: ${modeNumber}. Must be in range [1, ${MODES.length}]`);
                modeNumber = undefined;
            }
        }
    }
    return modeNumber;
}
/**
 * Prompt user to select a stats window interactively
 */
async function promptForStatsWindow() {
    const options = StatsWindowSchema.options;
    console.log("\nStats window (time period for tracking commits):\n");
    options.forEach((option, index) => {
        const label = STATS_WINDOW_LABELS[option];
        const defaultMarker = option === "oneWeek" ? " (default)" : "";
        console.log(`  ${index + 1}. ${label}${defaultMarker}`);
    });
    console.log("");
    while (true) {
        const userResponse = await promptUser(`Select a stats window [1-${options.length}, or press Enter for Last 7 days]: `);
        if (userResponse === "") {
            return "oneWeek";
        }
        const choice = parseInt(userResponse, 10);
        if (choice >= 1 && choice <= options.length) {
            return options[choice - 1];
        }
        console.log(`Invalid choice: ${userResponse}. Must be in range [1, ${options.length}]`);
    }
}
/**
 * Prompt user to select a tracking mode interactively
 */
async function promptForTrackingMode() {
    const options = TrackingModeSchema.options;
    console.log("\nTracking mode (what to count for ratio calculation):\n");
    options.forEach((option, index) => {
        const label = TRACKING_MODE_LABELS[option];
        const defaultMarker = option === "commits" ? " (default)" : "";
        console.log(`  ${index + 1}. ${label}${defaultMarker}`);
    });
    console.log("");
    while (true) {
        const userResponse = await promptUser(`Select a tracking mode [1-${options.length}, or press Enter for Commits]: `);
        if (userResponse === "") {
            return "commits";
        }
        const choice = parseInt(userResponse, 10);
        if (choice >= 1 && choice <= options.length) {
            return options[choice - 1];
        }
        console.log(`Invalid choice: ${userResponse}. Must be in range [1, ${options.length}]`);
    }
}
async function promptShouldOverwriteInstall() {
    const answer = await promptUser("An SPP installation already exists. Overwrite it? N/Y\n");
    return answer.toLowerCase() === "y";
}
/**
 * Prompt user to select VCS type
 */
async function promptForVcsType() {
    console.log("\nVersion control system for this repo:\n");
    console.log("  1. Git (default)");
    console.log("  2. Mercurial (hg)");
    console.log("");
    while (true) {
        const userResponse = await promptUser("Select VCS type [1-2, or press Enter for Git]: ");
        if (userResponse === "" || userResponse === "1") {
            return "git";
        }
        if (userResponse === "2") {
            return "hg";
        }
        console.log(`Invalid choice: ${userResponse}. Must be 1 or 2.`);
    }
}
export async function promptUser(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
/**
 * Initialize SPP in a project
 * Creates .claude-spp directory with config
 * @param projectPath Path to the project
 * @param modeNumber Optional mode number to skip the mode prompt
 * @param statsWindow Optional stats window to skip the stats window prompt
 * @param trackingMode Optional tracking mode to skip the tracking mode prompt
 * @param vcsType Optional VCS type to skip the VCS prompt
 */
export async function initializeSpp(projectPath, modeNumber, statsWindow, trackingMode, vcsType) {
    console.log([
        "",
        "                _____ ____  ____",
        "      _        / ___// __ \\/ __ \\",
        "     c -.      \\__ \\/ /_/ / /_/ /",
        "\\_   / \\      ___/ / ____/ ____/ ",
        "  \\_| ||     /____/_/   /_/      ",
        "",
        "Simian Programmer Plugin for Claude AI: For monkeys who like to code",
        ""
    ].join("\n"));
    // Prompt for VCS type if not provided
    const selectedVcsType = vcsType ?? await promptForVcsType();
    // Ensure spp command is installed globally (required for hooks)
    await ensureGlobalInstall();
    const sppDir = getSppDir(projectPath);
    // Create .claude-spp directory if it doesn't exist
    if (fs.existsSync(sppDir)) {
        if (await promptShouldOverwriteInstall()) {
            console.log("Removing existing install...");
            fs.rmSync(sppDir, { recursive: true, force: true });
        }
        else {
            console.log("Aborting install...");
            return await loadConfig(projectPath);
        }
    }
    fs.mkdirSync(sppDir, { recursive: true });
    // Prompt for mode if not provided
    const selectedMode = modeNumber ?? await promptForMode();
    if (selectedMode < 1 || selectedMode > MODES.length) {
        throw new Error(`Invalid mode: ${selectedMode}. Must be in range [1, ${MODES.length}]`);
    }
    // Prompt for tracking mode if not provided
    const selectedTrackingMode = trackingMode ?? await promptForTrackingMode();
    // Prompt for stats window if not provided
    const selectedStatsWindow = statsWindow ?? await promptForStatsWindow();
    // Initialize config with selected VCS type
    const config = {
        ...DEFAULT_CONFIG,
        mode: selectedMode,
        trackingMode: selectedTrackingMode,
        statsWindow: selectedStatsWindow,
        vcsType: selectedVcsType,
    };
    // For pre-existing repos with commits, set trackingStartCommit to HEAD
    // This gives them a clean slate - only new commits after init will be tracked
    const totalCommits = getTotalCommitCount(projectPath, selectedVcsType);
    if (totalCommits > 0) {
        const headCommit = getHeadCommitHash(projectPath, selectedVcsType);
        if (headCommit) {
            config.trackingStartCommit = headCommit;
        }
    }
    saveConfig(projectPath, config);
    // Update ignore file to exclude SPP files
    addToIgnoreFile(projectPath, ".claude-spp/", selectedVcsType);
    // Install VCS post-commit hook
    installVcsHook(projectPath, selectedVcsType);
    return config;
}
/**
 * Check if SPP is fully initialized
 */
export function isFullyInitialized(projectPath) {
    return isSppInitialized(projectPath);
}
/**
 * Ensure SPP is initialized, initializing if needed
 */
export async function ensureInitialized(projectPath, modeNumber, statsWindow, trackingMode, vcsType) {
    if (!isFullyInitialized(projectPath)) {
        return initializeSpp(projectPath, modeNumber, statsWindow, trackingMode, vcsType);
    }
    return loadConfig(projectPath);
}
//# sourceMappingURL=init.js.map