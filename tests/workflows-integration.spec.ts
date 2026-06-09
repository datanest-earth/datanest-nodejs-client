import assert from 'node:assert';
import { beforeAll, it, expect } from 'bun:test';
import { assignProjectWorkflowAppUser, CompanyWorkflow, getCompanyCustomRoles, getCompanyWorkflow, getCompanyWorkflows, getLatestPublishedWorkflowFromList, unassignProjectWorkflowAppUser } from '../src/workflows';
import DatanestClient, { DatanestResponseError, PaginatedResponse } from '../src';
import { patchProject, ProjectType, waitForProjectWorkflow } from '../src/projects';
import { addExternalUserToProject, getProjectTeam, removeProjectTeamMember, updateProjectMemberRole } from '../src/teams';
import { User } from '../src/users';
import { getCompanyUsers } from '../src/users';
import { projectPurger } from './project-cleanup';
import { sleep } from 'bun';

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
    }, { timeout: 90000 });

    async function getWorkflowDrafts(client: DatanestClient): Promise<PaginatedResponse<CompanyWorkflow>> {
        let page = 1;
        while (true) {
            const workflows = await getCompanyWorkflows(client, { include_drafts: true, page });
            page++;
            const drafts = workflows.data.filter(w => w.published_at === null);
            if (drafts.length > 0) {
                workflows.data = drafts;
                return workflows;
            }
            if (workflows.meta.last_page >= page) {
                break;
            }
        }

        return {
            data: [],
            meta: {
                total: 0,
                last_page: 1,
                per_page: 0,
                current_page: 1,
            },
        };
    }

    async function getWorkflowRevisions(client: DatanestClient): Promise<PaginatedResponse<CompanyWorkflow>> {
        let page = 1;
        while (true) {
            const workflows = await getCompanyWorkflows(client, { include_revisions: true, page });
            page++;
            const revisions = workflows.data.filter(w => w.revision > 1);
            if (revisions.length > 0) {
                workflows.data = revisions;
                return workflows;
            }
            if (workflows.meta.last_page >= page) {
                break;
            }
        }

        return {
            data: [],
            meta: {
                total: 0,
                last_page: 1,
                per_page: 0,
                current_page: 1,
            },
        };
    }

    it.concurrent('getCompanyWorkflow: Check workflow revision', async () => {
        const [publishedWorkflows, draftWorkflows, revisionWorkflows] = [
            await getCompanyWorkflows(client),
            await getWorkflowDrafts(client),
            await getWorkflowRevisions(client),
        ];

        expect(publishedWorkflows.meta.total, 'Prerequisite: There should be at least one workflow in the test company').toBeGreaterThan(0);
        expect(draftWorkflows.meta.total).not.toBe(publishedWorkflows.meta.total);
        expect(revisionWorkflows.meta.total).not.toBe(publishedWorkflows.meta.total);

        expect(draftWorkflows.meta.total, 'With draft workflows should never be less than without').toBeGreaterThan(publishedWorkflows.meta.total);
        expect(revisionWorkflows.meta.total, 'With revision workflows should never be less than without').toBeGreaterThan(publishedWorkflows.meta.total);

        const workflowWithMaxRevision = publishedWorkflows.data.reduce((max, workflow) => {
            if (workflow.published_at === null) {
                return max;
            }
            if (workflow.revision > max.revision) {
                return workflow;
            }
            return max;
        }, publishedWorkflows.data[0]);

        expect(workflowWithMaxRevision.revision, 'Prerequisite: There should be at least one workflow in the test company with revision greater than 1').toBeGreaterThan(1);

        const workflow = await getCompanyWorkflow(client, workflowWithMaxRevision.original_workflow_id);
        expect(workflow.is_latest).toBe(false);
        expect(workflow.revision).toBe(0);
        expect(workflow.latest_revision).toBeGreaterThanOrEqual(workflowWithMaxRevision.revision);
        expect(workflow.latest_revision_id).toBeGreaterThanOrEqual(workflowWithMaxRevision.workflow_id);
        expect(workflow.original_workflow_id).toBe(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.workflow.workflow_id).toBe(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.latest_workflow.workflow_id).toBeGreaterThanOrEqual(workflowWithMaxRevision.workflow_id);

        if (workflow.latest_published_workflow) {
            expect(workflow.latest_published_revision).toBeGreaterThanOrEqual(workflowWithMaxRevision.revision);
            expect(workflow.latest_published_id).toBeGreaterThanOrEqual(workflow.workflow.workflow_id);
            expect(workflow.latest_revision_id).toBeGreaterThanOrEqual(workflow.latest_published_id!);
        } else {
            expect(workflow.latest_published_revision).toBeNull();
            expect(workflow.latest_published_id).toBeNull();
        }
    });

    it.concurrent('Cannot use non-published workflow for project', async () => {
        const workflows = await getCompanyWorkflows(client, { include_drafts: true, });
        const draftWorkflow = workflows.data.find(w => w.published_at === null && !workflows.data.some(w2 => w2.published_at && w2.original_workflow_id === w.original_workflow_id && w2.workflow_id !== w.workflow_id));

        expect(draftWorkflow, 'Prerequisite: There should be at least one draft workflow in the test company').toBeDefined();

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
            throw new Error('Expected function to throw DatanestResponseError');
        } catch (dnError: DatanestResponseError | any) {
            expect(dnError instanceof DatanestResponseError).toBe(true);
            expect(dnError.status).toBe(422);
            expect(dnError.message).toContain('Datanest API Failed: v1/projects: 422');
        }
    }, { timeout: 90000 });

    async function findWorkflowWithMultipleRevisions(): Promise<{ workflowWithMultipleRevisions: CompanyWorkflow; relatedWorkflows: CompanyWorkflow[]; }> {
        let page = 0;
        while (true) {
            page++;
            const workflows = await getCompanyWorkflows(client, { include_revisions: true, page });
            for (const workflow of workflows.data) {
                const related = workflows.data.filter(w => w.published_at !== null && w.original_workflow_id === workflow.original_workflow_id && w.workflow_apps.some(a => workflow.workflow_apps.some(l => l.share_group && a.share_group && l.share_group === a.share_group)));
                if (related.length > 1) {
                    return {
                        workflowWithMultipleRevisions: workflow,
                        relatedWorkflows: related,
                    };
                }
            }
            if (page > 20) {
                throw new Error('No workflow with multiple revisions found withing the first 20 pages');
            }
            if (workflows.meta.last_page >= page) {
                throw new Error('No workflow with multiple revisions found on any page, last page checked: ' + page);
            }
        }
    }

    it.concurrent('Can use previous revisions of workflow for project with share_group assignments', async () => {

        const { workflowWithMultipleRevisions, relatedWorkflows } = await findWorkflowWithMultipleRevisions();
        expect(workflowWithMultipleRevisions).toBeDefined();
        expect(relatedWorkflows.length, 'Prerequisite: There should be at least two workflows in the test company').toBeGreaterThan(1);

        const latestRevisionWorkflow = getLatestPublishedWorkflowFromList(relatedWorkflows);
        expect(latestRevisionWorkflow.revision, 'Prerequisite: There should be at least one published revision workflow in the test company').toBeGreaterThan(0);

        const previousRevisionWorkflow = relatedWorkflows.find(w =>
            w.revision < latestRevisionWorkflow.revision && w.workflow_apps.some(a => latestRevisionWorkflow.workflow_apps.some(l => l.share_group && a.share_group && l.share_group === a.share_group))
        );

        expect(latestRevisionWorkflow, 'Prerequisite: There should be at least one published revision workflow in the test company').toBeDefined();
        expect(previousRevisionWorkflow, 'Prerequisite: There should be at least one previous revision workflow in the test company').toBeDefined();

        // find a common share_group between the two workflows
        const commonShareGroup = previousRevisionWorkflow!.workflow_apps.find(w =>
            latestRevisionWorkflow!.workflow_apps.some(l => l.share_group && w.share_group && l.share_group === w.share_group)
        );
        expect(commonShareGroup, 'Prerequisite: There should be at least one common share_group between the two workflows').toBeDefined();

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

        expect(projectTeam.workflow_assignments?.workflow_apps[0].users.find(u => u.email === otherUser.email)).toBeDefined();
    }, { timeout: 90000 });

    function selectWorkflowWithAppShareGroup(workflows: CompanyWorkflow[]): CompanyWorkflow | undefined {
        // Use the workflow with the at least 1 workflow app, avoid using larger workflows to avoid slow workflow imports
        return workflows.filter(w => w.workflow_apps.some(a => a.share_group))
            .sort((a, b) => a.workflow_apps.length - b.workflow_apps.length)[0];
    }

    it('Test Workflow user assignment using share_group, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== firstProjectManager.uuid);
        const workflowUser = remainingUsers[0];
        expect(workflowUser).toBeDefined();

        expect(customRoles.length, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company").toBeGreaterThan(0);
        expect(workflows.data.length, "Prerequisite: There should be at least one workflow in the test company").toBeGreaterThan(0);

        const selectedWorkflowWithAppShareGroup = selectWorkflowWithAppShareGroup(workflows.data);
        assert(selectedWorkflowWithAppShareGroup, 'Prerequisite: There should be at least one workflow with at least one workflow app share group in the test company');

        const selectedWorkflowApp = selectedWorkflowWithAppShareGroup!.workflow_apps.find(a => a.share_group);
        assert(selectedWorkflowApp, 'Prerequisite: There should be at least one workflow app share group in the selected workflow');

        // Simulate a version-reuseable prefix. E.g. removing .v1 off the end of the share_group
        const prefix = selectedWorkflowApp!.share_group.slice(0, -3);

        expect(workflowUser.uuid).toBeDefined();

        const workflowProject1Response = await projectPurger.createTestProject(client, {
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: {
                workflow_id: selectedWorkflowWithAppShareGroup.workflow_id,

                workflow_apps: [{
                    share_group: prefix,
                    users: [workflowUser.email],
                }],
            },
        });
        let workflowProject1 = workflowProject1Response.project;

        workflowProject1 = await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users = await getProjectTeam(client, workflowProject1.uuid);
        const matchedUser = users.workflow_assignments?.workflow_apps.some(workflowApp => workflowApp.users.find(u => u.email === workflowUser.email))
        if (!matchedUser) {
            projectPurger.preserveProject(workflowProject1.uuid);
        }
        expect(matchedUser).toBe(true);
        const workflowAppsCount = users.workflow_assignments?.workflow_apps.length;
        expect(workflowAppsCount).toBeDefined();

        const workflowUserFromTeam = users.members.find(u => u.email === workflowUser.email);
        expect(workflowUserFromTeam, 'Workflow user must be automatically made a team member').toBeDefined();
        expect(workflowUserFromTeam?.custom_role_id).toBeNull();
        expect(users.members.find(u => u.email === firstProjectManager.email), 'Project manager should still be a team member too').toBeDefined();
        expect(users.members.length).toBe(2);
        expect(users.external_users.length).toBe(0);

        const updatedWorkflowUser = await updateProjectMemberRole(client, workflowProject1.uuid, workflowUser.uuid, customRoles[0].custom_role_id);
        expect(updatedWorkflowUser.custom_role_id).toBe(customRoles[0].custom_role_id);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[0];
        expect(secondWorkflowUser.uuid).toBeDefined();

        await assignProjectWorkflowAppUser(client, workflowProject1.uuid, secondWorkflowUser.uuid, selectedWorkflowApp.share_group, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject1.uuid, {
            project_name: 'My workflow project updated',
        });

        await waitForProjectWorkflow(client, workflowProject1.uuid);

        // Inviting a user has a delay to be added to the team
        await sleep(5000);

        const projectTeam2 = await getProjectTeam(client, workflowProject1.uuid);
        expect(projectTeam2.workflow_assignments?.workflow_apps.length).toBe(workflowAppsCount);
        const matchingUpdatedWorkflowApp2 = projectTeam2.workflow_assignments?.workflow_apps.find(w => w.workflow_app_id === selectedWorkflowApp.workflow_app_id);
        assert(matchingUpdatedWorkflowApp2, 'The updated workflow app should still be in the workflow assignments');
        expect(matchingUpdatedWorkflowApp2.share_group).toBe(selectedWorkflowApp.share_group);
        const secondWorkflowUser2 = projectTeam2.members.find(u => u.email === secondWorkflowUser.email);
        expect(secondWorkflowUser2).toBeDefined();
        expect(secondWorkflowUser2!.custom_role_id).toBe(customRoles[0].custom_role_id);
        expect(matchingUpdatedWorkflowApp2.users.find(u => u.email === secondWorkflowUser.email)).toBeDefined();
        const originalWorkflowUser = projectTeam2.members.find(u => u.email === workflowUser.email);
        expect(originalWorkflowUser?.custom_role_id).toBe(customRoles[0].custom_role_id);

        await removeProjectTeamMember(client, workflowProject1.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users3.workflow_assignments?.workflow_apps.length).toBe(workflowAppsCount);
        const matchingUpdatedWorkflowApp3 = users3.workflow_assignments?.workflow_apps.find(w => w.workflow_app_id === selectedWorkflowApp.workflow_app_id);
        assert(matchingUpdatedWorkflowApp3, 'The updated workflow app should still be in the workflow assignments');
        expect(matchingUpdatedWorkflowApp3.share_group).toBe(selectedWorkflowApp.share_group);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).toBeUndefined();
        expect(matchingUpdatedWorkflowApp3.users.find(u => u.email === secondWorkflowUser.email)).toBeUndefined();
    }, { timeout: 90000 });

    it('Test LEGACY Workflow user assignment using workflow_app_id, custom role assignment and team member integrity', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        let remainingUsers = companyUsers.filter(cu => cu.uuid !== firstProjectManager.uuid);
        const workflowUser = remainingUsers[0];
        expect(workflowUser).toBeDefined();

        expect(customRoles.length, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company").toBeGreaterThan(0);
        expect(workflows.data.length, "Prerequisite: There should be at least one workflow in the test company").toBeGreaterThan(0);

        const selectedWorkflowWithAppWorkflowApp = selectWorkflowWithAppShareGroup(workflows.data);
        assert(selectedWorkflowWithAppWorkflowApp, 'Prerequisite: There should be at least one workflow with at least one workflow app workflow_app_id in the test company');

        const selectedWorkflowApp = selectedWorkflowWithAppWorkflowApp!.workflow_apps.find(a => a.workflow_app_id);
        assert(selectedWorkflowApp, 'Prerequisite: There should be at least one workflow app workflow_app_id in the first workflow');

        const assignments = {
            workflow_id: selectedWorkflowWithAppWorkflowApp.workflow_id,

            workflow_apps: [{
                workflow_app_id: selectedWorkflowApp.workflow_app_id,
                users: [workflowUser.email],
            }],
        };
        const workflowProject1Response = await projectPurger.createTestProject(client, {
            project_name: 'My workflow project',
            project_client: 'My client',
            project_address: '123 Fake Street',
            address_country: 'GB',
            project_manager_uuid: firstProjectManager.uuid,
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            workflow_assignments: assignments,
        });
        let workflowProject1 = workflowProject1Response.project;

        workflowProject1 = await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users = await getProjectTeam(client, workflowProject1.uuid);
        const matchedUser = users.workflow_assignments?.workflow_apps.some(workflowApp => workflowApp.users.find(u => u.email === workflowUser.email))
        if (!matchedUser) {
            console.log('users.workflow_assignments', users.workflow_assignments, users.members.map(m => m.email), workflowUser.email, users.workflow_assignments?.workflow_apps.map(w => w.users.map(u => u.email)));
            console.log('assignments', assignments);
            projectPurger.preserveProject(workflowProject1.uuid);
        }
        expect(matchedUser).toBe(true);
        const workflowAppsCount = users.workflow_assignments?.workflow_apps.length;
        expect(workflowAppsCount).toBeDefined();
        const firstWorkflowAppId = users.workflow_assignments?.workflow_apps[0].workflow_app_id;
        expect(firstWorkflowAppId).toBeDefined();

        const workflowUserFromTeam = users.members.find(u => u.email === workflowUser.email);
        expect(workflowUserFromTeam, 'Workflow user must be automatically made a team member').toBeDefined();
        expect(workflowUserFromTeam?.custom_role_id).toBeNull();
        expect(users.members.find(u => u.email === firstProjectManager.email), 'Project manager should still be a team member too').toBeDefined();
        expect(users.members.length).toBe(2);
        expect(users.external_users.length).toBe(0);

        const updatedWorkflowUser = await updateProjectMemberRole(client, workflowProject1.uuid, workflowUser.uuid, customRoles[0].custom_role_id);
        expect(updatedWorkflowUser.custom_role_id).toBe(customRoles[0].custom_role_id);

        remainingUsers = remainingUsers.filter(cu => cu.uuid !== workflowUser.uuid);
        const secondWorkflowUser = remainingUsers[0];
        expect(secondWorkflowUser.uuid).toBeDefined();

        await assignProjectWorkflowAppUser(client, workflowProject1.uuid, secondWorkflowUser.uuid, selectedWorkflowApp.workflow_app_id, customRoles[0].custom_role_id);
        // Update project shouldn't remove any users
        await patchProject(client, workflowProject1.uuid, {
            project_name: 'My workflow project updated',
        });

        await waitForProjectWorkflow(client, workflowProject1.uuid);

        const users2 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users2.workflow_assignments?.workflow_apps.length).toBe(workflowAppsCount);
        expect(users2.workflow_assignments?.workflow_apps[0].workflow_app_id).toBe(firstWorkflowAppId);
        expect(users2.members.find(u => u.email === secondWorkflowUser.email)?.custom_role_id).toBe(customRoles[0].custom_role_id);
        expect(users2.workflow_assignments?.workflow_apps.some(a => a.users.find(u => u.email === secondWorkflowUser.email))).toBe(true);
        const originalWorkflowUser = users2.members.find(u => u.email === workflowUser.email);
        expect(originalWorkflowUser?.custom_role_id).toBe(customRoles[0].custom_role_id);

        await removeProjectTeamMember(client, workflowProject1.uuid, secondWorkflowUser.uuid);

        const users3 = await getProjectTeam(client, workflowProject1.uuid);
        expect(users3.workflow_assignments?.workflow_apps.length).toBe(workflowAppsCount);
        expect(users3.workflow_assignments?.workflow_apps[0].workflow_app_id).toBe(firstWorkflowAppId);
        expect(users3.members.find(u => u.email === secondWorkflowUser.email)).toBeUndefined();
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === secondWorkflowUser.email)).toBeUndefined();
    }, { timeout: 90000 });

    it.concurrent('Test external workflow users', async () => {
        const [customRoles, workflows] = await Promise.all([getCompanyCustomRoles(client), getCompanyWorkflows(client)]);
        expect(customRoles.length, "Prerequisite: There should be at least one custom role (CompanyRoleProfile) in the test company").toBeGreaterThan(0);
        expect(workflows.data.length, "Prerequisite: There should be at least one workflow in the test company").toBeGreaterThan(0);

        const selectedWorkflowAppWithShareGroup = selectWorkflowWithAppShareGroup(workflows.data);
        assert(selectedWorkflowAppWithShareGroup, 'Prerequisite: There should be at least one workflow with at least one workflow app share group in the test company');
        const selectedAppShareGroup = selectedWorkflowAppWithShareGroup!.workflow_apps.find(a => a.share_group);
        assert(selectedAppShareGroup, 'Prerequisite: There should be at least one workflow app share group in the first workflow');

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
                workflow_id: selectedWorkflowAppWithShareGroup.workflow_id,

                workflow_apps: [{
                    workflow_app_id: selectedAppShareGroup.workflow_app_id,
                    user_uuids: [],
                }],
            },
        });
        let workflowProject2 = workflowProject2Response.project;

        workflowProject2 = await waitForProjectWorkflow(client, workflowProject2.uuid);

        const users = await getProjectTeam(client, workflowProject2.uuid);
        expect(users.workflow_assignments?.workflow_apps[0].users.length, 'No users should be in the workflow app users').toBe(0);

        const newExternalUser = await addExternalUserToProject(client, workflowProject2.uuid, {
            email: newUserEmail,
            name: newUserName,
            custom_role_id: customRoles[0].custom_role_id,
        });

        await assignProjectWorkflowAppUser(client, workflowProject2.uuid, newExternalUser.email, selectedAppShareGroup.workflow_app_id, customRoles[0].custom_role_id);

        const users2 = await getProjectTeam(client, workflowProject2.uuid);
        expect(users2.members.find(u => u.email === newExternalUser.email)).toBeUndefined();
        expect(users2.external_users.find(u => u.email === newExternalUser.email)).toBeDefined();
        const matchingUpdatedWorkflowApp = users2.workflow_assignments?.workflow_apps.find(w => w.workflow_app_id === selectedAppShareGroup.workflow_app_id);
        expect(matchingUpdatedWorkflowApp).toBeDefined();
        expect(matchingUpdatedWorkflowApp?.users.find(u => u.email === newExternalUser.email)).toBeDefined();

        await unassignProjectWorkflowAppUser(client, workflowProject2.uuid, newExternalUser.email, selectedAppShareGroup.workflow_app_id);

        const users3 = await getProjectTeam(client, workflowProject2.uuid);
        expect(users3.members.find(u => u.email === newExternalUser.email)).toBeUndefined();
        expect(users3.external_users.find(u => u.email === newExternalUser.email), 'unassigning user should remain in project team but not assigned to app').toBeDefined();
        expect(users3.workflow_assignments?.workflow_apps[0].users.find(u => u.email === newExternalUser.email)).toBeUndefined();
    }, { timeout: 90000 });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
