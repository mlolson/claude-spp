import { z } from "zod";

/**
 * Available presets for work distribution ratio
 */
export const PresetSchema = z.enum(["light", "balanced", "intensive", "training"]);
export type Preset = z.infer<typeof PresetSchema>;

/**
 * Preset configurations mapping preset names to human work ratios
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

  // Preset name (light, balanced, intensive, training)
  preset: PresetSchema.default("balanced"),

  // Custom human work ratio (0.0 - 1.0), overrides preset if set
  humanWorkRatio: z.number().min(0.1).max(0.9).optional(),

  // Default difficulty for generated tasks
  difficulty: DifficultySchema.default("medium"),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  preset: "balanced",
  difficulty: "medium",
};

/**
 * Get the effective human work ratio from config
 * Uses custom ratio if set, otherwise uses preset ratio
 */
export function getEffectiveRatio(config: Config): number {
  if (config.humanWorkRatio !== undefined) {
    return config.humanWorkRatio;
  }
  return PRESET_RATIOS[config.preset];
}
