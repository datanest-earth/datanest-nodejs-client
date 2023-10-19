import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    it('Ordered query params', async () => {
        const client = new DatanestClient();
        const responses = await Promise.all([client.get('v1/projects', { order: 'test', page: '1' }), client.get('v1/projects', { page: '1', order: 'test' })]);

        expect(responses[0].status).equals(200);
        expect(responses[1].status).equals(200);
    });

    it('GET v1/projects - List projects', async () => {
        const client = new DatanestClient();
        const responses = await Promise.all([client.get('v1/projects'), client.get('v1/projects?page=2')]);

        expect(responses[0].status).equals(200);

        const [data, dataPage2] = await Promise.all([responses[0].json(), await responses[1].json()]);

        expect(data.data).is.an('array');
        expect(data.last_page).is.a('number');
        expect(data.current_page).equals(1);
        expect(data.total).is.a('number');

        expect(dataPage2.current_page).equals(2);
    });

    it('POST v1/projects - Create project', async () => {
        const client = new DatanestClient();
        const response = await client.post('v1/projects', {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My project',
            project_client: 'My client',
            address_country: 'GB',
            address_state: null,
        });

        expect(response.status).equals(201);
    });

} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}