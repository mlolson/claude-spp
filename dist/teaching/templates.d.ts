import { z } from "zod";
import type { QuestionType, QuestionClassification } from "./socratic.js";
/**
 * Escalation levels for teaching
 */
export declare const EscalationLevelSchema: z.ZodEnum<["socratic", "guided", "hints", "explanation", "direct"]>;
export type EscalationLevel = z.infer<typeof EscalationLevelSchema>;
/**
 * Teaching response template
 */
export interface TeachingTemplate {
    level: EscalationLevel;
    opener: string;
    questions: string[];
    hints: string[];
    docPointer: string | null;
}
/**
 * Template selection context
 */
export interface TemplateContext {
    questionType: QuestionType;
    domain: string | null;
    escalationLevel: EscalationLevel;
    attemptCount: number;
}
/**
 * Get teaching template for a given context
 */
export declare function getTeachingTemplate(context: TemplateContext): TeachingTemplate;
/**
 * Determine appropriate escalation level based on attempt count
 */
export declare function getEscalationLevel(attemptCount: number, classification: QuestionClassification): EscalationLevel;
/**
 * Format a teaching response
 */
export declare function formatTeachingResponse(template: TeachingTemplate, options?: {
    maxQuestions?: number;
    includeHint?: boolean;
    includeDocPointer?: boolean;
}): string;
/**
 * Generate a complete teaching response for a question
 */
export declare function generateTeachingResponse(classification: QuestionClassification, attemptCount?: number): string;
/**
 * Check if user needs more help (should escalate)
 */
export declare function shouldEscalate(currentLevel: EscalationLevel, userResponse: string): boolean;
/**
 * Get encouragement message based on progress
 */
export declare function getEncouragement(attemptCount: number, isCorrect: boolean): string;
//# sourceMappingURL=templates.d.ts.map