import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigSchema, DEFAULT_CONFIG } from "./schema.js";
const SPP_DIR = ".claude-spp";
const CONFIG_FILE = "config.json";
/**
 * Get the path to the .claude-spp directory for a project
 */
export function getSppDir(projectPath) {
    return path.join(projectPath, SPP_DIR);
}
/**
 * Get the path to the config file
 */
export function getConfigPath(projectPath) {
    return path.join(getSppDir(projectPath), CONFIG_FILE);
}
/**
 * Check if SPP is initialized in the project
 */
export function isSppInitialized(projectPath) {
    return fs.existsSync(getSppDir(projectPath));
}
/**
 * Load and validate the config file
 * Returns default config if file doesn't exist
 * Throws if config is invalid
 * Auto-unpauses if pausedUntil time has passed
 */
export function loadConfig(projectPath) {
    const configPath = getConfigPath(projectPath);
    if (!fs.existsSync(configPath)) {
        return DEFAULT_CONFIG;
    }
    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const json = JSON.parse(raw);
        const config = ConfigSchema.parse(json);
        // Auto-unpause if pausedUntil time has passed
        if (config.pausedUntil) {
            const unpauseTime = new Date(config.pausedUntil).getTime();
            if (Date.now() > unpauseTime) {
                config.enabled = true;
                delete config.pausedUntil;
                saveConfig(projectPath, config);
            }
        }
        return config;
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
        }
        throw error;
    }
}
/**
 * Save config to file
 */
export function saveConfig(projectPath, config) {
    const sppDir = getSppDir(projectPath);
    const configPath = getConfigPath(projectPath);
    // Ensure .claude-spp directory exists
    if (!fs.existsSync(sppDir)) {
        fs.mkdirSync(sppDir, { recursive: true });
    }
    // Validate before saving
    const validated = ConfigSchema.parse(config);
    fs.writeFileSync(configPath, JSON.stringify(validated, null, 2) + "\n", "utf-8");
}
/**
 * Initialize SPP in a project with default config
 */
export function initializeConfig(projectPath) {
    const config = {
        ...DEFAULT_CONFIG,
    };
    saveConfig(projectPath, config);
    return config;
}
//# sourceMappingURL=loader.js.map