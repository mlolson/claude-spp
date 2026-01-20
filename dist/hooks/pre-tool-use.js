import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { getEffectiveRatio, getCurrentMode } from "../config/schema.js";
import { isDojoInternalFile } from "./file-matcher.js";
import { getLineCounts } from "../git/history.js";
import { calculateRatio, isRatioHealthy } from "../state/schema.js";
/**
 * Tools that write to files
 */
const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];
/**
 * Extract file path from tool input
 */
function extractFilePath(tool) {
    if (tool.name === "Write" || tool.name === "Edit") {
        const filePath = tool.input.file_path;
        return typeof filePath === "string" ? filePath : null;
    }
    if (tool.name === "NotebookEdit") {
        const notebookPath = tool.input.notebook_path;
        return typeof notebookPath === "string" ? notebookPath : null;
    }
    return null;
}
/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks the work ratio before allowing writes
 */
export function preToolUseHook(input) {
    const { tool, cwd } = input;
    // Only process write-related tools
    if (!WRITE_TOOLS.includes(tool.name)) {
        return { decision: "allow" };
    }
    // Check if Dojo is initialized
    if (!isDojoInitialized(cwd)) {
        return { decision: "allow" };
    }
    // Load config
    const config = loadConfig(cwd);
    if (!config.enabled) {
        return { decision: "allow" };
    }
    // Extract the file path being written to
    const filePath = extractFilePath(tool);
    if (!filePath) {
        return { decision: "allow" };
    }
    // Always allow .dojo internal files
    if (isDojoInternalFile(filePath, cwd)) {
        return { decision: "allow" };
    }
    // Check the work ratio - block if below target
    const lineCounts = getLineCounts(cwd);
    const currentRatio = calculateRatio(lineCounts.humanLines, lineCounts.claudeLines);
    const targetRatio = getEffectiveRatio(config);
    const currentMode = getCurrentMode(config);
    if (!isRatioHealthy(lineCounts.humanLines, lineCounts.claudeLines, targetRatio)) {
        // Ratio is below target - block Claude from writing
        const lines = [
            `Human work ratio is below target: ${(currentRatio * 100).toFixed(0)}% actual vs ${(targetRatio * 100).toFixed(0)}% required`,
            `Mode: ${currentMode.number}. ${currentMode.name} (${currentMode.description})`,
            "",
            "The human needs to write more code before Claude can continue.",
            "",
            "Guide the human through the implementation instead of writing it yourself.",
        ];
        return {
            decision: "block",
            reason: "ratio_below_target",
            message: lines.join("\n"),
        };
    }
    return { decision: "allow" };
}
/**
 * CLI entry point for pre-tool-use hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPreToolUseHook() {
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
        // If no input or invalid JSON, allow by default
        console.log(JSON.stringify({ decision: "allow" }));
        return;
    }
    // Run hook
    const output = preToolUseHook(input);
    // Write output to stdout
    console.log(JSON.stringify(output));
}
//# sourceMappingURL=pre-tool-use.js.map