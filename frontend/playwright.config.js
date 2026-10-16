var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';
var baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
var backendURL = process.env.PLAYWRIGHT_BACKEND_URL || 'http://localhost:8000/health';
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? '50%' : undefined,
    maxFailures: process.env.CI ? 3 : undefined,
    grepInvert: /@wip/,
    reporter: 'html',
    use: {
        baseURL: baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        storageState: '.playwright/user.json',
        launchOptions: {
            slowMo: process.env.PW_SLOW_MO ? parseInt(process.env.PW_SLOW_MO, 10) : 0,
        },
    },
    globalSetup: './e2e/global.setup.ts',
    projects: __spreadArray([
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
            use: {
                storageState: undefined,
            },
        },
        {
            name: 'chromium-desktop',
            use: __assign({}, devices['Desktop Chrome']),
            dependencies: ['setup'],
        }
    ], (process.env.CI
        ? []
        : [
            {
                name: 'chromium-tablet',
                use: __assign({}, devices['iPad (gen 7)']),
                dependencies: ['setup'],
            },
            {
                name: 'chromium-mobile',
                use: __assign({}, devices['Pixel 5']),
                dependencies: ['setup'],
            },
            {
                name: 'full-stack',
                use: __assign({}, devices['Desktop Chrome']),
                dependencies: ['setup'],
            },
        ]), true),
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
            env: __assign(__assign({}, process.env), { ENVIRONMENT: 'test' }),
        },
    ],
});
