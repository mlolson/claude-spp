import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigSchema, DEFAULT_CONFIG, type Config } from "./schema.js";

const DOJO_DIR = ".dojo";
const CONFIG_FILE = "config.json";

/**
 * Get the path to the .dojo directory for a project
 */
export function getDojoDir(projectPath: string): string {
  return path.join(projectPath, DOJO_DIR);
}

/**
 * Get the path to the config file
 */
export function getConfigPath(projectPath: string): string {
  return path.join(getDojoDir(projectPath), CONFIG_FILE);
}

/**
 * Check if Dojo is initialized in the project
 */
export function isDojoInitialized(projectPath: string): boolean {
  return fs.existsSync(getDojoDir(projectPath));
}

/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 */
export function loadConfig(projectPath: string): Config {
  const configPath = getConfigPath(projectPath);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const json = JSON.parse(raw);
    return ConfigSchema.parse(json);
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
  const dojoDir = getDojoDir(projectPath);
  const configPath = getConfigPath(projectPath);

  // Ensure .dojo directory exists
  if (!fs.existsSync(dojoDir)) {
    fs.mkdirSync(dojoDir, { recursive: true });
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
 * Initialize Dojo in a project with default config
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
