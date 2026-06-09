import { afterAll } from 'bun:test';
import DatanestClient from '../src';
import { projectPurger } from './project-cleanup';

DatanestClient.disableRateLimit();

afterAll(async () => {
    await projectPurger.cleanup();
}, 90000);
