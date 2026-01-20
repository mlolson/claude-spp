import { z } from "zod";
/**
 * Session state (non-line-count data)
 */
export declare const SessionSchema: z.ZodObject<{
    startedAt: z.ZodString;
    currentTask: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
    currentTask: string | null;
}, {
    startedAt: string;
    currentTask?: string | null | undefined;
}>;
export type Session = z.infer<typeof SessionSchema>;
/**
 * Main state schema for .dojo/state.json
 */
export declare const StateSchema: z.ZodObject<{
    session: z.ZodObject<{
        startedAt: z.ZodString;
        currentTask: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        startedAt: string;
        currentTask: string | null;
    }, {
        startedAt: string;
        currentTask?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    session: {
        startedAt: string;
        currentTask: string | null;
    };
}, {
    session: {
        startedAt: string;
        currentTask?: string | null | undefined;
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