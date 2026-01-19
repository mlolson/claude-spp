/**
 * Tool use record from Claude's response
 */
export interface ToolUse {
    name: string;
    input: Record<string, unknown>;
}
/**
 * Hook input from Claude Code
 */
export interface PostResponseHookInput {
    response: string;
    toolUses: ToolUse[];
    sessionId?: string;
    cwd: string;
}
/**
 * Hook output to Claude Code
 */
export interface PostResponseHookOutput {
    success: boolean;
    claudeLines?: number;
    message?: string;
}
/**
 * Post-response hook
 * Called after Claude generates a response
 * Tracks lines of code written by Claude
 */
export declare function postResponseHook(input: PostResponseHookInput): PostResponseHookOutput;
/**
 * CLI entry point for post-response hook
 * Reads input from stdin, writes output to stdout
 */
export declare function runPostResponseHook(): Promise<void>;
//# sourceMappingURL=post-response.d.ts.map