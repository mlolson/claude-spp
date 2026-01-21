import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { loadConfig, saveConfig, isStpInitialized, getStpDir } from "./config/loader.js";
import {
  DEFAULT_CONFIG,
  type Config,
  MODES,
  getCurrentMode,
  STATS_WINDOW_LABELS,
  StatsWindowSchema,
  type StatsWindow,
} from "./config/schema.js";

const STP_START_MARKER = "<!-- STP:START -->";
const STP_END_MARKER = "<!-- STP:END -->";

/**
 * Generate STP instructions content for CLAUDE.md
 */
function generateStpInstructions(): string {

  return `${STP_START_MARKER}
## STP Mode

This project has **STP mode** enabled. STP helps maintain programming skills by ensuring
the human writes a minimum percentage of code themselves.

### Rules for Claude

**Before writing code:**
1. Check the ratio with \`stp status\`
2. If ratio is below target, prefer teaching over writing code
3. Offer guidance first - ask if the human wants to try it themselves

**When asked to write code:**
- If ratio of human written code is healthy: write code freely
- If ratio is of human written code is unhealthy: inform the human and offer to guide them instead. Do not allow them to bypass.

### Line Tracking

Lines are tracked via git commit history.

Commits with \`Co-Authored-By: Claude\` are attributed to Claude.

### Commands

\`\`\`bash
stp status              # Show current ratio
stp stats               # Show detailed statistics
stp mode [n]            # Show or change mode
\`\`\`
${STP_END_MARKER}`;
}

/**
 * Update CLAUDE.md with STP instructions
 * Inserts or updates content between STP markers
 */
function updateClaudeMd(projectPath: string): void {
  const claudeMdPath = path.join(projectPath, "CLAUDE.local.md");
  const stpContent = generateStpInstructions();

  if (!fs.existsSync(claudeMdPath)) {
    // No CLAUDE.md exists - create one with just STP content
    fs.writeFileSync(claudeMdPath, stpContent + "\n", "utf-8");
    return;
  }

  // Read existing content
  let content = fs.readFileSync(claudeMdPath, "utf-8");

  const startIndex = content.indexOf(STP_START_MARKER);
  const endIndex = content.indexOf(STP_END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    // Replace existing STP section
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex + STP_END_MARKER.length);
    content = before + stpContent + after;
  } else {
    // Append STP section
    content = content.trimEnd() + "\n\n" + stpContent + "\n";
  }

  fs.writeFileSync(claudeMdPath, content, "utf-8");
}

/**
 * Add an entry to .gitignore
 * Creates .gitignore if it doesn't exist
 */
