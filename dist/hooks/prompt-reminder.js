import { getStats } from "../commands/stats.js";
export async function runPromptReminderHook() {
    const cwd = process.cwd();
    const stats = getStats(cwd);
    if (!(stats.enabled && stats.initialized)) {
        return;
    }
    if (!stats.ratioHealthy) {
        console.log(`DOJO REMINDER: Human work ratio is ${stats.currentRatio} (target: ${stats.targetRatio}).
             Before writing code, ask if the human wants to try it themselves.`);
    }
}
//# sourceMappingURL=prompt-reminder.js.map