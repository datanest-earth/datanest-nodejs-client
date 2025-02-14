import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { getCompanyAccountDetails } from '../src/account';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    it('Get Company Account Details', async () => {
        const client = new DatanestClient();
        const details = await getCompanyAccountDetails(client);
        expect(details.company).is.an('object');
        expect(details.company.ref).is.a('string');
        expect(details.company.company_name).is.a('string');
        expect(details.company).has.property('team_role_defaults');
        expect(details.company).has.property('project_additional_settings');
    });

} else {
    it('Skipping account integration tests', () => { });
    console.warn('[WARN] Skipping account integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}