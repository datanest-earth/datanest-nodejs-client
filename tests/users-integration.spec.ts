import { beforeAll, it, expect } from 'bun:test';
import DatanestClient from '../src';
import { Project, ProjectType } from '../src/projects';
import { addExternalUserToProject, addProjectTeamMember, getProjectTeam, removeExternalUserToProject, removeProjectTeamMember } from '../src/teams';
import { User, deleteCompanyUser, getCompanyExternalUserProjects, getCompanyExternalUsers, getCompanyUsers, inviteCompanyUser, patchCompanyUser, purgeCompanyExternalUser } from '../src/users';
import { projectPurger } from './project-cleanup';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let testProject: Project;
    let randomProjectManager: User;
    let companyUsers: User[];
    const client = new DatanestClient();

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
    }, 90000);

    it('POST, GET search, PATCH and DELETE /v1/users', async () => {
        const client = new DatanestClient();
        const randomEmail = 'test-' + Math.random().toString(36).substring(7) + '@user.com';
        const user = await inviteCompanyUser(client, {
            email: randomEmail,
            name: 'Test User',
        });
        expect(typeof user.uuid).toBe('string');
        expect(user.name).toBe('Test User');
        expect(user.email).toBe(randomEmail);

        const newName = 'Test User ' + Math.random().toString(36).substring(7);
        const updatedUser = await patchCompanyUser(client, user.uuid, {
            name: newName,
            initials: 'TU',
        });

        expect(updatedUser.uuid).toBe(user.uuid);
        expect(updatedUser.name).toBe(newName);
        expect(updatedUser.initials).toBe('TU');

        const users = await getCompanyUsers(client, { search: newName });
        expect(Array.isArray(users.data)).toBe(true);
        expect(users.data[0].name).toBe(newName);

        await deleteCompanyUser(client, user.uuid);
    });

    it.concurrent('GET /v1/users', async () => {
        const client = new DatanestClient();
        const users = await getCompanyUsers(client);

        expect(Array.isArray(users.data)).toBe(true);
        expect(typeof users.data[0].name).toBe('string');
        expect(typeof users.data[0].email).toBe('string');
    });

    it.concurrent('GET projects/:projectUuid/teams', async () => {
        const users = await getProjectTeam(client, testProject.uuid);

        expect(users.project_manager).toEqual(expect.any(Object));
        expect(typeof users.project_manager.email).toBe('string')
        expect(users.project_manager.email).toBe(randomProjectManager.email);;

        expect(Array.isArray(users.members)).toBe(true);
        expect(users.members[0].email).toBe(randomProjectManager.email);
        expect(Array.isArray(users.external_users)).toBe(true);
    });

    it.concurrent('Invite company user, add to project, remove from project', async () => {
        const randomEmail = 'invited-' + Math.random().toString(36).substring(7) + '@user.com';
        const user = await inviteCompanyUser(client, {
            email: randomEmail,
            name: 'Invited User',
        });
        expect(typeof user.uuid).toBe('string');

        await addProjectTeamMember(client, testProject.uuid, user.uuid);

        const users = await getProjectTeam(client, testProject.uuid);

        expect(users.project_manager).toEqual(expect.any(Object));
        expect(typeof users.project_manager.email).toBe('string')
        expect(users.project_manager.email).toBe(randomProjectManager.email);;

        expect(Array.isArray(users.members)).toBe(true);
        expect(users.members[0].email).toBe(randomProjectManager.email);
        expect(Array.isArray(users.external_users)).toBe(true);

        expect(users.members.find(u => u.email === randomEmail)).toBeDefined();
        expect(users.external_users.find(u => u.email === randomEmail)).toBeUndefined();

        await removeProjectTeamMember(client, testProject.uuid, user.uuid);

        const users2 = await getProjectTeam(client, testProject.uuid);
        expect(users2.members.find(u => u.email === randomEmail)).toBeUndefined();
        expect(users.external_users.find(u => u.email === randomEmail)).toBeUndefined();

    });

    it.concurrent('Invite external user, add to project, remove from project', async () => {
        const randomEmail = 'external-' + Math.random().toString(36).substring(7) + '@user.com';
        const externalUser = await addExternalUserToProject(client, testProject.uuid, {
            email: randomEmail,
            name: 'External User',
        });

        const users = await getProjectTeam(client, testProject.uuid);
        expect(users.external_users.find(u => u.email === randomEmail)).toBeDefined();
        expect(users.members.find(u => u.email === randomEmail)).toBeUndefined();

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
        expect(users.members.length).toBe(1, 'Only the project manager should be in the projects team members');
        expect(users.external_users.length).toBe(0, 'Should not be any external users in new project');

        const newExternalUser = await addExternalUserToProject(client, externalUserProject.uuid, {
            email: newUserEmail,
            name: newUserName,
        });

        const users2 = await getProjectTeam(client, externalUserProject.uuid);
        expect(users2.members.find(u => u.email === newExternalUser.email)).toBeUndefined();
        expect(users2.external_users.find(u => u.email === newExternalUser.email)).toBeDefined();

        const companyExternalUsers = await getCompanyExternalUsers(client, { latest: true });
        const newExternalUser2 = companyExternalUsers.data.find(u => u.email === newExternalUser.email);
        expect(newExternalUser2).toBeDefined();

        const projects = await getCompanyExternalUserProjects(client, newExternalUser.uuid);
        expect(projects.data.length).toBe(1);

        await purgeCompanyExternalUser(client, newExternalUser.uuid);

        const users3 = await getProjectTeam(client, externalUserProject.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).toBeUndefined();
        expect(users3.external_users.find(u => u.email === newExternalUser.email)).toBeUndefined();
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
} 
