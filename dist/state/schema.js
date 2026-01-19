import { z } from "zod";
/**
 * Session statistics tracking work distribution
 */
export const SessionSchema = z.object({
    // When the session started
    startedAt: z.string().datetime(),
    // Lines of code written by human
    humanLines: z.number().int().min(0).default(0),
    // Lines of code written by Claude
    claudeLines: z.number().int().min(0).default(0),
    // Currently focused task filename (null if none)
    currentTask: z.string().nullable().default(null),
});
/**
 * Main state schema for .dojo/state.json
 */
export const StateSchema = z.object({
    // Current session statistics
    session: SessionSchema,
});
/**
 * Create a new default state
 */
export function createDefaultState() {
    return {
        session: {
            startedAt: new Date().toISOString(),
            humanLines: 0,
            claudeLines: 0,
            currentTask: null,
        },
    };
}
/**
 * Calculate the current human work ratio from session stats
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(session) {
    const total = session.humanLines + session.claudeLines;
    if (total === 0) {
        return 1.0; // No work yet, human is at 100%
    }
    return session.humanLines / total;
}
/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(session, targetRatio) {
    return calculateRatio(session) >= targetRatio;
}
//# sourceMappingURL=schema.js.map