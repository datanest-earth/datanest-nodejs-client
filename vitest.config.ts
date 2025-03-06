import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        maxWorkers: 2, // based on 60, requests per minute, check the default client rate limit
        minWorkers: 2,
        hookTimeout: 30_000,
        testTimeout: 90_000,
    },
})