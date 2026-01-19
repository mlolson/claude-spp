import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  detectConcepts,
  generateComprehensionQuestions,
  createReviewCheckpoint,
  updateCheckpointStatus,
  markQuestionAnswered,
  allQuestionsAnswered,
  formatCheckpointForReview,
  requiresReview,
  createReviewSession,
  addCheckpointToSession,
  completeCheckpointInSession,
  getReviewCompletionRate,
} from "../src/teaching/review.js";

describe("Code Review - Language Detection", () => {
  describe("detectLanguage", () => {
    it("detects TypeScript from .ts extension", () => {
      expect(detectLanguage("src/utils.ts")).toBe("typescript");
    });

    it("detects TypeScript from .tsx extension", () => {
      expect(detectLanguage("src/Component.tsx")).toBe("typescript");
    });

    it("detects JavaScript from .js extension", () => {
      expect(detectLanguage("src/index.js")).toBe("javascript");
    });

    it("detects Python from .py extension", () => {
      expect(detectLanguage("main.py")).toBe("python");
    });

    it("detects Go from .go extension", () => {
      expect(detectLanguage("server.go")).toBe("go");
    });

    it("returns unknown for unrecognized extensions", () => {
      expect(detectLanguage("Dockerfile")).toBe("unknown");
    });

    it("handles paths with multiple dots", () => {
      expect(detectLanguage("config.test.ts")).toBe("typescript");
    });
  });
});

describe("Code Review - Concept Detection", () => {
  describe("detectConcepts", () => {
    it("detects async/await in TypeScript", () => {
      const code = `
        async function fetchData() {
          const data = await fetch('/api');
          return data;
        }
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("async/await");
    });

    it("detects promises", () => {
      const code = `
        new Promise((resolve, reject) => {
          resolve(42);
        }).then(result => console.log(result));
      `;
      const concepts = detectConcepts(code, "javascript");

      expect(concepts).toContain("promises");
    });

    it("detects error handling", () => {
      const code = `
        try {
          riskyOperation();
        } catch (error) {
          console.error(error);
        }
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("error handling");
    });

    it("detects TypeScript interfaces", () => {
      const code = `
        interface User {
          id: number;
          name: string;
        }
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("interfaces");
    });

    it("detects generics", () => {
      const code = `
        function identity<T>(arg: T): T {
          return arg;
        }
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("generics");
    });

    it("detects React hooks", () => {
      const code = `
        const [count, setCount] = useState(0);
        useEffect(() => {
          document.title = count;
        }, [count]);
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("React hooks");
    });

    it("detects array methods", () => {
      const code = `
        const doubled = numbers.map(n => n * 2);
        const evens = numbers.filter(n => n % 2 === 0);
      `;
      const concepts = detectConcepts(code, "javascript");

      expect(concepts).toContain("array methods");
    });

    it("detects classes and inheritance", () => {
      const code = `
        class Animal {
          name: string;
        }
        class Dog extends Animal implements Pet {
          bark() {}
        }
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("classes");
      expect(concepts).toContain("inheritance");
      expect(concepts).toContain("interfaces");
    });

    it("detects modules", () => {
      const code = `
        import { foo } from './foo';
        export const bar = 42;
      `;
      const concepts = detectConcepts(code, "typescript");

      expect(concepts).toContain("modules");
    });

    it("detects Python-specific patterns", () => {
      const code = `
        @decorator
        async def main():
            await asyncio.sleep(1)
            with open('file.txt') as f:
                data = [x for x in f]
      `;
      const concepts = detectConcepts(code, "python");

      expect(concepts).toContain("decorators");
      expect(concepts).toContain("async/await");
      expect(concepts).toContain("context managers");
      expect(concepts).toContain("list comprehensions");
    });

    it("removes duplicate concepts", () => {
      const code = `
        async function a() { await x; }
        async function b() { await y; }
      `;
      const concepts = detectConcepts(code, "typescript");
      const asyncCount = concepts.filter((c) => c === "async/await").length;

      expect(asyncCount).toBe(1);
    });
  });
});

