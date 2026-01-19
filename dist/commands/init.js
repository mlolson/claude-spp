import { isDojoInitialized } from "../config/loader.js";
import { PRESET_RATIOS } from "../config/schema.js";
import { initializeDojo, isFullyInitialized } from "../init.js";
/**
 * Initialize Dojo in a project
 * @param projectPath - Path to the project
 * @param preset - Optional preset. If not provided, user will be prompted interactively.
 */
export async function init(projectPath, preset) {
    const alreadyInitialized = isDojoInitialized(projectPath);
    if (alreadyInitialized && isFullyInitialized(projectPath)) {
        return {
            success: true,
            alreadyInitialized: true,
            preset: preset ?? "balanced",
            ratio: PRESET_RATIOS[preset ?? "balanced"],
            message: "Dojo is already initialized in this project.",
        };
    }
    const config = await initializeDojo(projectPath, preset);
    return {
        success: true,
        alreadyInitialized: false,
        preset: config.preset,
        ratio: PRESET_RATIOS[config.preset],
        message: `Dojo initialized with "${config.preset}" preset (${(PRESET_RATIOS[config.preset] * 100).toFixed(0)}% human work target).`,
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
        lines.push("- `.dojo/config.json` - Project configuration");
        lines.push("- `.dojo/state.json` - Session state (git-ignored)");
        lines.push("- `.dojo/tasks/` - Task directories");
        lines.push("");
        lines.push("Run `node dist/cli.js stats` to see your current status.");
    }
    return lines.join("\n");
}
//# sourceMappingURL=init.js.map