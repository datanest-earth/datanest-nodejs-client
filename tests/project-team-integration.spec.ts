import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { User, getCompanyUsers, inviteCompanyUser } from '../src/users';
import { addExternalUserToProject, getProjectTeam, addProjectTeamMember, removeExternalUserToProject, removeProjectTeamMember } from '../src/teams';
import { Project, ProjectType, archiveProject, createProject, patchProject } from '../src/projects';
import { assignProjectWorkflowAppUser, unassignProjectWorkflowAppUser, getCompanyCustomRoles, getCompanyWorkflows } from '../src/workflows';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let testProject: Project;
    let randomProjectManager: User;
    let companyUsers: User[];
    const client = new DatanestClient();
    it('Setup test project', async () => {
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

    }, {
        timeout: 15000,
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
    }, {
        timeout: 15000,
    });

    it('Test Workflow user assignment, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== randomProjectManager.uuid);
        const workflowUser = remainingUsers[Math.floor(
            Math.random() * remainingUsers.length
        )];

        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        const workflowProject = (await createProject(client, {
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

        const users = await getProjectTeam(client, workflowProject.uuid);
        expect(users.workflow_assignments?.workflow_apps[0].users.find(u => u.email === workflowUser.email), 'New workflow user should be in the workflow app users').to.not.be.undefined;
        expect(users.members.find(u => u.email === workflowUser.email), 'Workflow user must be automatically made a team member').to.not.be.undefined;
        expect(users.members.find(u => u.email === randomProjectManager.email), 'Project manager should still be a team member too').to.not.be.undefined;
        expect(users.members.length, 'no one else was invited').to.equal(2);
        expect(users.external_users.length).to.equal(0);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[Math.floor(
            Math.random() * remainingUsers.length
        )];

        await assignProjectWorkflowAppUser(client, workflowProject.uuid, secondWorkflowUser.uuid, workflows.data[0].workflow_apps[0].workflow_app_id, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject.uuid, {
            project_name: 'My workflow project updated',
        });

        const users2 = await getProjectTeam(client, workflowProject.uuid);
        expect(users2.members.find(u => u.email === secondWorkflowUser.email)?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.not.be.undefined;

        await removeProjectTeamMember(client, workflowProject.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject.uuid);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;

        await archiveProject(client, workflowProject.uuid);
    }, { timeout: 15000 });

    it('Test external workflow users', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        const newUserName = 'Bob ' + Math.random().toString(36).substring(7);
        const newUserEmail = 'bob-' + Math.random().toString(36).substring(7) + '@user.com';
        const workflowProject = (await createProject(client, {
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

        const users = await getProjectTeam(client, workflowProject.uuid);
        expect(users.workflow_assignments?.workflow_apps[0].users.length).to.be.equal(0, 'No users should be in the workflow app users');

        const newExternalUser = await addExternalUserToProject(client, workflowProject.uuid, {
            email: newUserEmail,
            name: newUserName,
            custom_role_id: customRoles[0].custom_role_id,
        });

        await assignProjectWorkflowAppUser(client, workflowProject.uuid, newExternalUser.email, workflows.data[0].workflow_apps[0].workflow_app_id, customRoles[0].custom_role_id);

        const users2 = await getProjectTeam(client, workflowProject.uuid);
        expect(users2.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users2.external_users.find(u => u.email === newExternalUser.email)).to.not.be.undefined;
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === newExternalUser.email)).to.not.be.undefined;

        await unassignProjectWorkflowAppUser(client, workflowProject.uuid, newExternalUser.email, workflows.data[0].workflow_apps[0].workflow_app_id);

        const users3 = await getProjectTeam(client, workflowProject.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).to.be.undefined;
        expect(users3.external_users.find(u => u.email === newExternalUser.email), 'unassigning user should remain in project team but not assigned to app').to.not.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === newExternalUser.email)).to.be.undefined;

        await archiveProject(client, workflowProject.uuid);
    });

    it('Teardown test project', async () => {
        await archiveProject(client, testProject.uuid);
    });

} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
} 
