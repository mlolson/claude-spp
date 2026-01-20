export { loadConfig, saveConfig, isDojoInitialized, getDojoDir } from "./config/loader.js";
export { ConfigSchema, PresetSchema, DifficultySchema, PRESET_RATIOS, DEFAULT_CONFIG, getEffectiveRatio, type Config, type Preset, type Difficulty, } from "./config/schema.js";
export { loadState, saveState, resetSession, } from "./state/manager.js";
export { StateSchema, SessionSchema, createDefaultState, calculateRatio, isRatioHealthy, type State, type Session, } from "./state/schema.js";
export { getLineCounts, recalculateLineCounts, clearCache, type LineCounts, } from "./git/history.js";
export { initializeDojo, isFullyInitialized, ensureInitialized } from "./init.js";
export { getStats, formatStats, type StatsResult } from "./commands/stats.js";
export { init, formatInitResult, type InitResult } from "./commands/init.js";
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
export { preResponseHook, type PreResponseHookInput, type PreResponseHookOutput, } from "./hooks/pre-response.js";
export { postResponseHook, type PostResponseHookInput, type PostResponseHookOutput, } from "./hooks/post-response.js";
//# sourceMappingURL=index.d.ts.map