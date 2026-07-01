import { afterAll, setDefaultTimeout } from 'bun:test';
import DatanestClient from '../src';
import { projectPurger } from './project-cleanup';

setDefaultTimeout(30000);
DatanestClient.disableRateLimit();
process.env.DATANEST_LOG_ERRORS = '0';

afterAll(async () => {
    await projectPurger.cleanup();
}, { timeout: 90000 });
