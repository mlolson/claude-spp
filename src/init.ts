import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { execSync } from "node:child_process";
import { loadConfig, saveConfig, isStpInitialized, getStpDir } from "./config/loader.js";
import { DEFAULT_CONFIG, type Config, MODES, getCurrentMode } from "./config/schema.js";

const STP_START_MARKER = "<!-- STP:START -->";
const STP_END_MARKER = "<!-- STP:END -->";

/**
 * Generate STP instructions content for CLAUDE.md
 */
function generateStpInstructions(modeNumber: number): string {
  const mode = MODES.find((m) => m.number === modeNumber) ?? MODES[3]; // Default to 50-50
  const targetPercent = Math.round(mode.humanRatio * 100);

  return `${STP_START_MARKER}
## STP Mode

This project has **STP mode** enabled. STP helps maintain programming skills by ensuring
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
${STP_END_MARKER}`;
}

/**
 * Update CLAUDE.md with STP instructions
 * Inserts or updates content between STP markers
 */
function updateClaudeMd(projectPath: string, modeNumber: number): void {
  const claudeMdPath = path.join(projectPath, "CLAUDE.md");
  const stpContent = generateStpInstructions(modeNumber);

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

async function promptShouldOverwriteInstall(): Promise<boolean> {
  const answer = await promptUser("An installation already exists. Overwrite it? N/Y\n");
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
 */
export async function initializeStp(projectPath: string, modeNumber?: number): Promise<Config> {
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

  // Initialize config
  const config: Config = {
    ...DEFAULT_CONFIG,
    mode: selectedMode,
  };
  saveConfig(projectPath, config);

  // Update CLAUDE.md with STP instructions
  updateClaudeMd(projectPath, config.mode);

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
export async function ensureInitialized(projectPath: string, modeNumber?: number): Promise<Config> {
  if (!isFullyInitialized(projectPath)) {
    return initializeStp(projectPath, modeNumber);
  }
  return loadConfig(projectPath);
}
