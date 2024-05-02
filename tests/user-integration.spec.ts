import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { deleteCompanyUser, getCompanyUsers, inviteCompanyUser, patchCompanyUser } from '../src/users';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    it('GET /v1/users', async () => {
        const client = new DatanestClient();
        const users = await getCompanyUsers(client);

        expect(users.data).is.an('array');
        expect(users.data[0].name).is.a('string');
        expect(users.data[0].email).is.a('string');
    });

    it('POST, PATCH and DELETE /v1/users', async () => {
        const client = new DatanestClient();
        const randomEmail = 'test-' + Math.random().toString(36).substring(7) + '@user.com';
        const user = await inviteCompanyUser(client, {
            email: randomEmail,
            name: 'Test User',
        });
        expect(user.uuid).is.a('string');
        expect(user.name).equals('Test User');
        expect(user.email).equals(randomEmail);

        const updatedUser = await patchCompanyUser(client, user.uuid, {
            name: 'Test User 2',
            initials: 'TU',
        });
        expect(updatedUser.uuid).equals(user.uuid);
        expect(updatedUser.name).equals('Test User 2');
        expect(updatedUser.initials).equals('TU');

        await deleteCompanyUser(client, user.uuid);
    }, {
        timeout: 15000,
    });

} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}