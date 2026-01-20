import { z } from "zod";
/**
 * Session state
 */
export declare const SessionSchema: z.ZodObject<{
    startedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
}, {
    startedAt: string;
}>;
export type Session = z.infer<typeof SessionSchema>;
/**
 * Main state schema for .dojo/state.json
 */
export declare const StateSchema: z.ZodObject<{
    session: z.ZodObject<{
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startedAt: string;
    }, {
        startedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    session: {
        startedAt: string;
    };
}, {
    session: {
        startedAt: string;
    };
}>;
export type State = z.infer<typeof StateSchema>;
/**
 * Create a new default state
 */
export declare function createDefaultState(): State;
/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export declare function calculateRatio(humanLines: number, claudeLines: number): number;
/**
 * Check if the human work ratio meets the target
 */
export declare function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean;
//# sourceMappingURL=schema.d.ts.map