import { describe, it, expect } from "vitest";
import {
  classifyQuestion,
  detectDomain,
  getDocSources,
  isTeachingMoment,
  findSimilarQuestion,
  recordAskedQuestion,
  DOMAIN_PATTERNS,
  type AskedQuestion,
} from "../src/teaching/socratic.js";

describe("Question Classification", () => {
  describe("classifyQuestion", () => {
    it("classifies conceptual 'what is' questions", () => {
      const result = classifyQuestion("What is a closure in JavaScript?");

      expect(result.type).toBe("conceptual");
      expect(result.isLearnable).toBe(true);
      expect(result.suggestedApproach).toBe("socratic");
    });

    it("classifies conceptual 'why does' questions", () => {
      const result = classifyQuestion("Why does React use a virtual DOM?");

      expect(result.type).toBe("conceptual");
      expect(result.isLearnable).toBe(true);
    });

    it("classifies debugging questions", () => {
      const result = classifyQuestion("Why isn't my component re-rendering?");

      expect(result.type).toBe("debugging");
      expect(result.isLearnable).toBe(true);
      expect(result.suggestedApproach).toBe("guided");
    });

    it("classifies 'not working' as debugging", () => {
      const result = classifyQuestion("My async function is not working correctly");

      expect(result.type).toBe("debugging");
      expect(result.isLearnable).toBe(true);
    });

    it("classifies how-to questions", () => {
      const result = classifyQuestion("How do I implement pagination in React?");

      expect(result.type).toBe("howto");
      expect(result.isLearnable).toBe(true);
      expect(result.suggestedApproach).toBe("socratic");
    });

    it("classifies syntax questions as factual", () => {
      const result = classifyQuestion("What's the syntax for a TypeScript generic?");

      expect(result.type).toBe("factual");
      expect(result.isLearnable).toBe(false);
      expect(result.suggestedApproach).toBe("direct");
    });

    it("classifies example requests as factual", () => {
      const result = classifyQuestion("Show me an example of useEffect");

      expect(result.type).toBe("factual");
      expect(result.isLearnable).toBe(false);
    });

    it("detects domain in question", () => {
      const result = classifyQuestion("What is a TypeScript interface?");

      expect(result.domain).toBe("typescript");
    });

    it("returns clarification for ambiguous questions", () => {
      const result = classifyQuestion("Help");

      expect(result.type).toBe("clarification");
      expect(result.confidence).toBeLessThan(0.7);
    });
  });

  describe("detectDomain", () => {
    it("detects typescript domain", () => {
      expect(detectDomain("What is a TypeScript interface?")).toBe("typescript");
    });

    it("detects javascript domain", () => {
      expect(detectDomain("How do async await work?")).toBe("javascript");
    });

    it("detects react domain", () => {
      expect(detectDomain("Why does my component re-render?")).toBe("react");
    });

    it("detects git domain", () => {
      expect(detectDomain("How do I rebase my branch?")).toBe("git");
    });

    it("detects testing domain", () => {
      expect(detectDomain("How do I mock a function in vitest?")).toBe("testing");
    });

    it("returns null for unknown domain", () => {
      expect(detectDomain("What's for lunch?")).toBeNull();
    });
  });

  describe("getDocSources", () => {
    it("returns doc sources for known domains", () => {
      const sources = getDocSources("typescript");

      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some((s) => s.includes("typescriptlang"))).toBe(true);
    });

    it("returns empty array for unknown domain", () => {
      expect(getDocSources("unknown")).toEqual([]);
    });
  });

  describe("DOMAIN_PATTERNS", () => {
    it("has patterns for common domains", () => {
      const expectedDomains = ["typescript", "javascript", "react", "node", "git", "css", "testing"];

      for (const domain of expectedDomains) {
        expect(DOMAIN_PATTERNS[domain]).toBeDefined();
        expect(DOMAIN_PATTERNS[domain].keywords.length).toBeGreaterThan(0);
        expect(DOMAIN_PATTERNS[domain].docSources.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("Teaching Moment Detection", () => {
  describe("isTeachingMoment", () => {
    it("returns true for learnable conceptual questions", () => {
      const classification = classifyQuestion("What is dependency injection?");

      expect(isTeachingMoment(classification)).toBe(true);
    });

    it("returns true for debugging questions", () => {
      const classification = classifyQuestion("Why is my state not updating?");

      expect(isTeachingMoment(classification)).toBe(true);
    });

    it("returns false for factual questions", () => {
      const classification = classifyQuestion("What's the syntax for map?");

      expect(isTeachingMoment(classification)).toBe(false);
    });

    it("returns false for low confidence classifications", () => {
      const classification = classifyQuestion("Help");

      expect(isTeachingMoment(classification)).toBe(false);
    });

    it("respects custom confidence threshold", () => {
      const classification = classifyQuestion("What is a variable?");

      expect(isTeachingMoment(classification, { minConfidence: 0.9 })).toBe(false);
      expect(isTeachingMoment(classification, { minConfidence: 0.5 })).toBe(true);
    });
  });
});

describe("Question History", () => {
  describe("findSimilarQuestion", () => {
    const history: AskedQuestion[] = [
      {
        question: "What is a closure in JavaScript?",
        classification: classifyQuestion("What is a closure in JavaScript?"),
        askedAt: new Date().toISOString(),
        wasTeachingMoment: true,
      },
      {
        question: "How do I use async await?",
        classification: classifyQuestion("How do I use async await?"),
        askedAt: new Date().toISOString(),
        wasTeachingMoment: true,
      },
    ];

    it("finds exact match", () => {
      const found = findSimilarQuestion("What is a closure in JavaScript?", history);

      expect(found).not.toBeNull();
      expect(found?.question).toBe("What is a closure in JavaScript?");
    });

    it("finds similar question with high word overlap", () => {
      // Using same words in different order
      const found = findSimilarQuestion("What is a closure JavaScript", history);

      expect(found).not.toBeNull();
    });

    it("returns null for unrelated question", () => {
      const found = findSimilarQuestion("What is dependency injection?", history);

      expect(found).toBeNull();
    });

    it("returns null for empty history", () => {
      const found = findSimilarQuestion("What is a closure?", []);

      expect(found).toBeNull();
    });
  });

  describe("recordAskedQuestion", () => {
    it("creates record with classification", () => {
      const classification = classifyQuestion("What is a closure?");
      const record = recordAskedQuestion("What is a closure?", classification);

      expect(record.question).toBe("What is a closure?");
      expect(record.classification).toBe(classification);
      expect(record.askedAt).toBeDefined();
      expect(record.wasTeachingMoment).toBe(true);
    });

    it("marks non-learnable questions correctly", () => {
      const classification = classifyQuestion("Show me the syntax");
      const record = recordAskedQuestion("Show me the syntax", classification);

      expect(record.wasTeachingMoment).toBe(false);
    });
  });
});
