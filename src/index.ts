// Configuration
export { loadConfig, saveConfig, isDojoInitialized, getDojoDir } from "./config/loader.js";
export {
  ConfigSchema,
  PresetSchema,
  DifficultySchema,
  PRESET_RATIOS,
  DEFAULT_CONFIG,
  getEffectiveRatio,
  type Config,
  type Preset,
  type Difficulty,
} from "./config/schema.js";

// State
export { loadState, saveState, addHumanLines, addClaudeLines, updateSkill, resetSession } from "./state/manager.js";
export {
  StateSchema,
  SessionSchema,
  SkillSchema,
  QuizEntrySchema,
  createDefaultState,
  calculateRatio,
  isRatioHealthy,
  type State,
  type Session,
  type Skill,
  type QuizEntry,
} from "./state/schema.js";

// Tasks - Directories
export {
  TASK_DIRS,
  getTasksDir,
  getTaskSubdir,
  initializeTaskDirs,
  areTaskDirsInitialized,
  listTaskFiles,
  moveTask,
  getTaskCounts,
  type TaskDirectory,
} from "./tasks/directories.js";

// Tasks - Parser
export {
  parseTaskFile,
  parseTasksInDirectory,
  parseActiveTasks,
  parseAllTasks,
  findTask,
  TaskCategorySchema,
  TaskDifficultySchema,
  type Task,
  type TaskMetadata,
  type TaskCategory,
  type TaskDifficulty,
  type AcceptanceCriterion,
  type CompletionNotes,
} from "./tasks/parser.js";

// Tasks - Generator
export {
  createTask,
  createTasks,
  generateTaskContent,
  generateFilename,
  getNextTaskId,
  TASK_TEMPLATES,
  type CreateTaskInput,
} from "./tasks/generator.js";

// Tasks - Assignment
export {
  canClaudeTakeWork,
  suggestAssignee,
  assignTask,
  autoAssignTask,
  getHumanTasks,
  getClaudeTasks,
  getUnassignedTasks,
  pickTaskForHuman,
  reassignTask,
  formatAssignmentResult,
  type CanClaudeTakeWorkResult,
} from "./tasks/assignment.js";

// Tasks - Completion
export {
  completeTask,
  reopenTask,
  getCompletedTasks,
  getCompletionStats,
  formatCompletionResult,
  type CompleteTaskInput,
  type CompleteTaskResult,
} from "./tasks/completion.js";

// Initialization
export { initializeDojo, isFullyInitialized, ensureInitialized } from "./init.js";

// Commands
export { getStats, formatStats, type StatsResult } from "./commands/stats.js";
export { init, formatInitResult, type InitResult } from "./commands/init.js";
export {
  listTasks,
  formatTaskList,
  type TaskInfo,
} from "./commands/task.js";

// Hooks
export { generateSystemPrompt, generateStatusLine } from "./hooks/system-prompt.js";
export {
  preResponseHook,
  type PreResponseHookInput,
  type PreResponseHookOutput,
} from "./hooks/pre-response.js";
export {
  postResponseHook,
  type PostResponseHookInput,
  type PostResponseHookOutput,
  type ToolUse,
} from "./hooks/post-response.js";
