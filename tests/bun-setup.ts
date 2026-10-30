import { afterAll, setDefaultTimeout } from 'bun:test';
import DatanestClient from '../src';
import { projectPurger } from './project-cleanup';

// CI runs Bun 1.4.2. A preload setDefaultTimeout applies to the first test file only, so each spec also calls setDefaultTimeout.
setDefaultTimeout(30000);
DatanestClient.disableRateLimit();
process.env.DATANEST_LOG_ERRORS = '0';

afterAll(async () => {
    await projectPurger.cleanup();
}, { timeout: 90000 });
