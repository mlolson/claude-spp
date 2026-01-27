import { z } from "zod";
/**
 * Cache schema for VCS history line counts
 */
export const VcsHistoryCacheSchema = z.object({
    userEmail: z.string(),
    lastCommit: z.string(),
    humanLines: z.number().int().min(0),
    claudeLines: z.number().int().min(0),
    humanCommits: z.number().int().min(0),
    claudeCommits: z.number().int().min(0),
});
//# sourceMappingURL=types.js.map