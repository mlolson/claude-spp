import { type Preset } from "../config/schema.js";
export interface InitResult {
    success: boolean;
    alreadyInitialized: boolean;
    preset: Preset;
    ratio: number;
    message: string;
}
/**
 * Initialize Dojo in a project
 * @param projectPath - Path to the project
 * @param preset - Optional preset. If not provided, user will be prompted interactively.
 */
export declare function init(projectPath: string, preset?: Preset): Promise<InitResult>;
/**
 * Format init result for display
 */
export declare function formatInitResult(result: InitResult): string;
//# sourceMappingURL=init.d.ts.map