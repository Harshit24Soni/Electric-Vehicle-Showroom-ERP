import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
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
        storageState: { cookies: [], origins: [] },
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
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../backend && .\\venv\\Scripts\\python -m uvicorn app.main:app --port 8000',
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        ENV: 'test'
      }
    }
  ],
});
