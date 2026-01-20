import { z } from "zod";

/**
 * Mode definition
 */
export interface Mode {
  number: number;
  name: string;
  humanRatio: number;
  description: string;
}

/**
 * Available modes for work distribution
 */
export const MODES: Mode[] = [
  { number: 1, name: "Yolo", humanRatio: 0, description: "100% AI coding" },
  { number: 2, name: "Padawan", humanRatio: 0.1, description: "90% AI / 10% human" },
  { number: 3, name: "Clever monkey", humanRatio: 0.25, description: "75% AI / 25% human" },
  { number: 4, name: "50-50", humanRatio: 0.5, description: "50% AI / 50% human" },
  { number: 5, name: "Fast fingers", humanRatio: 0.75, description: "25% AI / 75% human" },
  { number: 6, name: "Switching to guns", humanRatio: 1, description: "100% human coding" },
];

/**
 * Get mode by number
 */
export function getModeByNumber(num: number): Mode | undefined {
  return MODES.find((m) => m.number === num);
}

/**
 * Get mode by name (case-insensitive)
 */
export function getModeByName(name: string): Mode | undefined {
  return MODES.find((m) => m.name.toLowerCase() === name.toLowerCase());
}

/**
 * Available presets (legacy, kept for backwards compatibility)
 */
export const PresetSchema = z.enum(["light", "balanced", "intensive", "training"]);
export type Preset = z.infer<typeof PresetSchema>;

/**
 * Preset configurations mapping preset names to human work ratios (legacy)
 */
export const PRESET_RATIOS: Record<Preset, number> = {
  light: 0.1,      // 10% human work
  balanced: 0.25,  // 25% human work (default)
  intensive: 0.5,  // 50% human work
  training: 0.75,  // 75% human work
};

/**
 * Difficulty levels for tasks and quizzes
 */
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

/**
 * Main configuration schema for .dojo/config.json
 */
export const ConfigSchema = z.object({
  // Whether Dojo is enabled for this project
  enabled: z.boolean().default(true),

  // Mode number (1-6)
  mode: z.number().int().min(1).max(6).default(4),

  // Legacy: Preset name (kept for backwards compatibility)
  preset: PresetSchema.optional(),

  // Legacy: Custom human work ratio (kept for backwards compatibility)
  humanWorkRatio: z.number().min(0).max(1).optional(),

  // Default difficulty for generated tasks
  difficulty: DifficultySchema.default("medium"),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  mode: 4, // 50-50
  difficulty: "medium",
};

/**
 * Get the current mode from config
 */
export function getCurrentMode(config: Config): Mode {
  return getModeByNumber(config.mode) ?? MODES[3]; // Default to 50-50
}

/**
 * Get the effective human work ratio from config
 */
export function getEffectiveRatio(config: Config): number {
  // Legacy support: custom ratio overrides everything
  if (config.humanWorkRatio !== undefined) {
    return config.humanWorkRatio;
  }
  // Use mode
  const mode = getCurrentMode(config);
  return mode.humanRatio;
}
