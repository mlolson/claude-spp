export { loadConfig, saveConfig, isSppInitialized, getSppDir } from "./config/loader.js";
export { ConfigSchema, DEFAULT_CONFIG, getEffectiveRatio, type Config, } from "./config/schema.js";
export { calculateRatio, isRatioHealthy, } from "./stats.js";
export { getLineCounts, clearCache, type LineCounts, } from "./git/history.js";
export { initializeSpp, isFullyInitialized, ensureInitialized } from "./init.js";
export { getStats, formatStats, type StatsResult } from "./stats.js";
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
//# sourceMappingURL=index.d.ts.map