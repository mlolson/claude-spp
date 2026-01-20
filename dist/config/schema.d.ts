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
export declare const MODES: Mode[];
/**
 * Get mode by number
 */
export declare function getModeByNumber(num: number): Mode | undefined;
/**
 * Get mode by name (case-insensitive)
 */
export declare function getModeByName(name: string): Mode | undefined;
/**
 * Available presets (legacy, kept for backwards compatibility)
 */
export declare const PresetSchema: z.ZodEnum<["light", "balanced", "intensive", "training"]>;
export type Preset = z.infer<typeof PresetSchema>;
/**
 * Preset configurations mapping preset names to human work ratios (legacy)
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
    mode: z.ZodDefault<z.ZodNumber>;
    preset: z.ZodOptional<z.ZodEnum<["light", "balanced", "intensive", "training"]>>;
    humanWorkRatio: z.ZodOptional<z.ZodNumber>;
    difficulty: z.ZodDefault<z.ZodEnum<["easy", "medium", "hard"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    mode: number;
    difficulty: "easy" | "medium" | "hard";
    preset?: "light" | "balanced" | "intensive" | "training" | undefined;
    humanWorkRatio?: number | undefined;
}, {
    enabled?: boolean | undefined;
    mode?: number | undefined;
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
 * Get the current mode from config
 */
export declare function getCurrentMode(config: Config): Mode;
/**
 * Get the effective human work ratio from config
 */
export declare function getEffectiveRatio(config: Config): number;
//# sourceMappingURL=schema.d.ts.map