function addToGitignore(projectPath: string, entry: string): void {
  const gitignorePath = path.join(projectPath, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    console.log("Creating .gitignore...");
    fs.writeFileSync(gitignorePath, entry + "\n", "utf-8");
    console.log(`Added "${entry}" to .gitignore`);
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf-8");
  const lines = content.split("\n").map(line => line.trim());

  if (lines.includes(entry)) {
    console.log(`"${entry}" already in .gitignore`);
    return;
  }

  console.log(`Adding "${entry}" to .gitignore...`);
  const newContent = content.trimEnd() + "\n" + entry + "\n";
  fs.writeFileSync(gitignorePath, newContent, "utf-8");
  console.log(`Added "${entry}" to .gitignore`);
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
 * Check if the stp command is available globally
 */
function isStpCommandAvailable(): boolean {
  try {
    execSync("which stp", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Prompt user to install claude-stp globally
 * Returns true if installation was successful or already installed
 */
async function ensureGlobalInstall(): Promise<boolean> {
  if (isStpCommandAvailable()) {
    return true;
  }

  console.log("\nThe 'stp' command is not installed globally.");
  console.log("It needs to be installed for the hooks to work correctly.\n");

  const shouldInstall = await promptUser("Install claude-stp globally? (Y/n): ");
  if (shouldInstall.toLowerCase() === "n") {
    console.log("\nSkipping global install. Note: hooks will not work without the 'stp' command.");
    return false;
  }

  console.log("\nSelect package manager:\n");
  console.log("  1. npm");
  console.log("  2. bun");
  console.log("");

  let packageManager: "npm" | "bun" | undefined;
  while (!packageManager) {
    const choice = await promptUser("Select [1-2, or press Enter for npm]: ");
    if (choice === "" || choice === "1") {
      packageManager = "npm";
    } else if (choice === "2") {
      packageManager = "bun";
    } else {
      console.log("Invalid choice. Please enter 1 or 2.");
    }
  }

  console.log(`\nInstalling claude-stp globally using ${packageManager}...`);

  try {
    // TODO: When published to npm, use this:
    // const packageName = "claude-stp";
    const packageName = "/Users/mattolson/code/claude-stp";

    if (packageManager === "npm") {
      execSync(`npm install -g ${packageName}`, { stdio: "inherit" });
    } else {
      execSync(`bun add -g ${packageName}`, { stdio: "inherit" });
    }

    // Verify installation
    if (isStpCommandAvailable()) {
      console.log("\n'stp' command installed successfully.\n");
      return true;
    } else {
      console.log("\nWarning: Installation completed but 'stp' command not found in PATH.");
      console.log("You may need to restart your terminal or add the global bin directory to your PATH.");
      return false;
    }
  } catch (error) {
    console.error("\nFailed to install claude-stp globally:", error);
    return false;
  }
}

/**
 * Install git post-commit hook for tracking human lines
 * @throws Error if not in a git repository
 */
export function installGitHook(projectPath: string): void {
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
    } else {
      if (existingContent.trim() === "") {
        // Hook exists but is empty - write full contents
        fs.writeFileSync(hookPath, sourceContentWithShebang);
      } else {
        // Hook exists and is not empty - append without shebang
        const newContent = existingContent.trimEnd() + "\n\n" + sourceContent;
        fs.writeFileSync(hookPath, newContent);
      }
    }
  } else {
    fs.writeFileSync(hookPath, sourceContentWithShebang);
  }

  // Ensure the file is executable
  fs.chmodSync(hookPath, 0o755);
}

/**
 * Prompt user to select a mode interactively
 */
async function promptForMode(): Promise<number> {
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
    const userResponse = await promptUser(`Select a mode [1-${MODES.length}, or press Enter for 50-50]: `);
    if (userResponse === "") {
      modeNumber = DEFAULT_CONFIG.mode;
    } else {
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
async function promptForStatsWindow(): Promise<StatsWindow> {
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

async function promptShouldOverwriteInstall(): Promise<boolean> {
  const answer = await promptUser("An STP installation already exists. Overwrite it? N/Y\n");
  return answer.toLowerCase() === "y";
}

async function promptUser(prompt: string): Promise<string> {
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
 * Initialize STP in a project
 * Creates .stp directory with config
 * @param projectPath Path to the project
 * @param modeNumber Optional mode number to skip the mode prompt
 * @param statsWindow Optional stats window to skip the stats window prompt
 */
export async function initializeStp(
  projectPath: string,
  modeNumber?: number,
  statsWindow?: StatsWindow
): Promise<Config> {
  // Ensure stp command is installed globally (required for hooks)
  await ensureGlobalInstall();

  const stpDir = getStpDir(projectPath);

  // Create .stp directory if it doesn't exist
  if (fs.existsSync(stpDir)) {
    if (await promptShouldOverwriteInstall()) {
      console.log("Removing existing install...");
      fs.rmSync(stpDir, { recursive: true, force: true });
    } else {
      console.log("Aborting install...");
      return await loadConfig(projectPath);
    }
  }
  fs.mkdirSync(stpDir, { recursive: true });

  // Prompt for mode if not provided
  const selectedMode = modeNumber ?? await promptForMode();
  if (selectedMode < 1 || selectedMode > MODES.length) {
    throw new Error(`Invalid mode: ${selectedMode}. Must be in range [1, ${MODES.length}]`);
  }

  // Prompt for stats window if not provided
  const selectedStatsWindow = statsWindow ?? await promptForStatsWindow();

  // Initialize config
  const config: Config = {
    ...DEFAULT_CONFIG,
    mode: selectedMode,
    statsWindow: selectedStatsWindow,
  };
  saveConfig(projectPath, config);

  // Update CLAUDE.local.md with STP instructions
  updateClaudeMd(projectPath);

  // Update .gitignore to exclude STP files
  addToGitignore(projectPath, ".stp/");
  addToGitignore(projectPath, "CLAUDE.local.md");

  // Install git post-commit hook
  installGitHook(projectPath);

  return config;
}

/**
 * Check if STP is fully initialized
 */
export function isFullyInitialized(projectPath: string): boolean {
  return isStpInitialized(projectPath);
}

/**
 * Ensure STP is initialized, initializing if needed
 */
export async function ensureInitialized(
  projectPath: string,
  modeNumber?: number,
  statsWindow?: StatsWindow
): Promise<Config> {
  if (!isFullyInitialized(projectPath)) {
    return initializeStp(projectPath, modeNumber, statsWindow);
  }
  return loadConfig(projectPath);
}
