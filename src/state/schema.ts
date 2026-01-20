import { z } from "zod";

/**
 * Session state (non-line-count data)
 */
export const SessionSchema = z.object({
  // When the session started
  startedAt: z.string().datetime(),

  // Currently focused task filename (null if none)
  currentTask: z.string().nullable().default(null),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Main state schema for .dojo/state.json
 */
export const StateSchema = z.object({
  // Current session state
  session: SessionSchema,
});

export type State = z.infer<typeof StateSchema>;

/**
 * Create a new default state
 */
export function createDefaultState(): State {
  return {
    session: {
      startedAt: new Date().toISOString(),
      currentTask: null,
    },
  };
}

/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(humanLines: number, claudeLines: number): number {
  const total = humanLines + claudeLines;
  if (total === 0) {
    return 1.0; // No work yet, human is at 100%
  }
  return humanLines / total;
}

/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean {
  return calculateRatio(humanLines, claudeLines) >= targetRatio;
}
