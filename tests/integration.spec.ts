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
        expect(data.meta.last_page).is.a('number');
        expect(data.meta.current_page).equals(1);
        expect(data.meta.per_page).is.a('number');
        expect(data.meta.total).is.a('number');

        expect(dataPage2.meta.current_page).equals(2);
    });

    it('Create, get, patch and archive, restore and re-archive', async () => {
        const client = new DatanestClient();
        const response = await client.post('v1/projects', {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My project',
            project_client: 'My client',
            address_country: 'GB',
        });

        expect(response.status).equals(201);

        const data = await response.json();

        expect(data.project_link).is.a('string');
        expect(data.project.uuid).is.a('string');

        const responseGet = await client.get('v1/projects/' + data.project.uuid);

        expect(responseGet.status).equals(200);

        const dataGet = await responseGet.json();
        expect(data).toEqual(dataGet);

        const responsePatch = await client.patch('v1/projects/' + data.project.uuid, {
            project_name: 'My project 2',
        });

        expect(responsePatch.status).equals(200);
        const dataPatch = await responsePatch.json();
        expect(dataPatch.project.project_number).equals(dataGet.project.project_number);
        expect(dataPatch.project.project_name).equals('My project 2');

        // Only the project_name and updated_at should have changed
        dataGet.project.project_name = 'My project 2';
        dataGet.project.updated_at = dataPatch.project.updated_at;
        expect(dataPatch).toEqual(dataGet);

        const responseDelete = await client.delete('v1/projects/' + data.project.uuid + "/archive");
        expect(responseDelete.status).equals(200);

        const responseRestore = await client.post('v1/projects/' + data.project.uuid + "/restore");
        expect(responseRestore.status).equals(200);

        const responseDelete2 = await client.delete('v1/projects/' + data.project.uuid + "/archive");
        expect(responseDelete2.status).equals(200);
    });

} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}