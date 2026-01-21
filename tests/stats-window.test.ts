import { describe, it, expect } from "vitest";
import {
  StatsWindowSchema,
  STATS_WINDOW_LABELS,
  getStatsWindowCutoff,
  type StatsWindow,
} from "../src/config/schema.js";

describe("StatsWindow", () => {
  describe("StatsWindowSchema", () => {
    it("accepts valid values", () => {
      expect(StatsWindowSchema.parse("oneDay")).toBe("oneDay");
      expect(StatsWindowSchema.parse("oneWeek")).toBe("oneWeek");
      expect(StatsWindowSchema.parse("allTime")).toBe("allTime");
    });

    it("rejects invalid values", () => {
      expect(() => StatsWindowSchema.parse("invalid")).toThrow();
      expect(() => StatsWindowSchema.parse("")).toThrow();
      expect(() => StatsWindowSchema.parse(123)).toThrow();
    });

    it("has all expected options", () => {
      const options = StatsWindowSchema.options;
      expect(options).toContain("oneDay");
      expect(options).toContain("oneWeek");
      expect(options).toContain("allTime");
      expect(options.length).toBe(3);
    });
  });

  describe("STATS_WINDOW_LABELS", () => {
    it("has labels for all options", () => {
      const options: StatsWindow[] = ["oneDay", "oneWeek", "allTime"];
      for (const option of options) {
        expect(STATS_WINDOW_LABELS[option]).toBeDefined();
        expect(typeof STATS_WINDOW_LABELS[option]).toBe("string");
      }
    });

    it("has human-readable labels", () => {
      expect(STATS_WINDOW_LABELS.oneDay).toBe("Last 24 hours");
      expect(STATS_WINDOW_LABELS.oneWeek).toBe("Last 7 days");
      expect(STATS_WINDOW_LABELS.allTime).toBe("All time");
    });
  });

  describe("getStatsWindowCutoff", () => {
    it("returns null for allTime", () => {
      expect(getStatsWindowCutoff("allTime")).toBeNull();
    });

    it("returns a Date for oneDay", () => {
      const cutoff = getStatsWindowCutoff("oneDay");
      expect(cutoff).toBeInstanceOf(Date);

      // Should be approximately 24 hours ago (within 1 second tolerance)
      const now = new Date();
      const expectedMs = now.getTime() - 24 * 60 * 60 * 1000;
      expect(Math.abs(cutoff!.getTime() - expectedMs)).toBeLessThan(1000);
    });

    it("returns a Date for oneWeek", () => {
      const cutoff = getStatsWindowCutoff("oneWeek");
      expect(cutoff).toBeInstanceOf(Date);

      // Should be approximately 7 days ago (within 1 second tolerance)
      const now = new Date();
      const expectedMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(cutoff!.getTime() - expectedMs)).toBeLessThan(1000);
    });

    it("oneDay cutoff is more recent than oneWeek cutoff", () => {
      const oneDayCutoff = getStatsWindowCutoff("oneDay");
      const oneWeekCutoff = getStatsWindowCutoff("oneWeek");

      expect(oneDayCutoff!.getTime()).toBeGreaterThan(oneWeekCutoff!.getTime());
    });
  });
});
