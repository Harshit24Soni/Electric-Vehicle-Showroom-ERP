/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var rootDir = fileURLToPath(new URL('..', import.meta.url));
    var env = loadEnv(mode, rootDir, '');
    var apiBaseUrl = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL;
    return {
        envDir: rootDir,
        plugins: [react()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            host: '0.0.0.0',
            port: 3000,
            proxy: apiBaseUrl
                ? {
                    '/api': {
                        target: apiBaseUrl,
                        changeOrigin: true,
                        rewrite: function (path) { return path.replace(/^\/api/, ''); },
                    },
                }
                : undefined,
        },
        test: {
            environment: 'jsdom',
            setupFiles: ['./src/setupTests.ts'],
            globals: true,
            exclude: ['node_modules', 'e2e'],
        },
    };
});
