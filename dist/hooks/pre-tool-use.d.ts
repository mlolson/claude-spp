/**
 * Hook input from Claude Code (actual format)
 */
export interface PreToolUseHookInput {
    session_id?: string;
    transcript_path?: string;
    cwd: string;
    permission_mode?: string;
    hook_event_name?: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_use_id?: string;
}
/**
 * Hook output to Claude Code (correct format)
 */
export interface PreToolUseHookOutput {
    hookSpecificOutput: {
        hookEventName: "PreToolUse";
        permissionDecision: "allow" | "deny" | "ask";
        permissionDecisionReason?: string;
    };
}
/**
 * Pre-tool-use hook
 * Called before Claude uses a tool
 * Checks the work ratio before allowing writes
 */
export declare function preToolUseHook(input: PreToolUseHookInput): PreToolUseHookOutput;
/**
 * CLI entry point for pre-tool-use hook
 * Reads input from stdin, writes output to stdout
 */
export declare function runPreToolUseHook(): Promise<void>;
//# sourceMappingURL=pre-tool-use.d.ts.map