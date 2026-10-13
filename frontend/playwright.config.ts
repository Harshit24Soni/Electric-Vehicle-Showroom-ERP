import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const backendURL = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:8000/health';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: '.playwright/user.json',
    launchOptions: {
      slowMo: process.env.PW_SLOW_MO ? parseInt(process.env.PW_SLOW_MO, 10) : 0,
    },
  },
  globalSetup: './e2e/global.setup.ts',
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        storageState: undefined,
      },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-tablet',
      use: { 
        ...devices['iPad (gen 7)'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'full-stack',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'python -m uvicorn app.main:app --port 8000',
      cwd: '../backend',
      url: backendURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ENVIRONMENT: 'test',
      },
    },
  ],
});

