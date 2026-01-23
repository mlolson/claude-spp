// Configuration
export { loadConfig, saveConfig, isSppInitialized, getSppDir } from "./config/loader.js";
export {
  ConfigSchema,
  DEFAULT_CONFIG,
  getEffectiveRatio,
  type Config,
} from "./config/schema.js";

export {
  calculateRatio,
  isRatioHealthy,
} from "./stats.js";

// Git History
export {
  getLineCounts,
  clearCache,
  type LineCounts,
} from "./git/history.js";

// Initialization
export { initializeSpp, isFullyInitialized, ensureInitialized } from "./init.js";

// Commands
export { getStats, formatStats, type StatsResult } from "./stats.js";

// Hooks
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
