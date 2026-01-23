import { isStpInitialized, loadConfig } from "../config/loader.js";
import { calculateRatio, isRatioHealthy } from "../stats.js";
import { getEffectiveRatio } from "../config/schema.js";
import { generateSystemPrompt } from "./system-prompt.js";
import { getLineCounts } from "../git/history.js";
/**
 * Pre-response hook
 * Called before Claude generates a response
 * Injects STP context into the system prompt
 */
export function preResponseHook(input) {
    const { cwd } = input;
    // Check if STP is initialized in this project
    if (!isStpInitialized(cwd)) {
        return { proceed: true };
    }
    // Load config
    const config = loadConfig(cwd);
    if (!config.enabled) {
        return { proceed: true };
    }
    // Generate and inject system prompt
    const systemPromptAddition = generateSystemPrompt(cwd);
    // Check ratio status for any warnings
    const lineCounts = getLineCounts(cwd);
    const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
    const targetRatio = getEffectiveRatio(config);
    const isHealthy = isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio);
    // If ratio is unhealthy, we might want to show a warning
    let userMessage;
    if (!isHealthy && lineCounts.claudeLines > 0) {
        userMessage = `⚠️ STP: Human work ratio (${(currentRatio * 100).toFixed(0)}%) is below target (${(targetRatio * 100).toFixed(0)}%). Consider having the human write more code.`;
    }
    return {
        systemPromptAddition,
        proceed: true,
        userMessage,
    };
}
/**
 * CLI entry point for pre-response hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPreResponseHook() {
    // Read input from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const inputJson = Buffer.concat(chunks).toString("utf-8");
    let input;
    try {
        input = JSON.parse(inputJson);
    }
    catch {
        // If no input or invalid JSON, use cwd
        input = {
            userMessage: "",
            cwd: process.cwd(),
        };
    }
    // Run hook
    const output = preResponseHook(input);
    // Write output to stdout
    console.log(JSON.stringify(output));
}
//# sourceMappingURL=pre-response.js.map