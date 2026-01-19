import * as fs from "node:fs";
import * as path from "node:path";
import {
  StateSchema,
  createDefaultState,
  type State,
  type Session,
  type AskedQuestion,
  type ReviewRecord,
  type TeachingStats,
} from "./schema.js";

const DOJO_DIR = ".dojo";
const STATE_FILE = "state.json";

/**
 * Get the path to the state file
 */
export function getStatePath(projectPath: string): string {
  return path.join(projectPath, DOJO_DIR, STATE_FILE);
}

/**
 * Load state from file
 * Returns new default state if file doesn't exist
 */
export function loadState(projectPath: string): State {
  const statePath = getStatePath(projectPath);

  if (!fs.existsSync(statePath)) {
    return createDefaultState();
  }

  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    const json = JSON.parse(raw);
    return StateSchema.parse(json);
  } catch (error) {
    // If state is corrupted, start fresh
    console.warn(`Warning: Could not load state from ${statePath}, starting fresh`);
    return createDefaultState();
  }
}

/**
 * Save state to file
 */
export function saveState(projectPath: string, state: State): void {
  const dojoDir = path.join(projectPath, DOJO_DIR);
  const statePath = getStatePath(projectPath);

  // Ensure .dojo directory exists
  if (!fs.existsSync(dojoDir)) {
    fs.mkdirSync(dojoDir, { recursive: true });
  }

  // Validate before saving
  const validated = StateSchema.parse(state);

  fs.writeFileSync(
    statePath,
    JSON.stringify(validated, null, 2) + "\n",
    "utf-8"
  );
}

/**
 * Update session statistics
 */
export function updateSession(
  projectPath: string,
  updates: Partial<Session>
): State {
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
export function addHumanLines(projectPath: string, lines: number): State {
  const state = loadState(projectPath);
  state.session.humanLines += lines;
  saveState(projectPath, state);
  return state;
}

/**
 * Add lines to Claude count
 */
export function addClaudeLines(projectPath: string, lines: number): State {
  const state = loadState(projectPath);
  state.session.claudeLines += lines;
  saveState(projectPath, state);
  return state;
}

/**
 * Update a skill score
 */
export function updateSkill(
  projectPath: string,
  skillName: string,
  score: number
): State {
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
export function resetSession(projectPath: string): State {
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
export function recordQuestion(
  projectPath: string,
  question: Omit<AskedQuestion, "askedAt">
): State {
  const state = loadState(projectPath);

  const record: AskedQuestion = {
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
export function getAskedQuestions(projectPath: string): AskedQuestion[] {
  const state = loadState(projectPath);
  return state.askedQuestions;
}

/**
 * Record a code review
 */
export function recordReview(
  projectPath: string,
  review: Omit<ReviewRecord, "createdAt">
): State {
  const state = loadState(projectPath);

  const record: ReviewRecord = {
    ...review,
    createdAt: new Date().toISOString(),
  };

  state.reviewRecords.push(record);

  // Update teaching stats
  if (review.status === "approved" || review.status === "rejected") {
    state.teachingStats.reviewsCompleted += 1;
  } else if (review.status === "skipped") {
    state.teachingStats.reviewsSkipped += 1;
  }

  saveState(projectPath, state);
  return state;
}

/**
 * Get review records
 */
export function getReviewRecords(projectPath: string): ReviewRecord[] {
  const state = loadState(projectPath);
  return state.reviewRecords;
}

/**
 * Increment teaching stat
 */
export function incrementTeachingStat(
  projectPath: string,
  stat: keyof TeachingStats
): State {
  const state = loadState(projectPath);
  state.teachingStats[stat] += 1;
  saveState(projectPath, state);
  return state;
}

/**
 * Get teaching stats
 */
export function getTeachingStats(projectPath: string): TeachingStats {
  const state = loadState(projectPath);
  return state.teachingStats;
}

/**
 * Reset teaching stats (for new session)
 */
export function resetTeachingStats(projectPath: string): State {
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
