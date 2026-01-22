import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigSchema, DEFAULT_CONFIG, type Config } from "./schema.js";

const STP_DIR = ".stp";
const CONFIG_FILE = "config.json";

/**
 * Get the path to the .stp directory for a project
 */
export function getStpDir(projectPath: string): string {
  return path.join(projectPath, STP_DIR);
}

/**
 * Get the path to the config file
 */
export function getConfigPath(projectPath: string): string {
  return path.join(getStpDir(projectPath), CONFIG_FILE);
}

/**
 * Check if STP is initialized in the project
 */
export function isStpInitialized(projectPath: string): boolean {
  return fs.existsSync(getStpDir(projectPath));
}

/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 * Auto-unpauses if unpauseAfter time has passed
 */
export function loadConfig(projectPath: string): Config {
  const configPath = getConfigPath(projectPath);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const json = JSON.parse(raw);
    const config = ConfigSchema.parse(json);

    // Auto-unpause if unpauseAfter time has passed
    if (config.unpauseAfter) {
      const unpauseTime = new Date(config.unpauseAfter).getTime();
      if (Date.now() > unpauseTime) {
        config.enabled = true;
        delete config.unpauseAfter;
        saveConfig(projectPath, config);
      }
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Save config to file
 */
export function saveConfig(projectPath: string, config: Config): void {
  const stpDir = getStpDir(projectPath);
  const configPath = getConfigPath(projectPath);

  // Ensure .stp directory exists
  if (!fs.existsSync(stpDir)) {
    fs.mkdirSync(stpDir, { recursive: true });
  }

  // Validate before saving
  const validated = ConfigSchema.parse(config);

  fs.writeFileSync(
    configPath,
    JSON.stringify(validated, null, 2) + "\n",
    "utf-8"
  );
}

/**
 * Initialize STP in a project with default config
 */
export function initializeConfig(projectPath: string, preset?: string): Config {
  const config: Config = {
    ...DEFAULT_CONFIG,
  };

  if (preset) {
    const result = ConfigSchema.shape.preset.safeParse(preset);
    if (result.success) {
      config.preset = result.data;
    }
  }

  saveConfig(projectPath, config);
  return config;
}
