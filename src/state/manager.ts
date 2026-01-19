import * as fs from "node:fs";
import * as path from "node:path";
import {
  StateSchema,
  createDefaultState,
  type State,
  type Session,
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
 * Reset session statistics (start a new session)
 */
export function resetSession(projectPath: string): State {
  const state = loadState(projectPath);

  state.session = {
    startedAt: new Date().toISOString(),
    humanLines: 0,
    claudeLines: 0,
    currentTask: null,
  };

  saveState(projectPath, state);
  return state;
}

/**
 * Set the current focused task
 */
export function setCurrentTask(projectPath: string, taskFilename: string | null): State {
  const state = loadState(projectPath);
  state.session.currentTask = taskFilename;
  saveState(projectPath, state);
  return state;
}

/**
 * Get the current focused task filename
 */
export function getCurrentTask(projectPath: string): string | null {
  const state = loadState(projectPath);
  return state.session.currentTask;
}

/**
 * Clear the current focused task
 */
export function clearCurrentTask(projectPath: string): State {
  return setCurrentTask(projectPath, null);
}
