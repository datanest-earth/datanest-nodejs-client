import { defineConfig } from 'vitest/config'

const isProduction = process.env.PROD === '1' || process.env.PROD === 'true';

export default defineConfig({
    test: {
        hookTimeout: 30_000,
        testTimeout: 90_000,
        setupFiles: ['./tests/vitest-before-all.ts'],
        ...(isProduction ? {
            maxConcurrency: 1,
            maxWorkers: 1,
            minWorkers: 1,
        } : {}),
    },
})