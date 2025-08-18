import dotenv from 'dotenv';
import { beforeAll, expect, it } from 'vitest';
import { assignProjectWorkflowAppUser, CompanyWorkflow, getCompanyCustomRoles, getCompanyWorkflow, getCompanyWorkflows, getLatestPublishedWorkflowFromList, unassignProjectWorkflowAppUser } from '../src/workflows';
import DatanestClient, { DatanestResponseError } from '../src';
import { patchProject, ProjectType, waitForProjectWorkflow } from '../src/projects';
import { addExternalUserToProject, getProjectTeam, removeProjectTeamMember, updateProjectMemberRole } from '../src/teams';
import { User } from '../src/users';
import { getCompanyUsers } from '../src/users';
import { projectPurger } from './project-cleanup';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let firstProjectManager: User;
    let otherUser: User;
    let companyUsers: User[];
    const client = new DatanestClient();

    beforeAll(async () => {
        companyUsers = (await getCompanyUsers(client)).data;
        firstProjectManager = companyUsers[0];
        let attempts = 0;
        while (true) {
            otherUser = companyUsers[attempts];
            if (otherUser.email !== firstProjectManager.email) {
                break;
            }
            attempts++;
            if (attempts >= companyUsers.length) {
                throw new Error('Failed to find a random user that is not the project manager');
            }
        }
    });

    it.concurrent('getCompanyWorkflow: Check workflow revision', async () => {
        const [publishedWorkflows, withDraftWorkflows, withRevisionWorkflows] = [
            await getCompanyWorkflows(client),
            await getCompanyWorkflows(client, { include_drafts: true, include_revisions: true }),
            await getCompanyWorkflows(client, { include_revisions: true }),
        ];

        expect(publishedWorkflows.meta.total).to.be.greaterThan(0, 'Prerequisite: There should be at least one workflow in the test company');
        expect(withDraftWorkflows.meta.total).to.not.equal(publishedWorkflows.meta.total, 'Prerequisite: There should be at least one draft workflow');
        expect(withRevisionWorkflows.meta.total).to.not.equal(publishedWorkflows.meta.total, 'Prerequisite: There should be at least one revision workflow');

        expect(withDraftWorkflows.meta.total).to.be.greaterThan(publishedWorkflows.meta.total, 'With draft workflows should never be less than without');
        expect(withRevisionWorkflows.meta.total).to.be.greaterThan(publishedWorkflows.meta.total, 'With revision workflows should never be less than without');

        const workflowWithMaxRevision = publishedWorkflows.data.reduce((max, workflow) => {
            if (workflow.published_at === null) {
                return max;
            }
            if (workflow.revision > max.revision) {
                return workflow;
            }
            return max;
        }, publishedWorkflows.data[0]);

        expect(workflowWithMaxRevision.revision).to.be.greaterThan(1, 'Prerequisite: There should be at least one workflow in the test company with revision greater than 1');

        const workflow = await getCompanyWorkflow(client, workflowWithMaxRevision.original_workflow_id);
        expect(workflow.is_latest).to.be.false;
        expect(workflow.revision).to.be.equal(0);
        expect(workflow.latest_revision).to.be.greaterThanOrEqual(workflowWithMaxRevision.revision);
        expect(workflow.latest_revision_id).to.be.greaterThanOrEqual(workflowWithMaxRevision.workflow_id);
        expect(workflow.original_workflow_id).to.be.equal(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.workflow.workflow_id).to.be.equal(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.latest_workflow.workflow_id).to.be.greaterThanOrEqual(workflowWithMaxRevision.workflow_id);

        if (workflow.latest_published_workflow) {
            expect(workflow.latest_published_revision).to.be.greaterThanOrEqual(workflowWithMaxRevision.revision);
            expect(workflow.latest_published_id).to.be.greaterThanOrEqual(workflow.workflow.workflow_id);
            expect(workflow.latest_revision_id).to.be.greaterThanOrEqual(workflow.latest_published_id!);
        } else {
            expect(workflow.latest_published_revision).to.be.null;
            expect(workflow.latest_published_id).to.be.null;
        }
    });

    it.concurrent('Cannot use non-published workflow for project', async () => {
        const workflows = await getCompanyWorkflows(client, { include_drafts: true, });
        const draftWorkflow = workflows.data.find(w => w.published_at === null && !workflows.data.some(w2 => w2.published_at && w2.original_workflow_id === w.original_workflow_id && w2.workflow_id !== w.workflow_id));

        expect(draftWorkflow, 'Prerequisite: There should be at least one draft workflow in the test company').to.not.be.undefined;

        // create project with non-published workflow
        try {
            await projectPurger.createTestProject(client, {
                project_name: 'My workflow project',
                project_client: 'My client',
                project_address: '123 Fake Street',
                address_country: 'GB',
                project_manager_uuid: firstProjectManager.uuid,
                project_type: ProjectType.PROJECT_TYPE_STANDARD,
                workflow_assignments: {
                    workflow_id: draftWorkflow!.workflow_id,
                },
            });
            expect.fail('Expected function to throw DatanestResponseError');
        } catch (dnError: DatanestResponseError | any) {
            expect(dnError instanceof DatanestResponseError).to.be.true;
            expect(dnError.status).to.be.equal(422);
            expect(dnError.message).to.contain('Datanest API Failed: v1/projects: 422');
        }
    });

    it.concurrent('Can use previous revisions of workflow for project with share_group assignments', async () => {

        // Find a workflow that has multiple revisions
        let workflowWithMultipleRevisions: CompanyWorkflow | undefined = undefined;
        let relatedWorkflows: CompanyWorkflow[] = [];

        for (let page = 1; page <= 10; page++) {
            const workflows = await getCompanyWorkflows(client, { include_revisions: true, page });
            for (const workflow of workflows.data) {
                const related = workflows.data.filter(w => w.published_at !== null && w.original_workflow_id === workflow.original_workflow_id && w.workflow_apps.some(a => workflow.workflow_apps.some(l => l.share_group === a.share_group)));
                if (related.length > 1) {
                    workflowWithMultipleRevisions = workflow;
                    relatedWorkflows = related;
                    break;
                }
            }
            if (workflows.meta.last_page >= page) {
                break;
            }
        }

        expect(workflowWithMultipleRevisions).to.not.be.undefined;
        expect(relatedWorkflows.length).to.be.greaterThan(1, 'Prerequisite: There should be at least two workflows in the test company');

        const latestRevisionWorkflow = getLatestPublishedWorkflowFromList(relatedWorkflows);
        expect(latestRevisionWorkflow.revision).to.be.greaterThan(0, 'Prerequisite: There should be at least one published revision workflow in the test company');

        const previousRevisionWorkflow = relatedWorkflows.find(w =>
            w.revision < latestRevisionWorkflow.revision && w.workflow_apps.some(a => latestRevisionWorkflow.workflow_apps.some(l => l.share_group === a.share_group))
        );

        expect(latestRevisionWorkflow, 'Prerequisite: There should be at least one published revision workflow in the test company').to.not.be.undefined;
        expect(previousRevisionWorkflow, 'Prerequisite: There should be at least one previous revision workflow in the test company').to.not.be.undefined;

        // find a common share_group between the two workflows
        const commonShareGroup = previousRevisionWorkflow!.workflow_apps.find(w =>
            latestRevisionWorkflow!.workflow_apps.some(l => l.share_group === w.share_group)
        );
        expect(commonShareGroup, 'Prerequisite: There should be at least one common share_group between the two workflows').to.not.be.undefined;

        // create project with non-published workflow
        const project = await projectPurger.createTestProject(client, {
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: previousRevisionWorkflow!.workflow_id,
                workflow_apps: [{
                    share_group: commonShareGroup!.share_group,
                    user_uuids: [otherUser.uuid],
                }],
            },
        });

        await waitForProjectWorkflow(client, project.project.uuid);

        const projectTeam = await getProjectTeam(client, project.project.uuid);
        console.log('projectWorkflowAssignments', projectTeam.workflow_assignments?.workflow_apps);

        expect(projectTeam.workflow_assignments?.workflow_apps[0].users.find(u => u.email === otherUser.email)).to.not.be.undefined;
    });

    it.concurrent('Test Workflow user assignment using share_group, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== firstProjectManager.uuid);
        const workflowUser = remainingUsers[0];
        expect(workflowUser).to.not.be.undefined;

        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        // Simulate a version-reuseable prefix. E.g. removing .v1 off the end of the share_group
        const prefix = workflows.data[0].workflow_apps[0].share_group.slice(0, -3);

        const workflowProject1Response = await projectPurger.createTestProject(client, {
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: workflows.data[0].workflow_id,

                workflow_apps: [{
                    share_group: prefix,
                    user_uuids: [workflowUser.uuid],
                }],
            },
        });
        let workflowProject1 = workflowProject1Response.project;

        workflowProject1 = await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users = await getProjectTeam(client, workflowProject1.uuid);
        console.log('users.workflow_assignments?.workflow_apps', users.workflow_assignments?.workflow_apps.map(w => w.users), users.members.map(m => m.email), workflowUser.email);
        expect(users.workflow_assignments?.workflow_apps.some(workflowApp => workflowApp.users.find(u => u.email === workflowUser.email)), 'New workflow user should be in the workflow app users').to.be.true;
        const workflowAppsCount = users.workflow_assignments?.workflow_apps.length;
        expect(workflowAppsCount).to.not.be.undefined;
        const firstWorkflowAppShareGroup = users.workflow_assignments?.workflow_apps[0].share_group;
        expect(firstWorkflowAppShareGroup).to.not.be.undefined;

        const workflowUserFromTeam = users.members.find(u => u.email === workflowUser.email);
        expect(workflowUserFromTeam, 'Workflow user must be automatically made a team member').to.not.be.undefined;
        expect(workflowUserFromTeam?.custom_role_id).to.be.null;
        expect(users.members.find(u => u.email === firstProjectManager.email), 'Project manager should still be a team member too').to.not.be.undefined;
        expect(users.members.length, 'no one else was invited').to.equal(2);
        expect(users.external_users.length).to.equal(0);

        const updatedWorkflowUser = await updateProjectMemberRole(client, workflowProject1.uuid, workflowUser.uuid, customRoles[0].custom_role_id);
        expect(updatedWorkflowUser.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[0];

        await assignProjectWorkflowAppUser(client, workflowProject1.uuid, secondWorkflowUser.uuid, workflows.data[0].workflow_apps[0].share_group, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject1.uuid, {
            project_name: 'My workflow project updated',
        });

        const users2 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users2.workflow_assignments?.workflow_apps.length).to.be.equal(workflowAppsCount);
        expect(users2.workflow_assignments?.workflow_apps[0].share_group).to.be.equal(firstWorkflowAppShareGroup);
        expect(users2.members.find(u => u.email === secondWorkflowUser.email)?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.not.be.undefined;
        const originalWorkflowUser = users2.members.find(u => u.email === workflowUser.email);
        expect(originalWorkflowUser?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        await removeProjectTeamMember(client, workflowProject1.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users3.workflow_assignments?.workflow_apps.length).to.be.equal(workflowAppsCount);
        expect(users3.workflow_assignments?.workflow_apps[0].share_group).to.be.equal(firstWorkflowAppShareGroup);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
    });

    it.concurrent('Test LEGACY Workflow user assignment using workflow_app_id, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== firstProjectManager.uuid);
        const workflowUser = remainingUsers[0];
        expect(workflowUser).to.not.be.undefined;

        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        const workflowProject1Response = await projectPurger.createTestProject(client, {
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: workflows.data[0].workflow_id,

                workflow_apps: [{
                    workflow_app_id: workflows.data[0].workflow_apps[0].workflow_app_id,
                    user_uuids: [workflowUser.uuid],
                }],
            },
        });
        let workflowProject1 = workflowProject1Response.project;

        workflowProject1 = await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users = await getProjectTeam(client, workflowProject1.uuid);
        console.log('users.workflow_assignments', users.workflow_assignments);
        expect(users.workflow_assignments?.workflow_apps.some(workflowApp => workflowApp.users.find(u => u.email === workflowUser.email)), 'New workflow user should be in the workflow app users').to.be.true;
        const workflowAppsCount = users.workflow_assignments?.workflow_apps.length;
        expect(workflowAppsCount).to.not.be.undefined;
        const firstWorkflowAppId = users.workflow_assignments?.workflow_apps[0].workflow_app_id;
        expect(firstWorkflowAppId).to.not.be.undefined;

        const workflowUserFromTeam = users.members.find(u => u.email === workflowUser.email);
        expect(workflowUserFromTeam, 'Workflow user must be automatically made a team member').to.not.be.undefined;
        expect(workflowUserFromTeam?.custom_role_id).to.be.null;
        expect(users.members.find(u => u.email === firstProjectManager.email), 'Project manager should still be a team member too').to.not.be.undefined;
        expect(users.members.length, 'no one else was invited').to.equal(2);
        expect(users.external_users.length).to.equal(0);

        const updatedWorkflowUser = await updateProjectMemberRole(client, workflowProject1.uuid, workflowUser.uuid, customRoles[0].custom_role_id);
        expect(updatedWorkflowUser.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[0];

        await assignProjectWorkflowAppUser(client, workflowProject1.uuid, secondWorkflowUser.uuid, workflows.data[0].workflow_apps[0].workflow_app_id, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject1.uuid, {
            project_name: 'My workflow project updated',
        });

        const users2 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users2.workflow_assignments?.workflow_apps.length).to.be.equal(workflowAppsCount);
        expect(users2.workflow_assignments?.workflow_apps[0].workflow_app_id).to.be.equal(firstWorkflowAppId);
        expect(users2.members.find(u => u.email === secondWorkflowUser.email)?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);
        expect(users2.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.not.be.undefined;
        const originalWorkflowUser = users2.members.find(u => u.email === workflowUser.email);
        expect(originalWorkflowUser?.custom_role_id).to.be.equal(customRoles[0].custom_role_id);

        await removeProjectTeamMember(client, workflowProject1.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users3.workflow_assignments?.workflow_apps.length).to.be.equal(workflowAppsCount);
        expect(users3.workflow_assignments?.workflow_apps[0].workflow_app_id).to.be.equal(firstWorkflowAppId);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).to.be.undefined;
    });

    it.concurrent('Test external workflow users', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        expect(customRoles.length).to.be.greaterThan(0, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company");
        expect(workflows.data.length).to.be.greaterThan(0, "Prerequisite: There should be at least one workflow in the test company");

        const newUserName = 'Bob ' + Math.random().toString(36).substring(7);
        const newUserEmail = 'bob-' + Math.random().toString(36).substring(7) + '@user.com';
        const workflowProject2Response = await projectPurger.createTestProject(client, {
            project_name: 'My external workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: workflows.data[0].workflow_id,

                workflow_apps: [{
                    workflow_app_id: workflows.data[0].workflow_apps[0].workflow_app_id,
                    user_uuids: [],
                }],
            },
        });
        let workflowProject2 = workflowProject2Response.project;

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
    });
} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
