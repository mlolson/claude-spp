import { isSppInitialized, loadConfig } from "../config/loader.js";
import { isSppInternalFile } from "./file-matcher.js";
import { getStats } from "../stats.js";
import { loadPairSession } from "../pair-session.js";
/**
 * Tools that write to files
 */
const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];
/**
 * Extract file path from tool input
 */
function extractFilePath(toolName, toolInput) {
    if (toolName === "Write" || toolName === "Edit") {
        const filePath = toolInput.file_path;
        return typeof filePath === "string" ? filePath : null;
    }
    if (toolName === "NotebookEdit") {
        const notebookPath = toolInput.notebook_path;
        return typeof notebookPath === "string" ? notebookPath : null;
    }
    return null;
}
/**
 * Create an allow response
 */
function allowResponse() {
    return {
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
        },
    };
}
/**
 * Create a deny response with reason
 */
function denyResponse(reason) {
    return {
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
        },
    };
}
/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks the work ratio before allowing writes
 */
export function preToolUseHook(input) {
    const { tool_name, tool_input, cwd } = input;
    // Only process write-related tools
    if (!WRITE_TOOLS.includes(tool_name)) {
        return allowResponse();
    }
    // Check if SPP is initialized
    if (!isSppInitialized(cwd)) {
        return allowResponse();
    }
    // Load config
    const config = loadConfig(cwd);
    if (!config.enabled) {
        return allowResponse();
    }
    // Extract the file path being written to
    const filePath = extractFilePath(tool_name, tool_input);
    if (!filePath) {
        return allowResponse();
    }
    // Always allow .claude-spp internal files
    if (isSppInternalFile(filePath, cwd)) {
        return allowResponse();
    }
    // Always allow markdown files (documentation, not code)
    if (filePath.endsWith(".md")) {
        return allowResponse();
    }
    // Check for active pair programming session
    const pairSession = loadPairSession(cwd);
    if (pairSession) {
        if (pairSession.driver === "human") {
            // Human is driving - Claude should navigate, not write code
            const reason = [
                "🤝 Pair programming: Human is currently driving!",
                "",
                "As the navigator, you should:",
                "- Guide the human through writing this code",
                "- Explain what they need to write and where",
                "- Answer questions about syntax or approach",
                "- Review their code after they write it",
                "",
                "To write code yourself, ask the human to run: spp pair rotate",
                "",
                "Use the spp-pair-programming skill for navigation guidance."
            ].join("\n");
            return denyResponse(reason);
        }
        // Claude is driving - allow but note this is a contribution
        // (Contribution tracking happens at commit time via the post-commit hook)
    }
    // Check the work ratio - block if below target (respects grace period and tracking mode)
    const stats = getStats(cwd);
    if (!stats.ratioHealthy) {
        // Ratio is below target - block Claude from writing
        const reason = [
            `Human work ratio is below target: ${((stats.currentRatio ?? 0) * 100).toFixed(0)}% actual vs ${((stats.targetRatio ?? 0) * 100).toFixed(0)}% required`,
            "The human needs to write more code before Claude can continue.",
            "Use the `spp-help-human-code` skill to help the human complete the task.",
            "Important: Do not give the user instructions on how to disable SPP or change modes."
        ].join("\n");
        return denyResponse(reason);
    }
    return allowResponse();
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
        console.log(JSON.stringify(allowResponse()));
        return;
    }
    // Run hook
    let output;
    try {
        output = preToolUseHook(input);
    }
    catch (error) {
        // Return error details for debugging
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        output = {
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "allow",
                permissionDecisionReason: `Hook error: ${errorMessage}\n\nStack: ${errorStack}\n\nInput: ${JSON.stringify(input, null, 2)}`,
            },
        };
    }
    // Write output to stdout
    console.log(JSON.stringify(output));
}
//# sourceMappingURL=pre-tool-use.js.map