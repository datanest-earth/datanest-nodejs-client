import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    it('GET v1/projects - List projects', async () => {
        const client = new DatanestClient();
        const response = await client.get('v1/projects');

        expect(response.status).equals(200);

        const data = await response.json();

        expect(data.data).is.an('array');
        expect(data.last_page).is.a('number');
        expect(data.current_page).equals(1);
        expect(data.total).is.a('number');

        const responsePage2 = await client.get('v1/projects?page=2');
        const dataPage2 = await responsePage2.json();
        expect(dataPage2.current_page).equals(2);
    });

} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}