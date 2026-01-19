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
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Main state schema for .dojo/state.json
 */
export const StateSchema = z.object({
  // Current session statistics
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
      humanLines: 0,
      claudeLines: 0,
    },
  };
}

/**
 * Calculate the current human work ratio from session stats
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(session: Session): number {
  const total = session.humanLines + session.claudeLines;
  if (total === 0) {
    return 1.0; // No work yet, human is at 100%
  }
  return session.humanLines / total;
}

/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(session: Session, targetRatio: number): boolean {
  return calculateRatio(session) >= targetRatio;
}
