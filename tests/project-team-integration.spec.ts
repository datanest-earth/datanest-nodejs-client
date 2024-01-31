import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { User, getCompanyUsers, inviteCompanyUser } from '../src/user';
import { addExternalUserToProject, getProjectTeam, addProjectTeamMember, removeExternalUserToProject, removeProjectTeamMember } from '../src/teams';
import { Project, ProjectType, createProject } from '../src/projects';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let testProject: Project;
    let randomProjectManager: User;
    const client = new DatanestClient();
    it('Setup test project', async () => {
        const companyUsers = await getCompanyUsers(client);
        randomProjectManager = companyUsers.data[Math.floor(
            Math.random() * companyUsers.data.length
        )];

        testProject = (await createProject(client, {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        })).project;
    });

    it('GET projects/:projectUuid/teams', async () => {
        const users = await getProjectTeam(client, testProject.uuid);

        expect(users.project_manager).is.an('object');
        expect(users.project_manager.email).is.a('string')
        expect(users.project_manager.email).equals(randomProjectManager.email);;

        expect(users.members).is.an('array');
        expect(users.members[0].email).equals(randomProjectManager.email);
        expect(users.external_users).is.an('array');
    });

    it('Invite company user, add to project, remove from project', async () => {

        const randomEmail = 'invited-' + Math.random().toString(36).substring(7) + '@user.com';
        const user = await inviteCompanyUser(client, {
            email: randomEmail,
            name: 'Invited User',
        });
        expect(user.uuid).is.a('string');

        await addProjectTeamMember(client, testProject.uuid, user.uuid);

        const users = await getProjectTeam(client, testProject.uuid);

        expect(users.project_manager).is.an('object');
        expect(users.project_manager.email).is.a('string')
        expect(users.project_manager.email).equals(randomProjectManager.email);;

        expect(users.members).is.an('array');
        expect(users.members[0].email).equals(randomProjectManager.email);
        expect(users.external_users).is.an('array');

        expect(users.members.find(u => u.email === randomEmail)).to.not.be.undefined;
        expect(users.external_users.find(u => u.email === randomEmail)).to.be.undefined;

        await removeProjectTeamMember(client, testProject.uuid, user.uuid);

        const users2 = await getProjectTeam(client, testProject.uuid);
        expect(users2.members.find(u => u.email === randomEmail)).to.be.undefined;
        expect(users.external_users.find(u => u.email === randomEmail)).to.be.undefined;

    });

    it('Invite external user, add to project, remove from project', async () => {

        const randomEmail = 'external-' + Math.random().toString(36).substring(7) + '@user.com';
        const externalUser = await addExternalUserToProject(client, testProject.uuid, {
            email: randomEmail,
            name: 'External User',
        });

        const users = await getProjectTeam(client, testProject.uuid);
        expect(users.external_users.find(u => u.email === randomEmail)).to.not.be.undefined;
        expect(users.members.find(u => u.email === randomEmail)).to.be.undefined;

        await removeExternalUserToProject(client, testProject.uuid, externalUser.uuid);
    });

} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}