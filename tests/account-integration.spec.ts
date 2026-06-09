import { it, expect } from 'bun:test';
import DatanestClient from '../src/index';
import { getCompanyAccountDetails } from '../src/account';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    it('Get Company Account Details', async () => {
        const client = new DatanestClient();
        const details = await getCompanyAccountDetails(client);
        expect(details.company).toEqual(expect.any(Object));
        expect(typeof details.company.ref).toBe('string');
        expect(typeof details.company.company_name).toBe('string');
        expect(details.company).toHaveProperty('team_role_defaults');
        expect(details.company).toHaveProperty('project_additional_settings');
    });

} else {
    it('Skipping account integration tests', () => { });
    console.warn('[WARN] Skipping account integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}