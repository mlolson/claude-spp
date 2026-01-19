import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { loadConfig, saveConfig, isDojoInitialized, getDojoDir } from "./config/loader.js";
import { DEFAULT_CONFIG, PRESET_RATIOS, PresetSchema } from "./config/schema.js";
import { saveState } from "./state/manager.js";
import { createDefaultState } from "./state/schema.js";
import { initializeTaskDirs, areTaskDirsInitialized } from "./tasks/directories.js";
const DOJO_START_MARKER = "<!-- DOJO:START -->";
const DOJO_END_MARKER = "<!-- DOJO:END -->";
/**
 * Generate dojo instructions content for CLAUDE.md
 */
function generateDojoInstructions(preset) {
    const targetPercent = Math.round(PRESET_RATIOS[preset] * 100);
    return `${DOJO_START_MARKER}
## Dojo Mode

This project has **Dojo mode** enabled. Dojo helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

**Current Configuration:** ${preset} preset (${targetPercent}% human-written code target)

### Rules for Claude

**Before writing code:**
1. Check the ratio with \`node dist/cli.js status\`
2. If ratio is below ${targetPercent}%, prefer teaching over writing code
3. Offer guidance first - ask if the human wants to try it themselves
4. Create a task and ask whether it should be assigned to user or claude: \`node dist/cli.js create "title"\`

**When asked to write code:**
- If ratio is healthy (≥${targetPercent}% human): write code freely
- If ratio is unhealthy (<${targetPercent}% human): inform the human and offer to guide them instead

### Line Tracking

Lines are tracked via git post-commit hook

Commits with \`Co-Authored-By: Claude\` are skipped to avoid double-counting.

### Commands

\`\`\`bash
node dist/cli.js status              # Show current ratio
node dist/cli.js tasks               # List all tasks
node dist/cli.js create "title"      # Create a new task
node dist/cli.js assign <file> human # Assign task to human
node dist/cli.js complete <file> human # Mark complete
\`\`\`

### Learning

Use \`/dojo:quiz\` to test your knowledge of the codebase.
${DOJO_END_MARKER}`;
}
/**
 * Update CLAUDE.md with dojo instructions
 * Inserts or updates content between DOJO markers
 */
function updateClaudeMd(projectPath, preset) {
    const claudeMdPath = path.join(projectPath, "CLAUDE.md");
    const dojoContent = generateDojoInstructions(preset);
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
 */
function installGitHook(projectPath) {
    if (!isGitRepo(projectPath)) {
        return false;
    }
    const gitHooksDir = path.join(projectPath, ".git", "hooks");
    const hookPath = path.join(gitHooksDir, "post-commit");
    const sourceHook = path.join(projectPath, "hooks", "git-post-commit.sh");
    // Check if source hook exists
    if (!fs.existsSync(sourceHook)) {
        return false;
    }
    // Check if hook already exists
    if (fs.existsSync(hookPath)) {
        const existing = fs.readFileSync(hookPath, "utf-8");
        if (existing.includes("Dojo post-commit hook")) {
            return true; // Already installed
        }
        return false; // Different hook exists, don't overwrite
    }
    // Ensure hooks directory exists
    if (!fs.existsSync(gitHooksDir)) {
        fs.mkdirSync(gitHooksDir, { recursive: true });
    }
    // Copy hook and make executable
    const hookContent = fs.readFileSync(sourceHook, "utf-8");
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    return true;
}
/**
 * Prompt user to select a preset interactively
 */
async function promptForPreset() {
    const presets = PresetSchema.options;
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        console.log("\nAvailable presets:");
        presets.forEach((preset, index) => {
            const ratio = Math.round(PRESET_RATIOS[preset] * 100);
            const defaultMarker = preset === "balanced" ? " (default)" : "";
            console.log(`  ${index + 1}. ${preset} - ${ratio}% human-written code${defaultMarker}`);
        });
        console.log("");
        rl.question("Select a preset [1-4, or press Enter for balanced]: ", (answer) => {
            rl.close();
            const trimmed = answer.trim();
            if (trimmed === "") {
                resolve("balanced");
                return;
            }
            const num = parseInt(trimmed, 10);
            if (num >= 1 && num <= presets.length) {
                resolve(presets[num - 1]);
                return;
            }
            // Try to match by name
            const matched = presets.find(p => p.toLowerCase() === trimmed.toLowerCase());
            if (matched) {
                resolve(matched);
                return;
            }
            console.log("Invalid selection, using default (balanced)");
            resolve("balanced");
        });
    });
}
/**
 * Initialize Dojo in a project
 * Creates .dojo directory with config, state, and task directories
 */
export async function initializeDojo(projectPath, preset) {
    const dojoDir = getDojoDir(projectPath);
    // Create .dojo directory if it doesn't exist
    if (!fs.existsSync(dojoDir)) {
        fs.mkdirSync(dojoDir, { recursive: true });
    }
    // Prompt for preset if not provided
    const selectedPreset = preset ?? await promptForPreset();
    // Initialize config
    const config = {
        ...DEFAULT_CONFIG,
        preset: selectedPreset,
    };
    saveConfig(projectPath, config);
    // Initialize state
    const state = createDefaultState();
    saveState(projectPath, state);
    // Initialize task directories
    initializeTaskDirs(projectPath);
    // Create .gitignore for state.json
    const gitignorePath = path.join(dojoDir, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, "state.json\n", "utf-8");
    }
    // Install git hook for tracking human lines
    installGitHook(projectPath);
    // Update CLAUDE.md with dojo instructions
    updateClaudeMd(projectPath, config.preset);
    return config;
}
/**
 * Check if Dojo is fully initialized
 */
export function isFullyInitialized(projectPath) {
    return isDojoInitialized(projectPath) && areTaskDirsInitialized(projectPath);
}
/**
 * Ensure Dojo is initialized, initializing if needed
 */
export async function ensureInitialized(projectPath, preset) {
    if (!isFullyInitialized(projectPath)) {
        return initializeDojo(projectPath, preset);
    }
    return loadConfig(projectPath);
}
//# sourceMappingURL=init.js.map