describe("Code Review - Comprehension Questions", () => {
  describe("generateComprehensionQuestions", () => {
    it("generates questions for async code", () => {
      const questions = generateComprehensionQuestions({
        filePath: "src/api.ts",
        changeType: "new_file",
        language: "typescript",
        addedLines: ["async function fetch() {", "  await getData();", "}"],
        removedLines: [],
        concepts: ["async/await"],
      });

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((q) => q.question.toLowerCase().includes("async"))).toBe(true);
    });

    it("generates questions up to maxQuestions", () => {
      const questions = generateComprehensionQuestions(
        {
          filePath: "src/complex.ts",
          changeType: "new_file",
          language: "typescript",
          addedLines: Array(100).fill("code"),
          removedLines: [],
          concepts: ["async/await", "error handling", "promises", "generics"],
        },
        2
      );

      expect(questions.length).toBeLessThanOrEqual(2);
    });

    it("generates generic questions when no concepts detected", () => {
      const questions = generateComprehensionQuestions({
        filePath: "src/simple.ts",
        changeType: "new_file",
        language: "typescript",
        addedLines: ["const x = 1;"],
        removedLines: [],
        concepts: [],
      });

      expect(questions.length).toBeGreaterThan(0);
    });

    it("each question has required properties", () => {
      const questions = generateComprehensionQuestions({
        filePath: "src/test.ts",
        changeType: "modification",
        language: "typescript",
        addedLines: ["const x = 1;"],
        removedLines: [],
        concepts: [],
      });

      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.hint).toBeDefined();
        expect(q.answered).toBe(false);
      }
    });
  });
});

describe("Code Review - Checkpoints", () => {
  describe("createReviewCheckpoint", () => {
    it("creates checkpoint with correct properties", () => {
      const checkpoint = createReviewCheckpoint(
        "src/utils.ts",
        "new_file",
        ["export function add(a: number, b: number) {", "  return a + b;", "}"]
      );

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.filePath).toBe("src/utils.ts");
      expect(checkpoint.changeType).toBe("new_file");
      expect(checkpoint.status).toBe("pending");
      expect(checkpoint.createdAt).toBeDefined();
      expect(checkpoint.completedAt).toBeNull();
    });

    it("generates summary based on change type", () => {
      const newFile = createReviewCheckpoint("src/new.ts", "new_file", ["code"]);
      const modified = createReviewCheckpoint("src/mod.ts", "modification", ["code"], ["old"]);

      expect(newFile.summary).toContain("New file");
      expect(modified.summary).toContain("Modified");
    });

    it("includes concepts in summary when detected", () => {
      const checkpoint = createReviewCheckpoint(
        "src/async.ts",
        "new_file",
        ["async function test() {", "  await Promise.resolve();", "}"]
      );

      expect(checkpoint.summary).toContain("Concepts:");
    });

    it("generates comprehension questions", () => {
      const checkpoint = createReviewCheckpoint("src/test.ts", "new_file", [
        "function test() { return 42; }",
      ]);

      expect(checkpoint.questions.length).toBeGreaterThan(0);
    });
  });

  describe("updateCheckpointStatus", () => {
    it("updates status to approved", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      const updated = updateCheckpointStatus(checkpoint, "approved");

      expect(updated.status).toBe("approved");
      expect(updated.completedAt).not.toBeNull();
    });

    it("updates status to rejected", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      const updated = updateCheckpointStatus(checkpoint, "rejected");

      expect(updated.status).toBe("rejected");
      expect(updated.completedAt).not.toBeNull();
    });

    it("updates status to in_progress without completion time", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      const updated = updateCheckpointStatus(checkpoint, "in_progress");

      expect(updated.status).toBe("in_progress");
      expect(updated.completedAt).toBeNull();
    });
  });

  describe("markQuestionAnswered", () => {
    it("marks specific question as answered", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      const questionId = checkpoint.questions[0].id;

      const updated = markQuestionAnswered(checkpoint, questionId);

      expect(updated.questions.find((q) => q.id === questionId)?.answered).toBe(true);
    });

    it("does not affect other questions", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);

      if (checkpoint.questions.length >= 2) {
        const updated = markQuestionAnswered(checkpoint, checkpoint.questions[0].id);

        expect(updated.questions[1].answered).toBe(false);
      }
    });
  });

  describe("allQuestionsAnswered", () => {
    it("returns false when questions remain", () => {
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);

      expect(allQuestionsAnswered(checkpoint)).toBe(false);
    });

    it("returns true when all answered", () => {
      let checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);

      for (const q of checkpoint.questions) {
        checkpoint = markQuestionAnswered(checkpoint, q.id);
      }

      expect(allQuestionsAnswered(checkpoint)).toBe(true);
    });
  });

  describe("formatCheckpointForReview", () => {
    it("formats checkpoint as markdown", () => {
      const checkpoint = createReviewCheckpoint("src/test.ts", "new_file", ["const x = 1;"]);
      const formatted = formatCheckpointForReview(checkpoint);

      expect(formatted).toContain("## Code Review");
      expect(formatted).toContain("src/test.ts");
    });

    it("shows unanswered questions with hints", () => {
      const checkpoint = createReviewCheckpoint("src/test.ts", "new_file", ["const x = 1;"]);
      const formatted = formatCheckpointForReview(checkpoint);

      expect(formatted).toContain("○"); // Unanswered marker
      expect(formatted).toContain("*Hint:");
    });

    it("shows answered questions without hints", () => {
      let checkpoint = createReviewCheckpoint("src/test.ts", "new_file", ["const x = 1;"]);
      checkpoint = markQuestionAnswered(checkpoint, checkpoint.questions[0].id);

      const formatted = formatCheckpointForReview(checkpoint);

      expect(formatted).toContain("✓"); // Answered marker
    });
  });

  describe("requiresReview", () => {
    it("returns true for large code changes", () => {
      const lines = Array(20).fill("const x = 1;");

      expect(requiresReview("src/big.ts", lines)).toBe(true);
    });

    it("returns false for small changes", () => {
      expect(requiresReview("src/small.ts", ["const x = 1;"])).toBe(false);
    });

    it("returns false for JSON files", () => {
      const lines = Array(100).fill('"key": "value"');

      expect(requiresReview("package.json", lines)).toBe(false);
    });

    it("returns false for markdown files", () => {
      const lines = Array(100).fill("# Heading");

      expect(requiresReview("README.md", lines)).toBe(false);
    });

    it("respects minLinesForReview config", () => {
      const lines = Array(5).fill("code");

      expect(requiresReview("src/test.ts", lines, { minLinesForReview: 3 })).toBe(true);
      expect(requiresReview("src/test.ts", lines, { minLinesForReview: 10 })).toBe(false);
    });

    it("respects excludePatterns", () => {
      const lines = Array(50).fill("code");

      expect(
        requiresReview("src/generated/types.ts", lines, {
          excludePatterns: ["generated"],
        })
      ).toBe(false);
    });
  });
});

