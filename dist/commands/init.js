import { isStpInitialized } from "../config/loader.js";
import { getCurrentMode } from "../config/schema.js";
import { initializeStp, isFullyInitialized } from "../init.js";
/**
 * Initialize STP in a project
 * @param projectPath - Path to the project
 * @param modeNumber - Optional mode number (1-6). Defaults to 4 (50-50).
 */
export async function init(projectPath, modeNumber) {
    const alreadyInitialized = isStpInitialized(projectPath);
    if (alreadyInitialized && isFullyInitialized(projectPath)) {
        const config = await initializeStp(projectPath, undefined);
        const mode = getCurrentMode(config);
        return {
            success: true,
            alreadyInitialized: true,
            mode,
            message: "STP is already initialized in this project.",
        };
    }
    const config = await initializeStp(projectPath, undefined);
    if (modeNumber && modeNumber >= 1 && modeNumber <= 6) {
        config.mode = modeNumber;
    }
    const mode = getCurrentMode(config);
    return {
        success: true,
        alreadyInitialized: false,
        mode,
        message: `STP initialized with mode ${mode.number}: ${mode.name} (${mode.description}).`,
    };
}
/**
 * Format init result for display
 */
export function formatInitResult(result) {
    const lines = [result.message];
    if (!result.alreadyInitialized) {
        lines.push("");
        lines.push("Created:");
        lines.push("- `.stp/config.json` - Project configuration");
        lines.push("");
        lines.push("Run `node dist/cli.js stats` to see your current status.");
    }
    return lines.join("\n");
}
//# sourceMappingURL=init.js.map