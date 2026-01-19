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
/**
 * Question classification type
 */
export const QuestionTypeSchema = z.enum([
    "conceptual",
    "debugging",
    "howto",
    "factual",
    "opinion",
    "clarification",
]);
/**
 * Asked question record for tracking teaching moments
 */
export const AskedQuestionSchema = z.object({
    // The question text
    question: z.string(),
    // Classification type
    type: QuestionTypeSchema,
    // Domain (typescript, react, etc.)
    domain: z.string().nullable(),
    // When the question was asked
    askedAt: z.string().datetime(),
    // Whether this was a teaching moment
    wasTeachingMoment: z.boolean(),
});
/**
 * Review checkpoint status
 */
export const ReviewStatusSchema = z.enum([
    "pending",
    "in_progress",
    "approved",
    "rejected",
    "skipped",
]);
/**
 * Code review record
 */
export const ReviewRecordSchema = z.object({
    // Unique ID
    id: z.string(),
    // File that was reviewed
    filePath: z.string(),
    // Status of the review
    status: ReviewStatusSchema,
    // Number of questions answered
    questionsAnswered: z.number().int().min(0),
    // Total questions
    totalQuestions: z.number().int().min(0),
    // When the review was created
    createdAt: z.string().datetime(),
    // When the review was completed
    completedAt: z.string().datetime().nullable(),
});
/**
 * Teaching session stats
 */
export const TeachingStatsSchema = z.object({
    // Total teaching moments encountered
    teachingMoments: z.number().int().min(0).default(0),
    // Questions answered via Socratic method
    socraticResponses: z.number().int().min(0).default(0),
    // Direct answers given
    directAnswers: z.number().int().min(0).default(0),
    // Code reviews completed
    reviewsCompleted: z.number().int().min(0).default(0),
    // Code reviews skipped
    reviewsSkipped: z.number().int().min(0).default(0),
});
/**
 * Skill proficiency tracking
 */
export const SkillSchema = z.object({
    // Proficiency score (0.0 - 1.0)
    score: z.number().min(0).max(1),
    // Last time this skill was practiced
    lastPracticed: z.string().datetime(),
});
/**
 * Quiz history entry
 */
export const QuizEntrySchema = z.object({
    // When the quiz was taken
    timestamp: z.string().datetime(),
    // Topic of the quiz
    topic: z.string(),
    // Score (0.0 - 1.0)
    score: z.number().min(0).max(1),
    // Number of questions
    totalQuestions: z.number().int().min(1),
    // Number of correct answers
    correctAnswers: z.number().int().min(0),
});
/**
 * Main state schema for .dojo/state.json
 */
export const StateSchema = z.object({
    // Current session statistics
    session: SessionSchema,
    // Skill proficiency by topic
    skills: z.record(z.string(), SkillSchema).default({}),
    // Quiz history
    quizHistory: z.array(QuizEntrySchema).default([]),
    // Teaching: Asked questions history
    askedQuestions: z.array(AskedQuestionSchema).default([]),
    // Teaching: Review records
    reviewRecords: z.array(ReviewRecordSchema).default([]),
    // Teaching: Aggregated stats
    teachingStats: TeachingStatsSchema.default({
        teachingMoments: 0,
        socraticResponses: 0,
        directAnswers: 0,
        reviewsCompleted: 0,
        reviewsSkipped: 0,
    }),
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
        },
        skills: {},
        quizHistory: [],
        askedQuestions: [],
        reviewRecords: [],
        teachingStats: {
            teachingMoments: 0,
            socraticResponses: 0,
            directAnswers: 0,
            reviewsCompleted: 0,
            reviewsSkipped: 0,
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