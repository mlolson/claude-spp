import { z } from "zod";

/**
 * Question classification types
 */
export const QuestionTypeSchema = z.enum([
  "conceptual",     // "What is..." / "Why does..." - learnable
  "debugging",      // "Why isn't this working..." - learnable with hints
  "howto",          // "How do I..." - learnable
  "factual",        // "What's the syntax for..." - direct answer ok
  "opinion",        // "What's the best..." - direct answer ok
  "clarification",  // "Can you explain..." - depends on context
]);
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
export const DOMAIN_PATTERNS: Record<string, DomainPattern> = {
  typescript: {
    keywords: ["typescript", "ts", "type", "interface", "generic", "enum"],
    docSources: ["typescriptlang.org/docs", "TypeScript Handbook"],
  },
  javascript: {
    keywords: ["javascript", "js", "async", "await", "promise", "closure", "prototype"],
    docSources: ["developer.mozilla.org/en-US/docs/Web/JavaScript", "MDN Web Docs"],
  },
  react: {
    keywords: ["react", "component", "hook", "usestate", "useeffect", "jsx", "props"],
    docSources: ["react.dev", "React Documentation"],
  },
  node: {
    keywords: ["node", "nodejs", "npm", "require", "module", "fs", "path", "buffer"],
    docSources: ["nodejs.org/docs", "Node.js Documentation"],
  },
  git: {
    keywords: ["git", "commit", "branch", "merge", "rebase", "pull", "push", "stash"],
    docSources: ["git-scm.com/doc", "Pro Git Book"],
  },
  css: {
    keywords: ["css", "flexbox", "grid", "selector", "style", "layout", "responsive"],
    docSources: ["developer.mozilla.org/en-US/docs/Web/CSS", "MDN CSS Reference"],
  },
  testing: {
    keywords: ["test", "jest", "vitest", "mock", "assert", "expect", "describe", "it"],
    docSources: ["vitest.dev", "jestjs.io/docs"],
  },
  database: {
    keywords: ["sql", "query", "database", "postgres", "mysql", "mongodb", "schema"],
    docSources: ["Database documentation varies by system"],
  },
};

/**
 * Question patterns that indicate learnable moments
 * Order matters: more specific patterns should come before general ones
 */
