import { type Mode } from "../config/schema.js";
export interface InitResult {
    success: boolean;
    alreadyInitialized: boolean;
    mode: Mode;
    message: string;
}
/**
 * Initialize Dojo in a project
 * @param projectPath - Path to the project
 * @param modeNumber - Optional mode number (1-6). Defaults to 4 (50-50).
 */
export declare function init(projectPath: string, modeNumber?: number): Promise<InitResult>;
/**
 * Format init result for display
 */
export declare function formatInitResult(result: InitResult): string;
//# sourceMappingURL=init.d.ts.map