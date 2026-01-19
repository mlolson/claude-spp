import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { addClaudeLines } from "../state/manager.js";
/**
 * Count lines in a string
 */
function countLines(text) {
    if (!text)
        return 0;
    return text.split("\n").length;
}
/**
 * Extract lines written from tool uses
 */
function countLinesFromToolUses(toolUses) {
    let totalLines = 0;
    for (const tool of toolUses) {
        // Write tool - count all content lines
        if (tool.name === "Write" && typeof tool.input.content === "string") {
            totalLines += countLines(tool.input.content);
        }
        // Edit tool - count new_string lines (approximation)
        if (tool.name === "Edit" && typeof tool.input.new_string === "string") {
            const newLines = countLines(tool.input.new_string);
            const oldLines = typeof tool.input.old_string === "string"
                ? countLines(tool.input.old_string)
                : 0;
            // Only count net new lines
            totalLines += Math.max(0, newLines - oldLines);
        }
        // NotebookEdit - count new source lines
        if (tool.name === "NotebookEdit" && typeof tool.input.new_source === "string") {
            totalLines += countLines(tool.input.new_source);
        }
    }
    return totalLines;
}
/**
 * Post-response hook
 * Called after Claude generates a response
 * Tracks lines of code written by Claude
 */
export function postResponseHook(input) {
    const { cwd, toolUses } = input;
    // Check if Dojo is initialized
    if (!isDojoInitialized(cwd)) {
        return { success: true };
    }
    // Load config
    const config = loadConfig(cwd);
    if (!config.enabled) {
        return { success: true };
    }
    // Count lines from tool uses
    const claudeLines = countLinesFromToolUses(toolUses);
    // Update state if lines were written
    if (claudeLines > 0) {
        addClaudeLines(cwd, claudeLines);
        return {
            success: true,
            claudeLines,
            message: `Dojo: Tracked ${claudeLines} lines written by Claude`,
        };
    }
    return { success: true };
}
/**
 * CLI entry point for post-response hook
 * Reads input from stdin, writes output to stdout
 */
export async function runPostResponseHook() {
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
        // If no input or invalid JSON, nothing to do
        console.log(JSON.stringify({ success: true }));
        return;
    }
    // Run hook
    const output = postResponseHook(input);
    // Write output to stdout
    console.log(JSON.stringify(output));
}
//# sourceMappingURL=post-response.js.map