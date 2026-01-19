import { z } from "zod";
/**
 * Session statistics tracking work distribution
 */
export declare const SessionSchema: z.ZodObject<{
    startedAt: z.ZodString;
    humanLines: z.ZodDefault<z.ZodNumber>;
    claudeLines: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    startedAt: string;
    humanLines: number;
    claudeLines: number;
}, {
    startedAt: string;
    humanLines?: number | undefined;
    claudeLines?: number | undefined;
}>;
export type Session = z.infer<typeof SessionSchema>;
/**
 * Main state schema for .dojo/state.json
 */
export declare const StateSchema: z.ZodObject<{
    session: z.ZodObject<{
        startedAt: z.ZodString;
        humanLines: z.ZodDefault<z.ZodNumber>;
        claudeLines: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        startedAt: string;
        humanLines: number;
        claudeLines: number;
    }, {
        startedAt: string;
        humanLines?: number | undefined;
        claudeLines?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    session: {
        startedAt: string;
        humanLines: number;
        claudeLines: number;
    };
}, {
    session: {
        startedAt: string;
        humanLines?: number | undefined;
        claudeLines?: number | undefined;
    };
}>;
export type State = z.infer<typeof StateSchema>;
/**
 * Create a new default state
 */
export declare function createDefaultState(): State;
/**
 * Calculate the current human work ratio from session stats
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export declare function calculateRatio(session: Session): number;
/**
 * Check if the human work ratio meets the target
 */
export declare function isRatioHealthy(session: Session, targetRatio: number): boolean;
//# sourceMappingURL=schema.d.ts.map