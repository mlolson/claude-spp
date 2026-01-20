import { isDojoInitialized } from "../config/loader.js";
import { getCurrentMode, type Mode } from "../config/schema.js";
import { initializeDojo, isFullyInitialized } from "../init.js";

export interface InitResult {
  success: boolean;
  alreadyInitialized: boolean;
  mode: Mode;
  message: string;
}

/**
 * Initialize Dojo in a project
 * @param projectPath - Path to the project
 * @param modeNumber - Optional mode number (1-6). Defaults to 4 (50-50).
 */
export async function init(projectPath: string, modeNumber?: number): Promise<InitResult> {
  const alreadyInitialized = isDojoInitialized(projectPath);

  if (alreadyInitialized && isFullyInitialized(projectPath)) {
    const config = await initializeDojo(projectPath, undefined);
    const mode = getCurrentMode(config);
    return {
      success: true,
      alreadyInitialized: true,
      mode,
      message: "Dojo is already initialized in this project.",
    };
  }

  const config = await initializeDojo(projectPath, undefined);
  if (modeNumber && modeNumber >= 1 && modeNumber <= 6) {
    config.mode = modeNumber;
  }
  const mode = getCurrentMode(config);

  return {
    success: true,
    alreadyInitialized: false,
    mode,
    message: `Dojo initialized with mode ${mode.number}: ${mode.name} (${mode.description}).`,
  };
}

/**
 * Format init result for display
 */
export function formatInitResult(result: InitResult): string {
  const lines: string[] = [result.message];

  if (!result.alreadyInitialized) {
    lines.push("");
    lines.push("Created:");
    lines.push("- `.dojo/config.json` - Project configuration");
    lines.push("");
    lines.push("Run `node dist/cli.js stats` to see your current status.");
  }

  return lines.join("\n");
}
