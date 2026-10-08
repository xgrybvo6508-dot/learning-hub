import { defineConfig, devices } from '@playwright/test';

const chromePath = '/usr/bin/google-chrome';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/learning-hub/',
    trace: 'retain-on-failure',
    channel: 'chrome',
    launchOptions: {
      executablePath: chromePath,
    },
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/learning-hub/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