const LEARNABLE_PATTERNS: Array<{ pattern: RegExp; type: QuestionType }> = [
  // Debugging questions - check these first (more specific)
  { pattern: /why\s+(isn't|is not|doesn't|does not|won't|will not)/i, type: "debugging" },
  { pattern: /(not\s+working|doesn't\s+work|broken|failing|error)/i, type: "debugging" },
  { pattern: /what('s| is)\s+wrong\s+with/i, type: "debugging" },
  { pattern: /how\s+(do|can)\s+i\s+(fix|solve|resolve|debug)/i, type: "debugging" },

  // How-to questions - check before conceptual "how does" patterns
  { pattern: /^how\s+(do|can|should|would)\s+(i|you|we)\s+(?!.*(work|function))/i, type: "howto" },
  { pattern: /what('s| is)\s+the\s+(best|right|correct)\s+way\s+to/i, type: "howto" },

  // Conceptual questions
  { pattern: /^what\s+(is|are)\s+(a|an|the)?\s*/i, type: "conceptual" },
  { pattern: /^why\s+(does|do|is|are|did|would|should)/i, type: "conceptual" },
  { pattern: /^how\s+(does|do|is|are)\s+/i, type: "conceptual" },
  { pattern: /explain\s+(how|why|what)/i, type: "conceptual" },
  { pattern: /what('s| is)\s+the\s+difference\s+between/i, type: "conceptual" },
  { pattern: /when\s+should\s+(i|you|we)\s+use/i, type: "conceptual" },

  // Generic help requests - often need clarification but treated as howto
  { pattern: /^can\s+(i|you|we)\s+\w+\s+\w+/i, type: "howto" },
];

/**
 * Patterns that indicate direct answer is appropriate
 */
const DIRECT_ANSWER_PATTERNS: Array<{ pattern: RegExp; type: QuestionType }> = [
  // Factual/syntax questions
  { pattern: /^what('s| is)\s+the\s+syntax\s+(for|of)/i, type: "factual" },
  { pattern: /^what('s| is)\s+the\s+(command|function|method)\s+(for|to)/i, type: "factual" },
  { pattern: /^show\s+me\s+(how|an?\s+example)/i, type: "factual" },
  { pattern: /^give\s+me\s+an?\s+example/i, type: "factual" },

  // Opinion/preference questions
  { pattern: /^what('s| is)\s+(your|the\s+best)\s+(favorite|preference|recommendation)/i, type: "opinion" },
  { pattern: /^which\s+(one|is\s+better)/i, type: "opinion" },
];

/**
 * Detect the domain of a question
 */
export function detectDomain(question: string): string | null {
  const lowerQuestion = question.toLowerCase();

  for (const [domain, { keywords }] of Object.entries(DOMAIN_PATTERNS)) {
    for (const keyword of keywords) {
      if (lowerQuestion.includes(keyword)) {
        return domain;
      }
    }
  }

  return null;
}

/**
 * Get documentation sources for a domain
 */
export function getDocSources(domain: string): string[] {
  return DOMAIN_PATTERNS[domain]?.docSources ?? [];
}

/**
 * Classify a user question
 */
export function classifyQuestion(question: string): QuestionClassification {
  const trimmedQuestion = question.trim();

  // Check for direct answer patterns first
  for (const { pattern, type } of DIRECT_ANSWER_PATTERNS) {
    if (pattern.test(trimmedQuestion)) {
      return {
        type,
        isLearnable: false,
        domain: detectDomain(trimmedQuestion),
        confidence: 0.8,
        suggestedApproach: "direct",
      };
    }
  }

  // Check for learnable patterns
  for (const { pattern, type } of LEARNABLE_PATTERNS) {
    if (pattern.test(trimmedQuestion)) {
      return {
        type,
        isLearnable: true,
        domain: detectDomain(trimmedQuestion),
        confidence: 0.85,
        suggestedApproach: type === "debugging" ? "guided" : "socratic",
      };
    }
  }

  // Default to clarification (context-dependent)
  return {
    type: "clarification",
    isLearnable: false,
    domain: detectDomain(trimmedQuestion),
    confidence: 0.5,
    suggestedApproach: "direct",
  };
}

/**
 * Determine if this is a good teaching moment
 */
export function isTeachingMoment(
  classification: QuestionClassification,
  config: { minConfidence?: number } = {}
): boolean {
  const minConfidence = config.minConfidence ?? 0.7;

  return (
    classification.isLearnable &&
    classification.confidence >= minConfidence &&
    classification.suggestedApproach !== "direct"
  );
}

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
 * Normalize text for comparison by removing punctuation and lowercasing
 */
function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

/**
 * Get words from text for comparison
 */
function getWords(text: string): string[] {
  return normalizeForComparison(text).split(/\s+/).filter(Boolean);
}

/**
 * Check if a similar question was asked before
 */
export function findSimilarQuestion(
  question: string,
  history: AskedQuestion[]
): AskedQuestion | null {
  const normalizedQuestion = normalizeForComparison(question);
  const questionWords = new Set(getWords(question));

  // Simple similarity check - look for high word overlap
  for (const asked of history) {
    const normalizedAsked = normalizeForComparison(asked.question);

    // Exact or near-exact match
    if (normalizedQuestion === normalizedAsked) {
      return asked;
    }

    // Word overlap check
    const askedWords = getWords(asked.question);
    const overlapCount = askedWords.filter((w) => questionWords.has(w)).length;
    const overlapRatio = overlapCount / Math.max(questionWords.size, askedWords.length);

    if (overlapRatio > 0.7) {
      return asked;
    }
  }

  return null;
}

/**
 * Create record of asked question
 */
export function recordAskedQuestion(
  question: string,
  classification: QuestionClassification
): AskedQuestion {
  return {
    question,
    classification,
    askedAt: new Date().toISOString(),
    wasTeachingMoment: isTeachingMoment(classification),
  };
}
