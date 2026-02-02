import * as fs from "fs";
import * as path from "path";

/**
 * Driver role in pair programming
 */
export type Driver = "claude" | "human";

/**
 * Pair programming session state
 */
export interface PairSession {
  /** Current driver */
  driver: Driver;
  /** Task being worked on */
  task: string;
  /** ISO timestamp when session started */
  startedAt: string;
  /** Number of contributions by Claude */
  claudeContributions: number;
  /** Number of contributions by human */
  humanContributions: number;
  /** Number of times drivers have rotated */
  rotationCount: number;
  /** Contributions since last rotation (for prompting) */
  contributionsSinceRotation: number;
}

const SESSION_FILE = "pair-session.json";
const SPP_DIR = ".claude-spp";

/**
 * Get path to pair session file
 */
function getSessionPath(projectPath: string): string {
  return path.join(projectPath, SPP_DIR, SESSION_FILE);
}

/**
 * Check if a pair session is active
 */
export function hasPairSession(projectPath: string): boolean {
  const sessionPath = getSessionPath(projectPath);
  return fs.existsSync(sessionPath);
}

/**
 * Load the current pair session
 */
export function loadPairSession(projectPath: string): PairSession | null {
  const sessionPath = getSessionPath(projectPath);
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(sessionPath, "utf-8");
    return JSON.parse(content) as PairSession;
  } catch {
    return null;
  }
}

/**
 * Save the pair session
 */
export function savePairSession(projectPath: string, session: PairSession): void {
  const sessionPath = getSessionPath(projectPath);
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
}

/**
 * Start a new pair session
 */
export function startPairSession(
  projectPath: string,
  task: string,
  startingDriver: Driver = "claude"
): PairSession {
  const session: PairSession = {
    driver: startingDriver,
    task,
    startedAt: new Date().toISOString(),
    claudeContributions: 0,
    humanContributions: 0,
    rotationCount: 0,
    contributionsSinceRotation: 0,
  };
  savePairSession(projectPath, session);
  return session;
}

/**
 * End the current pair session
 */
export function endPairSession(projectPath: string): PairSession | null {
  const session = loadPairSession(projectPath);
  if (!session) {
    return null;
  }
  const sessionPath = getSessionPath(projectPath);
  fs.unlinkSync(sessionPath);
  return session;
}

/**
 * Rotate the driver
 */
export function rotateDriver(projectPath: string): PairSession | null {
  const session = loadPairSession(projectPath);
  if (!session) {
    return null;
  }
  session.driver = session.driver === "claude" ? "human" : "claude";
  session.rotationCount++;
  session.contributionsSinceRotation = 0;
  savePairSession(projectPath, session);
  return session;
}

/**
 * Record a contribution and return updated session
 */
export function recordContribution(
  projectPath: string,
  by: Driver
): PairSession | null {
  const session = loadPairSession(projectPath);
  if (!session) {
    return null;
  }
  if (by === "claude") {
    session.claudeContributions++;
  } else {
    session.humanContributions++;
  }
  session.contributionsSinceRotation++;
  savePairSession(projectPath, session);
  return session;
}

/**
 * Check if it's time to suggest a rotation
 * Suggests rotation after 3-5 contributions from current driver
 */
export function shouldSuggestRotation(session: PairSession): boolean {
  return session.contributionsSinceRotation >= 3;
}

/**
 * Get the other driver
 */
export function otherDriver(driver: Driver): Driver {
  return driver === "claude" ? "human" : "claude";
}

/**
 * Format session duration
 */
export function formatDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (diffHours > 0) {
    return `${diffHours}h ${mins}m`;
  }
  return `${diffMins}m`;
}

/**
 * Format session for display
 */
export function formatPairSession(session: PairSession): string {
  const duration = formatDuration(session.startedAt);
  const totalContributions = session.claudeContributions + session.humanContributions;
  
  const driverEmoji = session.driver === "claude" ? "🤖" : "👤";
  const driverLabel = session.driver === "claude" ? "Claude" : "Human";
  
  const lines = [
    "",
    `🤝 Pair Programming Session`,
    ``,
    `   Task: ${session.task}`,
    `   Duration: ${duration}`,
    `   Current driver: ${driverEmoji} ${driverLabel}`,
    ``,
    `   Contributions:`,
    `     👤 Human:  ${session.humanContributions}`,
    `     🤖 Claude: ${session.claudeContributions}`,
    `     Total:    ${totalContributions}`,
    ``,
    `   Rotations: ${session.rotationCount}`,
    ``,
  ];
  
  if (shouldSuggestRotation(session)) {
    lines.push(`   💡 Consider rotating! Run: spp pair rotate`);
    lines.push(``);
  }
  
  return lines.join("\n");
}

/**
 * Format session summary (for when ending session)
 */
export function formatSessionSummary(session: PairSession): string {
  const duration = formatDuration(session.startedAt);
  const total = session.claudeContributions + session.humanContributions;
  const humanPct = total > 0 ? Math.round((session.humanContributions / total) * 100) : 0;
  const claudePct = total > 0 ? Math.round((session.claudeContributions / total) * 100) : 0;
  
  const lines = [
    "",
    `🎉 Pair Programming Session Complete!`,
    ``,
    `   Task: ${session.task}`,
    `   Duration: ${duration}`,
    ``,
    `   Contributions:`,
    `     👤 Human:  ${session.humanContributions} (${humanPct}%)`,
    `     🤖 Claude: ${session.claudeContributions} (${claudePct}%)`,
    ``,
    `   Rotations: ${session.rotationCount}`,
    ``,
    `   Great pairing session! 🙌`,
    ``,
  ];
  
  return lines.join("\n");
}
