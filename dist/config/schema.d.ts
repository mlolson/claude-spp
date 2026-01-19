import { z } from "zod";
/**
 * Available presets for work distribution ratio
 */
export declare const PresetSchema: z.ZodEnum<["light", "balanced", "intensive", "training"]>;
export type Preset = z.infer<typeof PresetSchema>;
/**
 * Preset configurations mapping preset names to human work ratios
 */
export declare const PRESET_RATIOS: Record<Preset, number>;
/**
 * Difficulty levels for tasks and quizzes
 */
export declare const DifficultySchema: z.ZodEnum<["easy", "medium", "hard"]>;
export type Difficulty = z.infer<typeof DifficultySchema>;
/**
 * Main configuration schema for .dojo/config.json
 */
export declare const ConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    preset: z.ZodDefault<z.ZodEnum<["light", "balanced", "intensive", "training"]>>;
    humanWorkRatio: z.ZodOptional<z.ZodNumber>;
    difficulty: z.ZodDefault<z.ZodEnum<["easy", "medium", "hard"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    preset: "light" | "balanced" | "intensive" | "training";
    difficulty: "easy" | "medium" | "hard";
    humanWorkRatio?: number | undefined;
}, {
    enabled?: boolean | undefined;
    preset?: "light" | "balanced" | "intensive" | "training" | undefined;
    humanWorkRatio?: number | undefined;
    difficulty?: "easy" | "medium" | "hard" | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Default configuration values
 */
export declare const DEFAULT_CONFIG: Config;
/**
 * Get the effective human work ratio from config
 * Uses custom ratio if set, otherwise uses preset ratio
 */
export declare function getEffectiveRatio(config: Config): number;
//# sourceMappingURL=schema.d.ts.map