import { it, expect, afterAll, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { User, deleteCompanyUser, getCompanyExternalUserProjects, getCompanyExternalUsers, getCompanyUsers, inviteCompanyUser, patchCompanyUser, purgeCompanyExternalUser } from '../src/users';
import { addExternalUserToProject, getProjectTeam, addProjectTeamMember, removeExternalUserToProject, removeProjectTeamMember, updateProjectMemberRole } from '../src/teams';
import { Project, ProjectType, archiveProject, createProject, patchProject, waitForProjectWorkflow } from '../src/projects';
import { assignProjectWorkflowAppUser, unassignProjectWorkflowAppUser, getCompanyCustomRoles, getCompanyWorkflows } from '../src/workflows';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let testProject: Project;
    let workflowProject1: Project;
    let workflowProject2: Project;
    let randomProjectManager: User;
    let companyUsers: User[];
    const client = new DatanestClient();
    beforeAll(async () => {
        companyUsers = (await getCompanyUsers(client)).data;
        randomProjectManager = companyUsers[Math.floor(
            Math.random() * companyUsers.length
        )];

        testProject = (await createProject(client, {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My project',
            project_client: 'My client',
            project_address: '123 Buckingham Palace Road',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        })).project;
    });

    afterAll(async () => {
        if (testProject) {
            await archiveProject(client, testProject.uuid);
        }

        if (workflowProject1) {
            await archiveProject(client, workflowProject1.uuid);
        }

        if (workflowProject2) {
            await archiveProject(client, workflowProject2.uuid);
        }
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

        const users = await getCompanyUsers(client, { query: newName });
        expect(users.data).is.an('array');
        expect(users.data[0].name).equals(newName);

        await deleteCompanyUser(client, user.uuid);
    }, {
        timeout: 15000,
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
    }, { timeout: 15000 });

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

    }, {
        timeout: 15000,
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
    }, {
        timeout: 15000,
    });

    it('Test Workflow user assignment, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== randomProjectManager.uuid);
        const workflowUser = remainingUsers[Math.floor(
            Math.random() * remainingUsers.length
        )];
        expect(workflowUser).to.not.be.undefined;

        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        workflowProject1 = (await createProject(client, {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: workflows.data[0].workflow_id,

                workflow_apps: [{
                    workflow_app_id: workflows.data[0].workflow_apps[0].workflow_app_id,
                    user_uuids: [workflowUser.uuid],
                }],
            },
        })).project;

        workflowProject1 = await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users = await getProjectTeam(client, workflowProject1.uuid);
        expect(users.workflow_assignments?.workflow_apps[0].users.find(u => u.email === workflowUser.email), 'New workflow user should be in the workflow app users').to.not.be.undefined;

        const workflowUserFromTeam = users.members.find(u => u.email === workflowUser.email);
        expect(workflowUserFromTeam, 'Workflow user must be automatically made a team member').to.not.be.undefined;
        expect(workflowUserFromTeam?.custom_role_id).to.be.null;
        expect(users.members.find(u => u.email === randomProjectManager.email), 'Project manager should still be a team member too').to.not.be.undefined;
        expect(users.members.length, 'no one else was invited').to.equal(2);
        expect(users.external_users.length).to.equal(0);

        const updatedWorkflowUser = await updateProjectMemberRole(client, workflowProject1.uuid, workflowUser.uuid, customRoles[0].custom_role_id);
        expect(updatedWorkflowUser.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[Math.floor(
            Math.random() * remainingUsers.length
        )];

        await assignProjectWorkflowAppUser(client, workflowProject1.uuid, secondWorkflowUser.uuid, workflows.data[0].workflow_apps[0].workflow_app_id, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject1.uuid, {
            project_name: 'My workflow project updated',
        });

        const users2 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users2.members.find(u => u.email === secondWorkflowUser.email)?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.not.be.undefined;
        const originalWorkflowUser = users2.members.find(u => u.email === workflowUser.email);
        expect(originalWorkflowUser?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        await removeProjectTeamMember(client, workflowProject1.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
    }, { timeout: 45000 });

    it.concurrent('Test external workflow users', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        const newUserName = 'Bob ' + Math.random().toString(36).substring(7);
        const newUserEmail = 'bob-' + Math.random().toString(36).substring(7) + '@user.com';
        workflowProject2 = (await createProject(client, {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My external workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: workflows.data[0].workflow_id,

                workflow_apps: [{
                    workflow_app_id: workflows.data[0].workflow_apps[0].workflow_app_id,
                    user_uuids: [],
                }],
            },
        })).project;

        workflowProject2 = await waitForProjectWorkflow(client, workflowProject2.uuid);

        const users = await getProjectTeam(client, workflowProject2.uuid);
        expect(users.workflow_assignments?.workflow_apps[0].users.length).to.be.equal(0, 'No users should be in the workflow app users');

        const newExternalUser = await addExternalUserToProject(client, workflowProject2.uuid, {
            email: newUserEmail,
            name: newUserName,
            custom_role_id: customRoles[0].custom_role_id,
        });

        await assignProjectWorkflowAppUser(client, workflowProject2.uuid, newExternalUser.email, workflows.data[0].workflow_apps[0].workflow_app_id, customRoles[0].custom_role_id);

        const users2 = await getProjectTeam(client, workflowProject2.uuid);
        expect(users2.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users2.external_users.find(u => u.email === newExternalUser.email)).to.not.be.undefined;
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === newExternalUser.email)).to.not.be.undefined;

        await unassignProjectWorkflowAppUser(client, workflowProject2.uuid, newExternalUser.email, workflows.data[0].workflow_apps[0].workflow_app_id);

        const users3 = await getProjectTeam(client, workflowProject2.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users3.external_users.find(u => u.email === newExternalUser.email), 'unassigning user should remain in project team but not assigned to app').to.not.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === newExternalUser.email)).to.be.undefined;
    }, { timeout: 30000 });

    it.concurrent('Test company external user management', async () => {
        const newUserName = 'Bob ' + Math.random().toString(36).substring(7);
        const newUserEmail = 'bob-' + Math.random().toString(36).substring(7) + '@user.com';
        const externalUserProject = (await createProject(client, {
            project_number: 'test-' + Math.random().toString(36).substring(7),
            project_name: 'My external workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: randomProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        })).project;

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

        const companyExternalUsers = await getCompanyExternalUsers(client);
        const newExternalUser2 = companyExternalUsers.data.find(u => u.email === newExternalUser.email);
        expect(newExternalUser2).to.not.be.undefined;

        const projects = await getCompanyExternalUserProjects(client, newExternalUser.uuid);
        expect(projects.data.length).to.be.equal(1);

        await purgeCompanyExternalUser(client, newExternalUser.uuid);

        const users3 = await getProjectTeam(client, externalUserProject.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users3.external_users.find(u => u.email === newExternalUser.email)).to.be.undefined;
    }, { timeout: 30000 });
} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
} 
