import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { getProjectFile, getProjectFiles } from '../src/files';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    it('GET project files, if there is a file check you can get the project link', async () => {
        const client = new DatanestClient();
        const files = await getProjectFiles(client, 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9');

        expect(files.data).is.an('array');
        if (!files.data.length) {
            console.warn('No files found, skipping test');
            return;
        }
        expect(files.data[0].uuid).is.a('string');
        expect(files.data[0].display_name).is.a('string');
        expect(files.data[0].path).is.a('string');

        const file = await getProjectFile(client, 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9', files.data[0].uuid);
        expect(file.uuid).is.a('string');
        expect(file.temporary_url).is.a('string');

        expect(file.display_name).is.a('string');
        expect(file.path).is.a('string');
        expect(file.size_mb).is.a('number');
        expect(file.version).is.a('number');
        expect(file.is_final).is.a('boolean');
        expect(file.virus_status).is.a('number');
        expect(file.review_status).is.a('number');
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}