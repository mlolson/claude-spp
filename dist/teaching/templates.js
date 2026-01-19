import { z } from "zod";
/**
 * Escalation levels for teaching
 */
export const EscalationLevelSchema = z.enum([
    "socratic", // Pure questions, no direct hints
    "guided", // Questions with gentle nudges
    "hints", // Explicit hints provided
    "explanation", // Full explanation with teaching
    "direct", // Direct answer (user is stuck)
]);
/**
 * Socratic question templates by question type
 */
const SOCRATIC_QUESTIONS = {
    conceptual: [
        "What do you already know about {topic}?",
        "Can you think of a simpler example where this concept applies?",
        "How would you explain this to someone who's never coded before?",
        "What problem do you think this concept was designed to solve?",
        "Have you encountered anything similar in other languages or contexts?",
    ],
    debugging: [
        "What did you expect to happen?",
        "What actually happened instead?",
        "When did this start occurring? What changed recently?",
        "Can you isolate the smallest piece of code that reproduces the issue?",
        "Have you checked what values your variables have at this point?",
        "What happens if you remove this part of the code?",
    ],
    howto: [
        "What's the first step you think you'd need to take?",
        "What similar problems have you solved before?",
        "If you had to break this down into smaller tasks, what would they be?",
        "What tools or functions do you think might be useful here?",
        "What would success look like for this task?",
    ],
    factual: [
        "Do you remember where you might have seen this before?",
        "What would you search for to find this information?",
    ],
    opinion: [
        "What factors are most important in your specific situation?",
        "What trade-offs are you willing to make?",
    ],
    clarification: [
        "What part specifically is unclear?",
        "Can you give me an example of what you're trying to achieve?",
    ],
};
/**
 * Opener phrases by escalation level
 */
const OPENERS = {
    socratic: [
        "Let's think through this together.",
        "Good question! Let me help you discover the answer.",
        "This is a great learning opportunity.",
        "Let's explore this concept step by step.",
    ],
    guided: [
        "You're on the right track. Let me guide you a bit.",
        "Here's a hint to point you in the right direction.",
        "Consider this approach:",
        "Think about it this way:",
    ],
    hints: [
        "Here's a more concrete hint:",
        "Let me narrow it down for you:",
        "The key insight here is:",
        "Focus on this specific area:",
    ],
    explanation: [
        "Let me explain how this works:",
        "Here's what's happening:",
        "The concept works like this:",
        "Let me walk you through this:",
    ],
    direct: [
        "Here's the answer:",
        "The solution is:",
        "You can do this by:",
        "Here's how to proceed:",
    ],
};
/**
 * Hint templates by question type
 */
const HINTS = {
    conceptual: [
        "Think about what problem this solves in real-world applications.",
        "Consider the relationship between {concept} and {related_concept}.",
        "The key distinction here is about {key_aspect}.",
        "This pattern is commonly used when you need to {use_case}.",
    ],
    debugging: [
        "Check the value of {variable} right before the error occurs.",
        "The error message mentions {error_hint} - what might cause that?",
        "Try adding a console.log/print statement at {location}.",
        "This type of error often happens when {common_cause}.",
        "Compare what you expect {expected} vs what you're getting {actual}.",
    ],
    howto: [
        "Start by {first_step}.",
        "You'll need to use {tool_or_function}.",
        "Break it down: first {step1}, then {step2}.",
        "Look at how {similar_feature} is implemented in the codebase.",
    ],
    factual: [
        "The documentation for this is at {doc_url}.",
        "The syntax follows this pattern: {pattern}.",
    ],
    opinion: [
        "For your use case, consider {recommendation} because {reason}.",
        "The trade-off here is between {option1} and {option2}.",
    ],
    clarification: [
        "Are you asking about {interpretation1} or {interpretation2}?",
        "Let me make sure I understand: you want to {restatement}?",
    ],
};
/**
 * Documentation pointers by domain
 */
const DOC_POINTERS = {
    typescript: "Check the TypeScript Handbook at typescriptlang.org/docs/handbook",
    javascript: "MDN Web Docs is an excellent resource: developer.mozilla.org",
    react: "The React docs at react.dev have great explanations and examples",
    node: "Node.js docs at nodejs.org/docs cover this topic well",
    git: "The Pro Git book at git-scm.com/book is comprehensive",
    css: "MDN CSS reference is very helpful: developer.mozilla.org/en-US/docs/Web/CSS",
    testing: "Check the testing framework docs (Vitest: vitest.dev, Jest: jestjs.io)",
};
/**
 * Get a random item from an array
 */
