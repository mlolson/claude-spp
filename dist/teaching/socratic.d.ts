import { z } from "zod";
/**
 * Question classification types
 */
export declare const QuestionTypeSchema: z.ZodEnum<["conceptual", "debugging", "howto", "factual", "opinion", "clarification"]>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
/**
 * Classification result
 */
export interface QuestionClassification {
    type: QuestionType;
    isLearnable: boolean;
    domain: string | null;
    confidence: number;
    suggestedApproach: "socratic" | "guided" | "direct";
}
/**
 * Domain patterns for classification
 */
interface DomainPattern {
    keywords: string[];
    docSources: string[];
}
/**
 * Known programming domains with documentation sources
 */
export declare const DOMAIN_PATTERNS: Record<string, DomainPattern>;
/**
 * Detect the domain of a question
 */
export declare function detectDomain(question: string): string | null;
/**
 * Get documentation sources for a domain
 */
export declare function getDocSources(domain: string): string[];
/**
 * Classify a user question
 */
export declare function classifyQuestion(question: string): QuestionClassification;
/**
 * Determine if this is a good teaching moment
 */
export declare function isTeachingMoment(classification: QuestionClassification, config?: {
    minConfidence?: number;
}): boolean;
/**
 * Previously asked question record
 */
export interface AskedQuestion {
    question: string;
    classification: QuestionClassification;
    askedAt: string;
    wasTeachingMoment: boolean;
}
/**
 * Check if a similar question was asked before
 */
export declare function findSimilarQuestion(question: string, history: AskedQuestion[]): AskedQuestion | null;
/**
 * Create record of asked question
 */
export declare function recordAskedQuestion(question: string, classification: QuestionClassification): AskedQuestion;
export {};
//# sourceMappingURL=socratic.d.ts.map