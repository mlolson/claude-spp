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
 * Question classification type
 */
export declare const QuestionTypeSchema: z.ZodEnum<["conceptual", "debugging", "howto", "factual", "opinion", "clarification"]>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
/**
 * Asked question record for tracking teaching moments
 */
export declare const AskedQuestionSchema: z.ZodObject<{
    question: z.ZodString;
    type: z.ZodEnum<["conceptual", "debugging", "howto", "factual", "opinion", "clarification"]>;
    domain: z.ZodNullable<z.ZodString>;
    askedAt: z.ZodString;
    wasTeachingMoment: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
    question: string;
    domain: string | null;
    askedAt: string;
    wasTeachingMoment: boolean;
}, {
    type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
    question: string;
    domain: string | null;
    askedAt: string;
    wasTeachingMoment: boolean;
}>;
export type AskedQuestion = z.infer<typeof AskedQuestionSchema>;
/**
 * Review checkpoint status
 */
export declare const ReviewStatusSchema: z.ZodEnum<["pending", "in_progress", "approved", "rejected", "skipped"]>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
/**
 * Code review record
 */
export declare const ReviewRecordSchema: z.ZodObject<{
    id: z.ZodString;
    filePath: z.ZodString;
    status: z.ZodEnum<["pending", "in_progress", "approved", "rejected", "skipped"]>;
    questionsAnswered: z.ZodNumber;
    totalQuestions: z.ZodNumber;
    createdAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
    id: string;
    filePath: string;
    questionsAnswered: number;
    totalQuestions: number;
    createdAt: string;
    completedAt: string | null;
}, {
    status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
    id: string;
    filePath: string;
    questionsAnswered: number;
    totalQuestions: number;
    createdAt: string;
    completedAt: string | null;
}>;
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;
/**
 * Teaching session stats
 */
export declare const TeachingStatsSchema: z.ZodObject<{
    teachingMoments: z.ZodDefault<z.ZodNumber>;
    socraticResponses: z.ZodDefault<z.ZodNumber>;
    directAnswers: z.ZodDefault<z.ZodNumber>;
    reviewsCompleted: z.ZodDefault<z.ZodNumber>;
    reviewsSkipped: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teachingMoments: number;
    socraticResponses: number;
    directAnswers: number;
    reviewsCompleted: number;
    reviewsSkipped: number;
}, {
    teachingMoments?: number | undefined;
    socraticResponses?: number | undefined;
    directAnswers?: number | undefined;
    reviewsCompleted?: number | undefined;
    reviewsSkipped?: number | undefined;
}>;
export type TeachingStats = z.infer<typeof TeachingStatsSchema>;
/**
 * Skill proficiency tracking
 */
export declare const SkillSchema: z.ZodObject<{
    score: z.ZodNumber;
    lastPracticed: z.ZodString;
}, "strip", z.ZodTypeAny, {
    score: number;
    lastPracticed: string;
}, {
    score: number;
    lastPracticed: string;
}>;
export type Skill = z.infer<typeof SkillSchema>;
/**
 * Quiz history entry
 */
