import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { loadConfig, saveConfig, isDojoInitialized, getDojoDir } from "./config/loader.js";
import { DEFAULT_CONFIG, MODES } from "./config/schema.js";
import { saveState } from "./state/manager.js";
import { createDefaultState } from "./state/schema.js";
const DOJO_START_MARKER = "<!-- DOJO:START -->";
const DOJO_END_MARKER = "<!-- DOJO:END -->";
/**
 * Generate dojo instructions content for CLAUDE.md
 */
function generateDojoInstructions(modeNumber) {
    const mode = MODES.find((m) => m.number === modeNumber) ?? MODES[3]; // Default to 50-50
    const targetPercent = Math.round(mode.humanRatio * 100);
    return `${DOJO_START_MARKER}
## Dojo Mode

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

**Current Mode:** ${mode.number}. ${mode.name} (${mode.description})

### Rules for Claude

**Before writing code:**
1. Check the ratio with \`node dist/cli.js status\`
2. If ratio is below ${targetPercent}%, prefer teaching over writing code
3. Offer guidance first - ask if the human wants to try it themselves

**When asked to write code:**
- If ratio is healthy (≥${targetPercent}% human): write code freely
- If ratio is unhealthy (<${targetPercent}% human): inform the human and offer to guide them instead

### Line Tracking

Lines are tracked via git commit history.

Commits with \`Co-Authored-By: Claude\` are attributed to Claude.

### Commands

\`\`\`bash
node dist/cli.js status              # Show current ratio
node dist/cli.js stats               # Show detailed statistics
node dist/cli.js mode [n]            # Show or change mode
\`\`\`
${DOJO_END_MARKER}`;
}
/**
 * Update CLAUDE.md with dojo instructions
 * Inserts or updates content between DOJO markers
 */
function updateClaudeMd(projectPath, modeNumber) {
    const claudeMdPath = path.join(projectPath, "CLAUDE.md");
    const dojoContent = generateDojoInstructions(modeNumber);
    if (!fs.existsSync(claudeMdPath)) {
        // No CLAUDE.md exists - create one with just dojo content
        fs.writeFileSync(claudeMdPath, dojoContent + "\n", "utf-8");
        return;
    }
    // Read existing content
    let content = fs.readFileSync(claudeMdPath, "utf-8");
    const startIndex = content.indexOf(DOJO_START_MARKER);
    const endIndex = content.indexOf(DOJO_END_MARKER);
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        // Replace existing dojo section
        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex + DOJO_END_MARKER.length);
        content = before + dojoContent + after;
    }
    else {
        // Append dojo section
        content = content.trimEnd() + "\n\n" + dojoContent + "\n";
    }
    fs.writeFileSync(claudeMdPath, content, "utf-8");
}
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
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export function installGitHook(projectPath) {
    // Verify this is a git repo
    if (!isGitRepo(projectPath)) {
        throw new Error("Not a git repository. Initialize git first with: git init");
    }
    const gitHooksDir = path.join(projectPath, ".git", "hooks");
    const hookPath = path.join(gitHooksDir, "post-commit");
    const sourceHook = path.join(projectPath, "src", "git", "hooks", "post-commit");
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
        if (existingContent.includes("# <STP>")) {
            fs.writeFileSync(hookPath, existingContent.replace(/# <STP>[\s\S]*?# <\/STP>/g, sourceContent));
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
 * Prompt user to select a mode interactively
 */
async function promptForMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        console.log("\nAvailable modes:");
        for (const mode of MODES) {
            const defaultMarker = mode.number === 4 ? " (default)" : "";
            console.log(`  ${mode.number}. ${mode.name} - ${mode.description}${defaultMarker}`);
        }
        console.log("");
        rl.question("Select a mode [1-6, or press Enter for 50-50]: ", (answer) => {
            rl.close();
            const trimmed = answer.trim();
            if (trimmed === "") {
                resolve(4); // 50-50 default
                return;
            }
            const num = parseInt(trimmed, 10);
            if (num >= 1 && num <= 6) {
                resolve(num);
                return;
            }
            // Try to match by name
            const matched = MODES.find(m => m.name.toLowerCase() === trimmed.toLowerCase());
            if (matched) {
                resolve(matched.number);
                return;
            }
            console.log("Invalid selection, using default (50-50)");
            resolve(4);
        });
    });
}
/**
 * Initialize Dojo in a project
 * Creates .dojo directory with config and state
 */
export async function initializeDojo(projectPath, modeNumber) {
    const dojoDir = getDojoDir(projectPath);
    // Create .dojo directory if it doesn't exist
    if (!fs.existsSync(dojoDir)) {
        fs.mkdirSync(dojoDir, { recursive: true });
    }
    // Prompt for mode if not provided
    const selectedMode = modeNumber ?? await promptForMode();
    // Initialize config
    const config = {
        ...DEFAULT_CONFIG,
        mode: selectedMode,
    };
    saveConfig(projectPath, config);
    // Initialize state
    const state = createDefaultState();
    saveState(projectPath, state);
    // Create .gitignore for state.json
    const gitignorePath = path.join(dojoDir, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, "state.json\n", "utf-8");
    }
    // Update CLAUDE.md with dojo instructions
    updateClaudeMd(projectPath, config.mode);
    return config;
}
/**
 * Check if Dojo is fully initialized
 */
export function isFullyInitialized(projectPath) {
    return isDojoInitialized(projectPath);
}
/**
 * Ensure Dojo is initialized, initializing if needed
 */
export async function ensureInitialized(projectPath, modeNumber) {
    if (!isFullyInitialized(projectPath)) {
        return initializeDojo(projectPath, modeNumber);
    }
    return loadConfig(projectPath);
}
//# sourceMappingURL=init.js.map