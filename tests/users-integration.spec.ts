import dotenv from 'dotenv';
import { afterAll, beforeAll, expect, it } from 'vitest';
import DatanestClient from '../src';
import { Project, ProjectType } from '../src/projects';
import { addExternalUserToProject, addProjectTeamMember, getProjectTeam, removeExternalUserToProject, removeProjectTeamMember } from '../src/teams';
import { User, deleteCompanyUser, getCompanyExternalUserProjects, getCompanyExternalUsers, getCompanyUsers, inviteCompanyUser, patchCompanyUser, purgeCompanyExternalUser } from '../src/users';
import { ProjectPurger } from './project-cleanup';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let testProject: Project;
    let randomProjectManager: User;
    let companyUsers: User[];
    const client = new DatanestClient();
    const projectPurger = new ProjectPurger();

    beforeAll(async () => {
        companyUsers = (await getCompanyUsers(client)).data;
        randomProjectManager = companyUsers[Math.floor(
            Math.random() * companyUsers.length
        )];

        const testProjectResponse = await projectPurger.createTestProject(client, {
            project_name: 'My project',
            project_client: 'My client',
            project_address: '123 Buckingham Palace Road',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        });
        testProject = testProjectResponse.project;
    });

    afterAll(async () => {
        await projectPurger.cleanup();
    });

    it('POST, GET search, PATCH and DELETE /v1/users', async () => {
        const client = new DatanestClient();
        const randomEmail = 'test-' + Math.random().toString(36).substring(7) + '@user.com';
        const user = await inviteCompanyUser(client, {
            email: randomEmail,
            name: 'Test User',
        });
        expect(user.uuid).is.a('string');
        expect(user.name).equals('Test User');
        expect(user.email).equals(randomEmail);

        const newName = 'Test User ' + Math.random().toString(36).substring(7);
        const updatedUser = await patchCompanyUser(client, user.uuid, {
            name: newName,
            initials: 'TU',
        });

        expect(updatedUser.uuid).equals(user.uuid);
        expect(updatedUser.name).equals(newName);
        expect(updatedUser.initials).equals('TU');

        const users = await getCompanyUsers(client, { search: newName });
        expect(users.data).is.an('array');
        expect(users.data[0].name).equals(newName);

        await deleteCompanyUser(client, user.uuid);
    });

    it.concurrent('GET /v1/users', async () => {
        const client = new DatanestClient();
        const users = await getCompanyUsers(client);

        expect(users.data).is.an('array');
        expect(users.data[0].name).is.a('string');
        expect(users.data[0].email).is.a('string');
    });

    it.concurrent('GET projects/:projectUuid/teams', async () => {
        const users = await getProjectTeam(client, testProject.uuid);

        expect(users.project_manager).is.an('object');
        expect(users.project_manager.email).is.a('string')
        expect(users.project_manager.email).equals(randomProjectManager.email);;

        expect(users.members).is.an('array');
        expect(users.members[0].email).equals(randomProjectManager.email);
        expect(users.external_users).is.an('array');
    });

    it.concurrent('Invite company user, add to project, remove from project', async () => {
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

    it.concurrent('Invite external user, add to project, remove from project', async () => {
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

    it.concurrent('Test company external user management', async () => {
        const newUserName = 'Bob ' + Math.random().toString(36).substring(7);
        const newUserEmail = 'bob-' + Math.random().toString(36).substring(7) + '@user.com';
        const externalUserProjectResponse = await projectPurger.createTestProject(client, {
            project_name: 'My external workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        });
        const externalUserProject = externalUserProjectResponse.project;

        const users = await getProjectTeam(client, externalUserProject.uuid);
        expect(users.members.length).to.be.equal(1, 'Only the project manager should be in the projects team members');
        expect(users.external_users.length).to.be.equal(0, 'Should not be any external users in new project');

        const newExternalUser = await addExternalUserToProject(client, externalUserProject.uuid, {
            email: newUserEmail,
            name: newUserName,
        });

        const users2 = await getProjectTeam(client, externalUserProject.uuid);
        expect(users2.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users2.external_users.find(u => u.email === newExternalUser.email)).to.not.be.undefined;

        const companyExternalUsers = await getCompanyExternalUsers(client, { latest: true });
        const newExternalUser2 = companyExternalUsers.data.find(u => u.email === newExternalUser.email);
        expect(newExternalUser2).to.not.be.undefined;

        const projects = await getCompanyExternalUserProjects(client, newExternalUser.uuid);
        expect(projects.data.length).to.be.equal(1);

        await purgeCompanyExternalUser(client, newExternalUser.uuid);

        const users3 = await getProjectTeam(client, externalUserProject.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users3.external_users.find(u => u.email === newExternalUser.email)).to.be.undefined;
    });
} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
} 