export declare const QuizEntrySchema: z.ZodObject<{
    timestamp: z.ZodString;
    topic: z.ZodString;
    score: z.ZodNumber;
    totalQuestions: z.ZodNumber;
    correctAnswers: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalQuestions: number;
    score: number;
    timestamp: string;
    topic: string;
    correctAnswers: number;
}, {
    totalQuestions: number;
    score: number;
    timestamp: string;
    topic: string;
    correctAnswers: number;
}>;
export type QuizEntry = z.infer<typeof QuizEntrySchema>;
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
    skills: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        score: z.ZodNumber;
        lastPracticed: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        score: number;
        lastPracticed: string;
    }, {
        score: number;
        lastPracticed: string;
    }>>>;
    quizHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        topic: z.ZodString;
        score: z.ZodNumber;
        totalQuestions: z.ZodNumber;
        correctAnswers: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalQuestions: number;
        score: number;
        timestamp: string;
        topic: string;
        correctAnswers: number;
    }, {
        totalQuestions: number;
        score: number;
        timestamp: string;
        topic: string;
        correctAnswers: number;
    }>, "many">>;
    askedQuestions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        question: z.ZodString;
        type: z.ZodEnum<["conceptual", "debugging", "howto", "factual", "opinion", "clarification"]>;
        domain: z.ZodNullable<z.ZodString>;
        askedAt: z.ZodString;
        wasTeachingMoment: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
        question: string;
        domain: string | null;
        askedAt: string;
        wasTeachingMoment: boolean;
    }, {
        type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
        question: string;
        domain: string | null;
        askedAt: string;
        wasTeachingMoment: boolean;
    }>, "many">>;
    reviewRecords: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        filePath: z.ZodString;
        status: z.ZodEnum<["pending", "in_progress", "approved", "rejected", "skipped"]>;
        questionsAnswered: z.ZodNumber;
        totalQuestions: z.ZodNumber;
        createdAt: z.ZodString;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
        id: string;
        filePath: string;
        questionsAnswered: number;
        totalQuestions: number;
        createdAt: string;
        completedAt: string | null;
    }, {
        status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
        id: string;
        filePath: string;
        questionsAnswered: number;
        totalQuestions: number;
        createdAt: string;
        completedAt: string | null;
    }>, "many">>;
    teachingStats: z.ZodDefault<z.ZodObject<{
        teachingMoments: z.ZodDefault<z.ZodNumber>;
        socraticResponses: z.ZodDefault<z.ZodNumber>;
        directAnswers: z.ZodDefault<z.ZodNumber>;
        reviewsCompleted: z.ZodDefault<z.ZodNumber>;
        reviewsSkipped: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        teachingMoments: number;
        socraticResponses: number;
        directAnswers: number;
        reviewsCompleted: number;
        reviewsSkipped: number;
    }, {
        teachingMoments?: number | undefined;
        socraticResponses?: number | undefined;
        directAnswers?: number | undefined;
        reviewsCompleted?: number | undefined;
        reviewsSkipped?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    session: {
        startedAt: string;
        humanLines: number;
        claudeLines: number;
    };
    skills: Record<string, {
        score: number;
        lastPracticed: string;
    }>;
    quizHistory: {
        totalQuestions: number;
        score: number;
        timestamp: string;
        topic: string;
        correctAnswers: number;
    }[];
    askedQuestions: {
        type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
        question: string;
        domain: string | null;
        askedAt: string;
        wasTeachingMoment: boolean;
    }[];
    reviewRecords: {
        status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
        id: string;
        filePath: string;
        questionsAnswered: number;
        totalQuestions: number;
        createdAt: string;
        completedAt: string | null;
    }[];
    teachingStats: {
        teachingMoments: number;
        socraticResponses: number;
        directAnswers: number;
        reviewsCompleted: number;
        reviewsSkipped: number;
    };
}, {
    session: {
        startedAt: string;
        humanLines?: number | undefined;
        claudeLines?: number | undefined;
    };
    skills?: Record<string, {
        score: number;
        lastPracticed: string;
    }> | undefined;
    quizHistory?: {
        totalQuestions: number;
        score: number;
        timestamp: string;
        topic: string;
        correctAnswers: number;
    }[] | undefined;
    askedQuestions?: {
        type: "conceptual" | "debugging" | "howto" | "factual" | "opinion" | "clarification";
        question: string;
        domain: string | null;
        askedAt: string;
        wasTeachingMoment: boolean;
    }[] | undefined;
    reviewRecords?: {
        status: "pending" | "in_progress" | "approved" | "rejected" | "skipped";
        id: string;
        filePath: string;
        questionsAnswered: number;
        totalQuestions: number;
        createdAt: string;
        completedAt: string | null;
    }[] | undefined;
    teachingStats?: {
        teachingMoments?: number | undefined;
        socraticResponses?: number | undefined;
        directAnswers?: number | undefined;
        reviewsCompleted?: number | undefined;
        reviewsSkipped?: number | undefined;
    } | undefined;
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