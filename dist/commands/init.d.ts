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
 */
export declare function init(projectPath: string, preset?: Preset): InitResult;
/**
 * Format init result for display
 */
export declare function formatInitResult(result: InitResult): string;
//# sourceMappingURL=init.d.ts.map