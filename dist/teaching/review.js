import { z } from "zod";
/**
 * Review checkpoint status
 */
export const ReviewStatusSchema = z.enum([
    "pending", // Review not yet started
    "in_progress", // User is reviewing
    "approved", // User approved the changes
    "rejected", // User rejected, needs revision
    "skipped", // User chose to skip review
]);
/**
 * Code change type for review context
 */
export const ChangeTypeSchema = z.enum([
    "new_file",
    "modification",
    "deletion",
    "refactor",
]);
/**
 * Generate a unique checkpoint ID
 */
function generateCheckpointId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `review-${timestamp}-${random}`;
}
/**
 * Generate a unique question ID
 */
function generateQuestionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `q-${timestamp}-${random}`;
}
/**
 * Detect programming language from file path
 */
export function detectLanguage(filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const languageMap = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        py: "python",
        rb: "ruby",
        go: "go",
        rs: "rust",
        java: "java",
        kt: "kotlin",
        swift: "swift",
        css: "css",
        scss: "scss",
        html: "html",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        md: "markdown",
        sql: "sql",
    };
    return languageMap[ext ?? ""] ?? "unknown";
}
/**
 * Detect concepts from code
 */
export function detectConcepts(code, language) {
    const concepts = [];
    // TypeScript/JavaScript patterns
    if (language === "typescript" || language === "javascript") {
        if (/async\s+(function|\(|[a-zA-Z])/.test(code))
            concepts.push("async/await");
        if (/await\s+/.test(code))
            concepts.push("async/await");
        if (/new\s+Promise/.test(code))
            concepts.push("promises");
        if (/\.then\s*\(/.test(code))
            concepts.push("promises");
        if (/try\s*{/.test(code))
            concepts.push("error handling");
        if (/catch\s*\(/.test(code))
            concepts.push("error handling");
        if (/interface\s+\w+/.test(code))
            concepts.push("interfaces");
        if (/type\s+\w+\s*=/.test(code))
            concepts.push("type aliases");
        if (/<\w+>/.test(code))
            concepts.push("generics");
        if (/class\s+\w+/.test(code))
            concepts.push("classes");
        if (/extends\s+\w+/.test(code))
            concepts.push("inheritance");
        if (/implements\s+\w+/.test(code))
            concepts.push("interfaces");
        if (/\.(map|filter|reduce|forEach)\s*\(/.test(code))
            concepts.push("array methods");
        if (/=>\s*{?/.test(code))
            concepts.push("arrow functions");
        if (/\.\.\.\w+/.test(code))
            concepts.push("spread operator");
        if (/const\s*\[/.test(code) || /const\s*{/.test(code))
            concepts.push("destructuring");
        if (/import\s+/.test(code))
            concepts.push("modules");
        if (/export\s+/.test(code))
            concepts.push("modules");
        if (/useState|useEffect|useCallback|useMemo/.test(code))
            concepts.push("React hooks");
        if (/useRef|useContext|useReducer/.test(code))
            concepts.push("React hooks");
    }
    // Python patterns
    if (language === "python") {
        if (/def\s+\w+/.test(code))
            concepts.push("functions");
        if (/class\s+\w+/.test(code))
            concepts.push("classes");
        if (/async\s+def/.test(code))
            concepts.push("async/await");
        if (/await\s+/.test(code))
            concepts.push("async/await");
        if (/\[.*for.*in.*\]/.test(code))
            concepts.push("list comprehensions");
        if (/{.*for.*in.*}/.test(code))
            concepts.push("dict comprehensions");
        if (/with\s+/.test(code))
            concepts.push("context managers");
        if (/@\w+/.test(code))
            concepts.push("decorators");
        if (/try:/.test(code))
            concepts.push("error handling");
        if (/except\s*:?/.test(code))
            concepts.push("error handling");
    }
    return [...new Set(concepts)]; // Remove duplicates
}
/**
 * Question templates by concept
 */
const CONCEPT_QUESTIONS = {
    "async/await": [
        {
            question: "What makes this function asynchronous, and why is that important here?",
            hint: "Think about operations that take time to complete, like API calls or file reads.",
        },
        {
            question: "What would happen if we removed the 'await' keyword?",
            hint: "Consider what the function would return without awaiting the promise.",
        },
    ],
    promises: [
        {
            question: "What does this Promise resolve to, and when does that happen?",
            hint: "Follow the chain of .then() calls or look at what's being returned.",
        },
        {
            question: "How is error handling implemented for this async operation?",
            hint: "Look for .catch() or try/catch blocks.",
        },
    ],
    "error handling": [
        {
            question: "What types of errors might this code need to handle?",
            hint: "Consider network failures, invalid inputs, or unexpected data.",
        },
        {
            question: "What happens to the application if this error is thrown?",
            hint: "Trace the error propagation path up the call stack.",
        },
    ],
    interfaces: [
        {
            question: "What contract does this interface define?",
            hint: "List the properties and methods that implementers must provide.",
        },
        {
            question: "Why is using an interface beneficial here instead of a concrete type?",
            hint: "Think about flexibility, testing, and dependency injection.",
        },
    ],
    generics: [
        {
            question: "What type will the generic parameter be in typical usage?",
            hint: "Look at where this is called and what types are passed.",
        },
        {
            question: "Why use a generic here instead of a specific type?",
            hint: "Consider reusability and type safety benefits.",
        },
    ],
    classes: [
        {
            question: "What is this class responsible for (single responsibility)?",
            hint: "Summarize its purpose in one sentence.",
        },
        {
            question: "How might you test this class in isolation?",
            hint: "Think about what dependencies could be mocked.",
        },
    ],
    "array methods": [
        {
            question: "What transformation does this array operation perform?",
            hint: "Describe the input and output shapes.",
        },
        {
            question: "Could this be made more efficient or readable?",
            hint: "Consider combining operations or using different methods.",
        },
    ],
    "React hooks": [
        {
            question: "What triggers this hook to re-run?",
            hint: "Check the dependency array and what values are in it.",
        },
        {
            question: "What side effect does this hook manage?",
            hint: "Look at what happens inside useEffect or what state is being managed.",
        },
    ],
    modules: [
        {
            question: "Why are these specific items being imported/exported?",
            hint: "Consider the module's public API and encapsulation.",
        },
    ],
    destructuring: [
        {
            question: "What values are being extracted and from what structure?",
            hint: "Match the destructuring pattern to the source object/array.",
        },
    ],
};
/**
 * Generic questions for code changes
 */
const GENERIC_QUESTIONS = [
    {
        question: "What is the main purpose of this code change?",
        hint: "Summarize the functionality in one or two sentences.",
    },
    {
        question: "How would you test this code?",
        hint: "Think about edge cases, happy paths, and error scenarios.",
    },
    {
        question: "Are there any potential issues or improvements you can see?",
        hint: "Consider error handling, performance, and readability.",
    },
    {
        question: "How does this change integrate with the existing codebase?",
        hint: "Look at imports, exports, and function calls.",
    },
];
/**
 * Generate comprehension questions for code context
 */
export function generateComprehensionQuestions(context, maxQuestions = 3) {
    const questions = [];
    const usedQuestions = new Set();
    // Add concept-specific questions
    for (const concept of context.concepts) {
        const conceptQuestions = CONCEPT_QUESTIONS[concept] ?? [];
        for (const { question, hint } of conceptQuestions) {
            if (!usedQuestions.has(question) && questions.length < maxQuestions) {
                usedQuestions.add(question);
                questions.push({
                    id: generateQuestionId(),
                    question,
                    hint,
                    codeReference: null,
                    answered: false,
                });
            }
        }
    }
    // Fill remaining slots with generic questions
    for (const { question, hint } of GENERIC_QUESTIONS) {
        if (!usedQuestions.has(question) && questions.length < maxQuestions) {
            usedQuestions.add(question);
            questions.push({
                id: generateQuestionId(),
                question,
                hint,
                codeReference: null,
                answered: false,
            });
        }
    }
    return questions;
}
/**
 * Create a review checkpoint for code changes
 */
export function createReviewCheckpoint(filePath, changeType, addedLines, removedLines = []) {
    const language = detectLanguage(filePath);
    const code = addedLines.join("\n");
    const concepts = detectConcepts(code, language);
    const context = {
        filePath,
        changeType,
        language,
        addedLines,
        removedLines,
        concepts,
    };
    const questions = generateComprehensionQuestions(context);
    // Generate summary based on change type
    let summary;
    switch (changeType) {
        case "new_file":
            summary = `New file: ${filePath}`;
            break;
        case "modification":
            summary = `Modified: ${filePath} (+${addedLines.length} lines, -${removedLines.length} lines)`;
            break;
        case "deletion":
            summary = `Deleted: ${filePath}`;
            break;
        case "refactor":
            summary = `Refactored: ${filePath}`;
            break;
    }
    if (concepts.length > 0) {
        summary += ` | Concepts: ${concepts.slice(0, 3).join(", ")}`;
    }
    return {
        id: generateCheckpointId(),
        filePath,
        changeType,
        summary,
        questions,
        status: "pending",
        createdAt: new Date().toISOString(),
        completedAt: null,
    };
}
/**
 * Update checkpoint status
 */
export function updateCheckpointStatus(checkpoint, status) {
    return {
        ...checkpoint,
        status,
        completedAt: status === "approved" || status === "rejected" || status === "skipped"
            ? new Date().toISOString()
            : checkpoint.completedAt,
    };
}
/**
 * Mark a question as answered
 */
export function markQuestionAnswered(checkpoint, questionId) {
    return {
        ...checkpoint,
        questions: checkpoint.questions.map((q) => q.id === questionId ? { ...q, answered: true } : q),
    };
}
/**
 * Check if all questions are answered
 */
export function allQuestionsAnswered(checkpoint) {
    return checkpoint.questions.every((q) => q.answered);
}
/**
 * Format checkpoint for display
 */
export function formatCheckpointForReview(checkpoint) {
    const lines = [
        `## Code Review: ${checkpoint.summary}`,
        "",
        "Before this code is written, please review and answer the following questions:",
        "",
    ];
    for (let i = 0; i < checkpoint.questions.length; i++) {
        const q = checkpoint.questions[i];
        const status = q.answered ? "✓" : "○";
        lines.push(`${i + 1}. ${status} ${q.question}`);
        if (!q.answered) {
            lines.push(`   *Hint: ${q.hint}*`);
        }
        lines.push("");
    }
    lines.push("---");
    lines.push("Reply with your answers, or say 'skip' to proceed without review.");
    return lines.join("\n");
}
/**
 * Determine if a code change requires review
 */
export function requiresReview(filePath, addedLines, config = {}) {
    const { minLinesForReview = 10, excludePatterns = [] } = config;
    // Check if file matches exclude patterns
    for (const pattern of excludePatterns) {
        if (filePath.includes(pattern)) {
            return false;
        }
    }
    // Skip small changes
    if (addedLines.length < minLinesForReview) {
        return false;
    }
    // Skip certain file types
    const skipExtensions = [".json", ".lock", ".md", ".txt", ".yaml", ".yml"];
    if (skipExtensions.some((ext) => filePath.endsWith(ext))) {
        return false;
    }
    return true;
}
/**
 * Create a new review session
 */
export function createReviewSession() {
    return {
        checkpoints: [],
        totalReviews: 0,
        completedReviews: 0,
        skippedReviews: 0,
    };
}
/**
 * Add checkpoint to session
 */
export function addCheckpointToSession(session, checkpoint) {
    return {
        ...session,
        checkpoints: [...session.checkpoints, checkpoint],
        totalReviews: session.totalReviews + 1,
    };
}
/**
 * Update session when checkpoint is completed
 */
export function completeCheckpointInSession(session, checkpointId, status) {
    const checkpointIndex = session.checkpoints.findIndex((c) => c.id === checkpointId);
    if (checkpointIndex === -1) {
        return session;
    }
    const updatedCheckpoint = updateCheckpointStatus(session.checkpoints[checkpointIndex], status);
    return {
        ...session,
        checkpoints: [
            ...session.checkpoints.slice(0, checkpointIndex),
            updatedCheckpoint,
            ...session.checkpoints.slice(checkpointIndex + 1),
        ],
        completedReviews: status === "approved" || status === "rejected"
            ? session.completedReviews + 1
            : session.completedReviews,
        skippedReviews: status === "skipped"
            ? session.skippedReviews + 1
            : session.skippedReviews,
    };
}
/**
 * Get review completion rate
 */
export function getReviewCompletionRate(session) {
    if (session.totalReviews === 0)
        return 1;
    return session.completedReviews / session.totalReviews;
}
//# sourceMappingURL=review.js.map