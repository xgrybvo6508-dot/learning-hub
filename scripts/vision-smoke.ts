/**
 * Manual smoke helper for mindmap vision (optional).
 * Usage: npx tsx scripts/vision-smoke.ts
 *
 * Reads settings from env `LH_lh:settings` JSON if set; otherwise reports needs key.
 * With a key, reminds you to test in the app with `/workspace/learning-system/map.jpg`.
 */
import { existsSync } from 'node:fs';
import { isAllowedBaseUrl, loadSettings, type SettingsStorage } from '../src/agent/settings';

function visionAgentReady(settings: ReturnType<typeof loadSettings>): boolean {
  return (
    isAllowedBaseUrl(settings.baseUrl) &&
    settings.apiKey.trim().length > 0 &&
    settings.visionModel.trim().length > 0
  );
}

const MAP_PATH = '/workspace/learning-system/map.jpg';

const storage: SettingsStorage = {
  getItem: (key) => process.env[`LH_${key}`] ?? null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function main(): void {
  const settings = loadSettings(storage);
  if (!visionAgentReady(settings)) {
    console.log('needs key');
    process.exit(0);
  }
  const mapNote = existsSync(MAP_PATH)
    ? `Sample map: ${MAP_PATH}`
    : 'Sample map.jpg not found on this box.';
  console.log(
    `Vision settings OK (model: ${settings.visionModel}). ${mapNote} Use #/mindmap in the app for a live call.`,
  );
}

main();
