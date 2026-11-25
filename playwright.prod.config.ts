import { defineConfig, devices } from '@playwright/test';

/** Production-build e2e — vite preview of dist (BASE_PATH=/). */
const PORT = 43126;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch:
    /(neon-snap-prod|neon-snap-clear-prod|neon-snap-done-prod|prompt-spawn-prod|enter-debounce-prod|enter-skill-prod)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright-prod' }],
  ],
  timeout: 90_000,
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `BASE_PATH=/ npm run build && npx vite preview --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'prod-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