describe("Code Review - Session Management", () => {
  describe("createReviewSession", () => {
    it("creates empty session", () => {
      const session = createReviewSession();

      expect(session.checkpoints).toEqual([]);
      expect(session.totalReviews).toBe(0);
      expect(session.completedReviews).toBe(0);
      expect(session.skippedReviews).toBe(0);
    });
  });

  describe("addCheckpointToSession", () => {
    it("adds checkpoint to session", () => {
      const session = createReviewSession();
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);

      const updated = addCheckpointToSession(session, checkpoint);

      expect(updated.checkpoints).toHaveLength(1);
      expect(updated.totalReviews).toBe(1);
    });

    it("preserves existing checkpoints", () => {
      let session = createReviewSession();
      const cp1 = createReviewCheckpoint("test1.ts", "new_file", ["code"]);
      const cp2 = createReviewCheckpoint("test2.ts", "new_file", ["code"]);

      session = addCheckpointToSession(session, cp1);
      session = addCheckpointToSession(session, cp2);

      expect(session.checkpoints).toHaveLength(2);
      expect(session.totalReviews).toBe(2);
    });
  });

  describe("completeCheckpointInSession", () => {
    it("marks checkpoint as approved", () => {
      let session = createReviewSession();
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      session = addCheckpointToSession(session, checkpoint);

      session = completeCheckpointInSession(session, checkpoint.id, "approved");

      expect(session.checkpoints[0].status).toBe("approved");
      expect(session.completedReviews).toBe(1);
    });

    it("marks checkpoint as skipped", () => {
      let session = createReviewSession();
      const checkpoint = createReviewCheckpoint("test.ts", "new_file", ["code"]);
      session = addCheckpointToSession(session, checkpoint);

      session = completeCheckpointInSession(session, checkpoint.id, "skipped");

      expect(session.checkpoints[0].status).toBe("skipped");
      expect(session.skippedReviews).toBe(1);
    });

    it("handles non-existent checkpoint", () => {
      const session = createReviewSession();

      const updated = completeCheckpointInSession(session, "non-existent", "approved");

      expect(updated).toEqual(session);
    });
  });

  describe("getReviewCompletionRate", () => {
    it("returns 1 for empty session", () => {
      const session = createReviewSession();

      expect(getReviewCompletionRate(session)).toBe(1);
    });

    it("calculates rate correctly", () => {
      let session = createReviewSession();
      const cp1 = createReviewCheckpoint("test1.ts", "new_file", ["code"]);
      const cp2 = createReviewCheckpoint("test2.ts", "new_file", ["code"]);

      session = addCheckpointToSession(session, cp1);
      session = addCheckpointToSession(session, cp2);
      session = completeCheckpointInSession(session, cp1.id, "approved");

      expect(getReviewCompletionRate(session)).toBe(0.5);
    });

    it("does not count skipped reviews in completion rate", () => {
      let session = createReviewSession();
      const cp1 = createReviewCheckpoint("test1.ts", "new_file", ["code"]);
      const cp2 = createReviewCheckpoint("test2.ts", "new_file", ["code"]);

      session = addCheckpointToSession(session, cp1);
      session = addCheckpointToSession(session, cp2);
      session = completeCheckpointInSession(session, cp1.id, "skipped");

      expect(getReviewCompletionRate(session)).toBe(0);
    });
  });
});
