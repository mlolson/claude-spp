import { z } from "zod";
/**
 * Review checkpoint status
 */
export declare const ReviewStatusSchema: z.ZodEnum<["pending", "in_progress", "approved", "rejected", "skipped"]>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
/**
 * Code change type for review context
 */
export declare const ChangeTypeSchema: z.ZodEnum<["new_file", "modification", "deletion", "refactor"]>;
export type ChangeType = z.infer<typeof ChangeTypeSchema>;
/**
 * Comprehension question for review
 */
export interface ComprehensionQuestion {
    id: string;
    question: string;
    hint: string;
    codeReference: string | null;
    answered: boolean;
}
/**
 * Review checkpoint
 */
export interface ReviewCheckpoint {
    id: string;
    filePath: string;
    changeType: ChangeType;
    summary: string;
    questions: ComprehensionQuestion[];
    status: ReviewStatus;
    createdAt: string;
    completedAt: string | null;
}
/**
 * Code context for generating questions
 */
export interface CodeContext {
    filePath: string;
    changeType: ChangeType;
    language: string;
    addedLines: string[];
    removedLines: string[];
    concepts: string[];
}
/**
 * Detect programming language from file path
 */
export declare function detectLanguage(filePath: string): string;
/**
 * Detect concepts from code
 */
export declare function detectConcepts(code: string, language: string): string[];
/**
 * Generate comprehension questions for code context
 */
export declare function generateComprehensionQuestions(context: CodeContext, maxQuestions?: number): ComprehensionQuestion[];
/**
 * Create a review checkpoint for code changes
 */
export declare function createReviewCheckpoint(filePath: string, changeType: ChangeType, addedLines: string[], removedLines?: string[]): ReviewCheckpoint;
/**
 * Update checkpoint status
 */
export declare function updateCheckpointStatus(checkpoint: ReviewCheckpoint, status: ReviewStatus): ReviewCheckpoint;
/**
 * Mark a question as answered
 */
export declare function markQuestionAnswered(checkpoint: ReviewCheckpoint, questionId: string): ReviewCheckpoint;
/**
 * Check if all questions are answered
 */
export declare function allQuestionsAnswered(checkpoint: ReviewCheckpoint): boolean;
/**
 * Format checkpoint for display
 */
export declare function formatCheckpointForReview(checkpoint: ReviewCheckpoint): string;
/**
 * Determine if a code change requires review
 */
export declare function requiresReview(filePath: string, addedLines: string[], config?: {
    minLinesForReview?: number;
    excludePatterns?: string[];
}): boolean;
/**
 * Review session tracking
 */
export interface ReviewSession {
    checkpoints: ReviewCheckpoint[];
    totalReviews: number;
    completedReviews: number;
    skippedReviews: number;
}
/**
 * Create a new review session
 */
export declare function createReviewSession(): ReviewSession;
/**
 * Add checkpoint to session
 */
export declare function addCheckpointToSession(session: ReviewSession, checkpoint: ReviewCheckpoint): ReviewSession;
/**
 * Update session when checkpoint is completed
 */
export declare function completeCheckpointInSession(session: ReviewSession, checkpointId: string, status: "approved" | "rejected" | "skipped"): ReviewSession;
/**
 * Get review completion rate
 */
export declare function getReviewCompletionRate(session: ReviewSession): number;
//# sourceMappingURL=review.d.ts.map