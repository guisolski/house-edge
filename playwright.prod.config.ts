import { defineConfig, devices } from '@playwright/test';

/** Production-build e2e — vite preview of dist (BASE_PATH=/). */
const PORT = 43129;
const BASE = `http://127.0.0.1:${PORT}`;

/** Free the preview port if a prior run left it bound (CI cancel / retry). */
const freePort = `sh -c 'for p in $(lsof -t -iTCP:${PORT} -sTCP:LISTEN 2>/dev/null); do kill -9 "$p"; done; true'`;
const preview = `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`;
const buildIfNeeded = `test -d dist || BASE_PATH=/ npm run build`;

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
    // CI already ran `npm run build`; only build locally when dist is missing.
    command: `${freePort}; ${buildIfNeeded}; ${preview}`,
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
