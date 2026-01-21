// Configuration
export { loadConfig, saveConfig, isStpInitialized, getStpDir } from "./config/loader.js";
export {
  ConfigSchema,
  PresetSchema,
  DifficultySchema,
  PRESET_RATIOS,
  DEFAULT_CONFIG,
  getEffectiveRatio,
  type Config,
  type Preset,
  type Difficulty,
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
export { initializeStp, isFullyInitialized, ensureInitialized } from "./init.js";

// Commands
export { getStats, formatStats, type StatsResult } from "./stats.js";

// Hooks
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
export {
  preResponseHook,
  type PreResponseHookInput,
  type PreResponseHookOutput,
} from "./hooks/pre-response.js";
export {
  postResponseHook,
  type PostResponseHookInput,
  type PostResponseHookOutput,
} from "./hooks/post-response.js";
