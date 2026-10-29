import { afterAll, setDefaultTimeout } from 'bun:test';
import DatanestClient from '../src';
import { projectPurger } from './project-cleanup';

// Bun 1.4 keeps this for the first test file only. Each spec also calls setDefaultTimeout.
setDefaultTimeout(30000);
DatanestClient.disableRateLimit();
process.env.DATANEST_LOG_ERRORS = '0';

afterAll(async () => {
    await projectPurger.cleanup();
}, { timeout: 90000 });