function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}
/**
 * Get teaching template for a given context
 */
export function getTeachingTemplate(context) {
    const { questionType, domain, escalationLevel } = context;
    return {
        level: escalationLevel,
        opener: randomChoice(OPENERS[escalationLevel]),
        questions: SOCRATIC_QUESTIONS[questionType] ?? [],
        hints: HINTS[questionType] ?? [],
        docPointer: domain ? DOC_POINTERS[domain] ?? null : null,
    };
}
/**
 * Determine appropriate escalation level based on attempt count
 */
export function getEscalationLevel(attemptCount, classification) {
    // Direct answer questions skip escalation
    if (classification.suggestedApproach === "direct") {
        return "direct";
    }
    // Debugging gets guided approach earlier
    if (classification.type === "debugging") {
        if (attemptCount <= 1)
            return "guided";
        if (attemptCount <= 2)
            return "hints";
        if (attemptCount <= 3)
            return "explanation";
        return "direct";
    }
    // Standard escalation path
    if (attemptCount <= 1)
        return "socratic";
    if (attemptCount <= 2)
        return "guided";
    if (attemptCount <= 3)
        return "hints";
    if (attemptCount <= 4)
        return "explanation";
    return "direct";
}
/**
 * Format a teaching response
 */
export function formatTeachingResponse(template, options = {}) {
    const { maxQuestions = 2, includeHint = template.level !== "socratic", includeDocPointer = true, } = options;
    const lines = [template.opener, ""];
    // Add questions (for socratic/guided levels)
    if (template.level === "socratic" || template.level === "guided") {
        const questions = template.questions.slice(0, maxQuestions);
        for (const q of questions) {
            lines.push(`- ${q}`);
        }
        if (questions.length > 0) {
            lines.push("");
        }
    }
    // Add hint if appropriate
    if (includeHint && template.hints.length > 0) {
        const hint = randomChoice(template.hints);
        lines.push(`**Hint:** ${hint}`);
        lines.push("");
    }
    // Add doc pointer
    if (includeDocPointer && template.docPointer) {
        lines.push(`**Reference:** ${template.docPointer}`);
    }
    return lines.join("\n").trim();
}
/**
 * Generate a complete teaching response for a question
 */
export function generateTeachingResponse(classification, attemptCount = 1) {
    const escalationLevel = getEscalationLevel(attemptCount, classification);
    const context = {
        questionType: classification.type,
        domain: classification.domain,
        escalationLevel,
        attemptCount,
    };
    const template = getTeachingTemplate(context);
    return formatTeachingResponse(template, {
        includeHint: attemptCount > 1,
        includeDocPointer: classification.domain !== null,
    });
}
/**
 * Check if user needs more help (should escalate)
 */
export function shouldEscalate(currentLevel, userResponse) {
    const stuckIndicators = [
        /i('m| am)\s+(still\s+)?(confused|stuck|lost)/i,
        /i\s+don('t| do not)\s+(understand|get it|know)/i,
        /(can you|could you|please)\s+(just\s+)?(tell|show|give)\s+me/i,
        /what('s| is)\s+the\s+answer/i,
        /i\s+give\s+up/i,
        /just\s+tell\s+me/i,
    ];
    return stuckIndicators.some((pattern) => pattern.test(userResponse));
}
/**
 * Get encouragement message based on progress
 */
export function getEncouragement(attemptCount, isCorrect) {
    if (isCorrect) {
        const successMessages = [
            "Excellent! You've got it!",
            "That's right! Great thinking.",
            "Perfect! You figured it out.",
            "Exactly! Well done working through that.",
        ];
        return randomChoice(successMessages);
    }
    const encouragementByAttempt = {
        1: [
            "Good start! Let's think a bit more about this.",
            "You're thinking along the right lines.",
            "That's a reasonable first thought. Let's dig deeper.",
        ],
        2: [
            "Getting closer! Consider another angle.",
            "You're making progress. Here's another hint.",
            "Keep at it! Let's narrow down the options.",
        ],
        3: [
            "Don't give up! Let me help a bit more.",
            "Almost there. Let's look at this more directly.",
            "Good effort! Here's some more guidance.",
        ],
    };
    const messages = encouragementByAttempt[attemptCount] ?? [
        "Let me explain this more clearly.",
        "Here's a more direct explanation.",
    ];
    return randomChoice(messages);
}
//# sourceMappingURL=templates.js.map