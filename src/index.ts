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

// VCS History (Git and Mercurial)
export {
  getLineCounts,
  clearCache,
  getProvider,
  type LineCounts,
  type VcsType,
  type VcsProvider,
} from "./vcs/index.js";

// Initialization
export { initializeSpp, isFullyInitialized, ensureInitialized } from "./init.js";

// Commands
export { getStats, formatStats, type StatsResult } from "./stats.js";

// Hooks
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
