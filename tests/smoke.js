import { createRequire } from 'node:module';
import DatanestClient, { projects } from '../dist/index.js';

const baseUrl = 'https://example.datanest.earth/api';

const client = new DatanestClient('smoke-test-key', 'smoke-test-secret');
client.setBaseUrl(baseUrl);

if (typeof client.get !== 'function') {
  throw new Error('DatanestClient is missing expected methods');
}

if (typeof projects.listProjects !== 'function') {
  throw new Error('Named exports are not available from the ESM bundle');
}

const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');
const cjsClient = new cjs.default('smoke-test-key', 'smoke-test-secret');
cjsClient.setBaseUrl(baseUrl);

const cjsClient2 = new cjs.DatanestClient('smoke-test-key', 'smoke-test-secret');
cjsClient2.setBaseUrl(baseUrl);

console.log('smoke test passed');
