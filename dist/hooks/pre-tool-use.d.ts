/**
 * Tool information from Claude Code
 */
export interface ToolInput {
    name: string;
    input: Record<string, unknown>;
}
/**
 * Hook input from Claude Code
 */
export interface PreToolUseHookInput {
    tool: ToolInput;
    sessionId?: string;
    cwd: string;
}
/**
 * Hook output to Claude Code
 */
export interface PreToolUseHookOutput {
    decision: "allow" | "block" | "ask";
    reason?: string;
    message?: string;
}
/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks if there is a current focused task before allowing writes
 */
export declare function preToolUseHook(input: PreToolUseHookInput): PreToolUseHookOutput;
/**
 * CLI entry point for pre-tool-use hook
 * Reads input from stdin, writes output to stdout
 */
export declare function runPreToolUseHook(): Promise<void>;
//# sourceMappingURL=pre-tool-use.d.ts.map