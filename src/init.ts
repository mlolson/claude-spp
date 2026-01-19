import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig, saveConfig, isDojoInitialized, getDojoDir } from "./config/loader.js";
import { DEFAULT_CONFIG, type Config, type Preset } from "./config/schema.js";
import { loadState, saveState } from "./state/manager.js";
import { createDefaultState } from "./state/schema.js";
import { initializeTaskDirs, areTaskDirsInitialized } from "./tasks/directories.js";

/**
 * Initialize Dojo in a project
 * Creates .dojo directory with config, state, and task directories
 */
export function initializeDojo(projectPath: string, preset?: Preset): Config {
  const dojoDir = getDojoDir(projectPath);

  // Create .dojo directory if it doesn't exist
  if (!fs.existsSync(dojoDir)) {
    fs.mkdirSync(dojoDir, { recursive: true });
  }

  // Initialize config
  const config: Config = {
    ...DEFAULT_CONFIG,
    ...(preset ? { preset } : {}),
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

  return config;
}

/**
 * Check if Dojo is fully initialized
 */
export function isFullyInitialized(projectPath: string): boolean {
  return isDojoInitialized(projectPath) && areTaskDirsInitialized(projectPath);
}

/**
 * Ensure Dojo is initialized, initializing if needed
 */
export function ensureInitialized(projectPath: string): Config {
  if (!isFullyInitialized(projectPath)) {
    return initializeDojo(projectPath);
  }
  return loadConfig(projectPath);
}
