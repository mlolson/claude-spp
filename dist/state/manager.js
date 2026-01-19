import * as fs from "node:fs";
import * as path from "node:path";
import { StateSchema, createDefaultState, } from "./schema.js";
const DOJO_DIR = ".dojo";
const STATE_FILE = "state.json";
/**
 * Get the path to the state file
 */
export function getStatePath(projectPath) {
    return path.join(projectPath, DOJO_DIR, STATE_FILE);
}
/**
 * Load state from file
 * Returns new default state if file doesn't exist
 */
export function loadState(projectPath) {
    const statePath = getStatePath(projectPath);
    if (!fs.existsSync(statePath)) {
        return createDefaultState();
    }
    try {
        const raw = fs.readFileSync(statePath, "utf-8");
        const json = JSON.parse(raw);
        return StateSchema.parse(json);
    }
    catch (error) {
        // If state is corrupted, start fresh
        console.warn(`Warning: Could not load state from ${statePath}, starting fresh`);
        return createDefaultState();
    }
}
/**
 * Save state to file
 */
export function saveState(projectPath, state) {
    const dojoDir = path.join(projectPath, DOJO_DIR);
    const statePath = getStatePath(projectPath);
    // Ensure .dojo directory exists
    if (!fs.existsSync(dojoDir)) {
        fs.mkdirSync(dojoDir, { recursive: true });
    }
    // Validate before saving
    const validated = StateSchema.parse(state);
    fs.writeFileSync(statePath, JSON.stringify(validated, null, 2) + "\n", "utf-8");
}
/**
 * Update session statistics
 */
export function updateSession(projectPath, updates) {
    const state = loadState(projectPath);
    state.session = {
        ...state.session,
        ...updates,
    };
    saveState(projectPath, state);
    return state;
}
/**
 * Add lines to human count
 */
export function addHumanLines(projectPath, lines) {
    const state = loadState(projectPath);
    state.session.humanLines += lines;
    saveState(projectPath, state);
    return state;
}
/**
 * Add lines to Claude count
 */
export function addClaudeLines(projectPath, lines) {
    const state = loadState(projectPath);
    state.session.claudeLines += lines;
    saveState(projectPath, state);
    return state;
}
/**
 * Update a skill score
 */
export function updateSkill(projectPath, skillName, score) {
    const state = loadState(projectPath);
    state.skills[skillName] = {
        score: Math.max(0, Math.min(1, score)),
        lastPracticed: new Date().toISOString(),
    };
    saveState(projectPath, state);
    return state;
}
/**
 * Reset session statistics (start a new session)
 */
export function resetSession(projectPath) {
    const state = loadState(projectPath);
    state.session = {
        startedAt: new Date().toISOString(),
        humanLines: 0,
        claudeLines: 0,
    };
    saveState(projectPath, state);
    return state;
}
/**
 * Record an asked question
 */
export function recordQuestion(projectPath, question) {
    const state = loadState(projectPath);
    const record = {
        ...question,
        askedAt: new Date().toISOString(),
    };
    state.askedQuestions.push(record);
    // Update teaching stats
    state.teachingStats.teachingMoments += question.wasTeachingMoment ? 1 : 0;
    saveState(projectPath, state);
    return state;
}
/**
 * Get asked questions history
 */
export function getAskedQuestions(projectPath) {
    const state = loadState(projectPath);
    return state.askedQuestions;
}
/**
 * Record a code review
 */
export function recordReview(projectPath, review) {
    const state = loadState(projectPath);
    const record = {
        ...review,
        createdAt: new Date().toISOString(),
    };
    state.reviewRecords.push(record);
    // Update teaching stats
    if (review.status === "approved" || review.status === "rejected") {
        state.teachingStats.reviewsCompleted += 1;
    }
    else if (review.status === "skipped") {
        state.teachingStats.reviewsSkipped += 1;
    }
    saveState(projectPath, state);
    return state;
}
/**
 * Get review records
 */
export function getReviewRecords(projectPath) {
    const state = loadState(projectPath);
    return state.reviewRecords;
}
/**
 * Increment teaching stat
 */
export function incrementTeachingStat(projectPath, stat) {
    const state = loadState(projectPath);
    state.teachingStats[stat] += 1;
    saveState(projectPath, state);
    return state;
}
/**
 * Get teaching stats
 */
export function getTeachingStats(projectPath) {
    const state = loadState(projectPath);
    return state.teachingStats;
}
/**
 * Reset teaching stats (for new session)
 */
export function resetTeachingStats(projectPath) {
    const state = loadState(projectPath);
    state.teachingStats = {
        teachingMoments: 0,
        socraticResponses: 0,
        directAnswers: 0,
        reviewsCompleted: 0,
        reviewsSkipped: 0,
    };
    saveState(projectPath, state);
    return state;
}
//# sourceMappingURL=manager.js.map