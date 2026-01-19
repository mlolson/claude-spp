import { type State, type Session, type AskedQuestion, type ReviewRecord, type TeachingStats } from "./schema.js";
/**
 * Get the path to the state file
 */
export declare function getStatePath(projectPath: string): string;
/**
 * Load state from file
 * Returns new default state if file doesn't exist
 */
export declare function loadState(projectPath: string): State;
/**
 * Save state to file
 */
export declare function saveState(projectPath: string, state: State): void;
/**
 * Update session statistics
 */
export declare function updateSession(projectPath: string, updates: Partial<Session>): State;
/**
 * Add lines to human count
 */
export declare function addHumanLines(projectPath: string, lines: number): State;
/**
 * Add lines to Claude count
 */
export declare function addClaudeLines(projectPath: string, lines: number): State;
/**
 * Update a skill score
 */
export declare function updateSkill(projectPath: string, skillName: string, score: number): State;
/**
 * Reset session statistics (start a new session)
 */
export declare function resetSession(projectPath: string): State;
/**
 * Record an asked question
 */
export declare function recordQuestion(projectPath: string, question: Omit<AskedQuestion, "askedAt">): State;
/**
 * Get asked questions history
 */
export declare function getAskedQuestions(projectPath: string): AskedQuestion[];
/**
 * Record a code review
 */
export declare function recordReview(projectPath: string, review: Omit<ReviewRecord, "createdAt">): State;
/**
 * Get review records
 */
export declare function getReviewRecords(projectPath: string): ReviewRecord[];
/**
 * Increment teaching stat
 */
export declare function incrementTeachingStat(projectPath: string, stat: keyof TeachingStats): State;
/**
 * Get teaching stats
 */
export declare function getTeachingStats(projectPath: string): TeachingStats;
/**
 * Reset teaching stats (for new session)
 */
export declare function resetTeachingStats(projectPath: string): State;
//# sourceMappingURL=manager.d.ts.map