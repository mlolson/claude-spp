/**
 * Hook input from Claude Code
 */
export interface PreResponseHookInput {
    userMessage: string;
    sessionId?: string;
    cwd: string;
}
/**
 * Hook output to Claude Code
 */
export interface PreResponseHookOutput {
    systemPromptAddition?: string;
    proceed: boolean;
    userMessage?: string;
}
/**
 * Pre-response hook
 * Called before Claude generates a response
 * Injects Dojo context into the system prompt
 */
export declare function preResponseHook(input: PreResponseHookInput): PreResponseHookOutput;
/**
 * CLI entry point for pre-response hook
 * Reads input from stdin, writes output to stdout
 */
export declare function runPreResponseHook(): Promise<void>;
//# sourceMappingURL=pre-response.d.ts.map