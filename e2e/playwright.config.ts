/// <reference types="node" />
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from '@playwright/test';

// Load e2e/.env so E2E_BACKEND_URL and future vars are set without typing them each time.
loadEnv({ path: path.join(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev',
    cwd: '../frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  outputDir: './test-results',
});
