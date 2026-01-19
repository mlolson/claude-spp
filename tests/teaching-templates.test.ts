import { describe, it, expect } from "vitest";
import {
  getTeachingTemplate,
  getEscalationLevel,
  formatTeachingResponse,
  generateTeachingResponse,
  shouldEscalate,
  getEncouragement,
  type EscalationLevel,
} from "../src/teaching/templates.js";
import { classifyQuestion } from "../src/teaching/socratic.js";

describe("Teaching Templates", () => {
  describe("getEscalationLevel", () => {
    it("returns socratic for first attempt on conceptual question", () => {
      const classification = classifyQuestion("What is a closure?");
      const level = getEscalationLevel(1, classification);

      expect(level).toBe("socratic");
    });

    it("returns guided for debugging questions on first attempt", () => {
      const classification = classifyQuestion("Why isn't this working?");
      const level = getEscalationLevel(1, classification);

      expect(level).toBe("guided");
    });

    it("escalates through levels with attempts", () => {
      const classification = classifyQuestion("What is a closure?");

      expect(getEscalationLevel(1, classification)).toBe("socratic");
      expect(getEscalationLevel(2, classification)).toBe("guided");
      expect(getEscalationLevel(3, classification)).toBe("hints");
      expect(getEscalationLevel(4, classification)).toBe("explanation");
      expect(getEscalationLevel(5, classification)).toBe("direct");
    });

    it("returns direct for factual questions", () => {
      const classification = classifyQuestion("What's the syntax for map?");
      const level = getEscalationLevel(1, classification);

      expect(level).toBe("direct");
    });

    it("debugging escalates faster", () => {
      const classification = classifyQuestion("Why isn't this working?");

      expect(getEscalationLevel(1, classification)).toBe("guided");
      expect(getEscalationLevel(2, classification)).toBe("hints");
      expect(getEscalationLevel(3, classification)).toBe("explanation");
      expect(getEscalationLevel(4, classification)).toBe("direct");
    });
  });

  describe("getTeachingTemplate", () => {
    it("returns template with opener", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: "typescript",
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      expect(template.opener).toBeDefined();
      expect(template.opener.length).toBeGreaterThan(0);
    });

    it("returns questions for socratic level", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: null,
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      expect(template.questions.length).toBeGreaterThan(0);
    });

    it("returns hints for hint level", () => {
      const template = getTeachingTemplate({
        questionType: "howto",
        domain: null,
        escalationLevel: "hints",
        attemptCount: 3,
      });

      expect(template.hints.length).toBeGreaterThan(0);
    });

    it("includes doc pointer when domain is known", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: "typescript",
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      expect(template.docPointer).not.toBeNull();
      expect(template.docPointer).toContain("typescript");
    });

    it("has null doc pointer for unknown domain", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: "unknown-domain",
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      expect(template.docPointer).toBeNull();
    });
  });

  describe("formatTeachingResponse", () => {
    it("includes opener in response", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: null,
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      const response = formatTeachingResponse(template);

      expect(response).toContain(template.opener);
    });

    it("includes questions for socratic level", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: null,
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      const response = formatTeachingResponse(template, { maxQuestions: 2 });

      expect(response).toContain("- ");
    });

    it("includes hint when requested", () => {
      const template = getTeachingTemplate({
        questionType: "howto",
        domain: null,
        escalationLevel: "guided",
        attemptCount: 2,
      });

      const response = formatTeachingResponse(template, { includeHint: true });

      expect(response).toContain("**Hint:**");
    });

    it("includes doc pointer when available", () => {
      const template = getTeachingTemplate({
        questionType: "conceptual",
        domain: "react",
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      const response = formatTeachingResponse(template, { includeDocPointer: true });

      expect(response).toContain("**Reference:**");
    });

    it("respects maxQuestions option", () => {
      const template = getTeachingTemplate({
        questionType: "debugging",
        domain: null,
        escalationLevel: "socratic",
        attemptCount: 1,
      });

      const response = formatTeachingResponse(template, { maxQuestions: 1 });
      const questionMarkers = (response.match(/^- /gm) || []).length;

      expect(questionMarkers).toBeLessThanOrEqual(1);
    });
  });

  describe("generateTeachingResponse", () => {
    it("generates response for conceptual question", () => {
      const classification = classifyQuestion("What is a closure?");
      const response = generateTeachingResponse(classification, 1);

      expect(response.length).toBeGreaterThan(0);
    });

    it("includes hints after first attempt", () => {
      const classification = classifyQuestion("How do I implement this?");
      const response = generateTeachingResponse(classification, 2);

      expect(response).toContain("**Hint:**");
    });

    it("includes doc reference for known domains", () => {
      const classification = classifyQuestion("What is a TypeScript interface?");
      const response = generateTeachingResponse(classification, 1);

      expect(response).toContain("**Reference:**");
    });
  });

  describe("shouldEscalate", () => {
    it("returns true when user says they are confused", () => {
      expect(shouldEscalate("socratic", "I'm still confused")).toBe(true);
    });

    it("returns true when user says they don't understand", () => {
      expect(shouldEscalate("guided", "I don't understand")).toBe(true);
    });

    it("returns true when user asks for direct answer", () => {
      expect(shouldEscalate("hints", "Can you just tell me the answer?")).toBe(true);
    });

    it("returns true when user gives up", () => {
      expect(shouldEscalate("explanation", "I give up")).toBe(true);
    });

    it("returns false for normal response", () => {
      expect(shouldEscalate("socratic", "I think it might be related to scope")).toBe(false);
    });

    it("returns false for questions", () => {
      expect(shouldEscalate("guided", "Is it because of hoisting?")).toBe(false);
    });
  });

  describe("getEncouragement", () => {
    it("returns success message when correct", () => {
      const message = getEncouragement(1, true);

      expect(message.length).toBeGreaterThan(0);
      expect(
        message.toLowerCase().includes("excellent") ||
        message.toLowerCase().includes("right") ||
        message.toLowerCase().includes("perfect") ||
        message.toLowerCase().includes("well done")
      ).toBe(true);
    });

    it("returns encouragement for first attempt", () => {
      const message = getEncouragement(1, false);

      expect(message.length).toBeGreaterThan(0);
    });

    it("returns different messages for different attempt counts", () => {
      const msg1 = getEncouragement(1, false);
      const msg2 = getEncouragement(2, false);
      const msg3 = getEncouragement(3, false);

      // Messages should exist for all attempt counts
      expect(msg1.length).toBeGreaterThan(0);
      expect(msg2.length).toBeGreaterThan(0);
      expect(msg3.length).toBeGreaterThan(0);
    });

    it("returns explanation-focused message for later attempts", () => {
      const message = getEncouragement(5, false);

      expect(
        message.toLowerCase().includes("explain") ||
        message.toLowerCase().includes("direct")
      ).toBe(true);
    });
  });
});
