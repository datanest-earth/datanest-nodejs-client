import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        hookTimeout: 30_000,
        testTimeout: 90_000,
        setupFiles: ['./tests/vitest-before-all.ts'],
    },
})