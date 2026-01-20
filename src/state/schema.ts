import { z } from "zod";


/**
 * Calculate the current human work ratio from line counts
 * Returns 1.0 if no work has been done yet (human is at 100% until Claude does something)
 */
export function calculateRatio(humanLines: number, claudeLines: number): number {
  const total = humanLines + claudeLines;
  if (total === 0) {
    return 1.0; // No work yet, human is at 100%
  }
  return humanLines / total;
}

/**
 * Check if the human work ratio meets the target
 */
export function isRatioHealthy(humanLines: number, claudeLines: number, targetRatio: number): boolean {
  return calculateRatio(humanLines, claudeLines) >= targetRatio;
}
