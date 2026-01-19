import * as fs from "node:fs";
import { isDojoInitialized, loadConfig } from "../config/loader.js";
import { addClaudeLines } from "../state/manager.js";
/**
 * Count lines in a file
 */
function countFileLines(filepath) {
    if (!fs.existsSync(filepath)) {
        return 0;
    }
    const content = fs.readFileSync(filepath, "utf-8");
    return content.split("\n").length;
}
/**
 * Post-write hook
 * Called after Claude writes or edits a file
 * Tracks lines of code written by Claude
 */
export function runPostWriteHook(filepath) {
    const cwd = process.cwd();
    // Check if Dojo is initialized
    if (!isDojoInitialized(cwd)) {
        return;
    }
    // Load config
    const config = loadConfig(cwd);
    if (!config.enabled) {
        return;
    }
    // Count lines in the file
    const lines = countFileLines(filepath);
    if (lines > 0) {
        addClaudeLines(cwd, lines);
        console.log(`Dojo: +${lines} lines (Claude)`);
    }
}
//# sourceMappingURL=post-write.js.map