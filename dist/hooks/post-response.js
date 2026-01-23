/**
 * Post-response hook
 * Called after Claude generates a response
 * Line tracking is now done via git history, so this hook is minimal
 */
export function postResponseHook(input) {
    // Line tracking is now derived from git history
    // This hook is kept for potential future use
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