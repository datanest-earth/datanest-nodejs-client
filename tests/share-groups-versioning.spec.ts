import assert from 'node:assert';
import { beforeAll, it, expect } from 'bun:test';
import DatanestClient from '../src';
import { App, AppSchemaExportJson, deleteApp, importAppGroup, importAppSchemaFromJson, listProjectApps, listSharedAppGroups, shareAppsFromProject, unshareAppGroup, updateShareGroup } from '../src/gather';
import { Project, ProjectType } from '../src/projects';
import { getCompanyUsers, User } from '../src/users';
import { getTestFixtureJson } from './lib/test-utils';
import { projectPurger } from './project-cleanup';

const SHARE_GROUP_TEST_RUN_ID = process.env.GITHUB_RUN_ID ?? Date.now().toString(36);
const SHARE_GROUP_TEST_PREFIX = `share.datanest-testing.everything.${SHARE_GROUP_TEST_RUN_ID}`;

function expectShareGroupAppSnapshot(shareGroupApp: App, sourceApp: App) {
    expect(shareGroupApp.uuid).toBeDefined();
    expect(shareGroupApp.uuid).not.toBe(sourceApp.uuid);
    expect(shareGroupApp.cloned_from_uuid).toBe(sourceApp.uuid!);
    expect(shareGroupApp.title).toBe(sourceApp.title);
}

// Future test cases to add:
// Share with prefix for app groups
// Create a workflow with shared apps
// Publish workflow
// Create new project with workflow & await workflow import
// Assign users to share groups with prefix
// Create another share group
// Revise the workflow
// Create another project with revised workflow
// Assign users to share groups with prefix
// Validate user assignment persists and the the assignment team details is correct

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let randomProjectManager: User;
    let randomUser: User;
    let companyUsers: User[];
    const client = new DatanestClient();
    let masterProject: Project;
    const appsSchema = getTestFixtureJson('datanest-test-apps-v1.apps.json');
    let importedAppSchema: AppSchemaExportJson | null = null;

    beforeAll(async () => {
        companyUsers = (await getCompanyUsers(client)).data;
        randomProjectManager = companyUsers[Math.floor(
            Math.random() * companyUsers.length
        )];
        let attempts = 0;
        while (true) {
            randomUser = companyUsers[Math.floor(
                Math.random() * companyUsers.length
            )];
            if (randomUser.email !== randomProjectManager.email) {
                break;
            }
            if (attempts > 10) {
                throw new Error('Failed to find a random user that is not the project manager');
            }
            attempts++;
        }

        masterProject = (await projectPurger.createTestProject(client, {
            project_name: 'Share Group Master Project',
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            address_country: 'GB',
            project_client: 'Share Group Master Client',
        })).project;

        importedAppSchema = await importAppSchemaFromJson(client, masterProject.uuid, appsSchema);
        expect(importedAppSchema.apps).toHaveLength(appsSchema.apps.length);
    }, { timeout: 90000 });

    it('Share Everything App V1, import into a new project, delete an imported app, and unshare', async () => {
        assert(importedAppSchema, 'Imported app schema is not defined');
        const everythingApp = importedAppSchema.apps.find(app => app.title === 'Gather - Everything Tester App');
        assert(everythingApp, 'Everything app is not defined');
        const { share_group } = await shareAppsFromProject(client, masterProject.uuid, {
            group_title: 'TEST: Everything Test App V1',
            group_description: 'Everything Test App V1',
            app_uuids: [everythingApp.uuid!],
        });
        expect(share_group).toBeDefined();
        expect(share_group.group_title).toBe('TEST: Everything Test App V1');
        expect(share_group.group_description).toBe('Everything Test App V1');
        expect(share_group.apps).toHaveLength(1);
        expectShareGroupAppSnapshot(share_group.apps[0], everythingApp);
        const shareGroupV1 = share_group;
        assert(importedAppSchema, 'Imported app schema is not defined');
        assert(shareGroupV1, 'Share group v1 is not defined');

        const { project: projectToImportTo } = await projectPurger.createTestProject(client, {
            project_name: 'Importing a Share Group',
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            address_country: 'GB',
            project_client: 'Import Share Group Test',
        });

        const { apps: importedApps } = await importAppGroup(client, projectToImportTo.uuid, shareGroupV1.share_group);
        expect(importedApps).toHaveLength(1);
        expect(importedApps[0].title).toBe(shareGroupV1.apps[0].title);

        const apps = await listProjectApps(client, projectToImportTo.uuid);
        expect(apps.apps).toHaveLength(1);
        // Test deleting the imported app.
        await deleteApp(client, projectToImportTo.uuid, importedApps[0].uuid!);

        const apps2 = await listProjectApps(client, projectToImportTo.uuid);
        expect(apps2.apps).toHaveLength(0);

        await unshareAppGroup(client, masterProject.uuid, shareGroupV1.share_group);
        await expect(importAppGroup(client, projectToImportTo.uuid, shareGroupV1.share_group)).rejects.toThrow();
    }, { timeout: 90000 });

    it('Share Everything App V2, with custom share_group, update to v3, import into a new project, delete master app, unshare', async () => {
        assert(importedAppSchema, 'Imported app schema is not defined');
        const everythingApp = importedAppSchema.apps.find(app => app.title === 'Gather - Everything Tester App');
        const locationApp = importedAppSchema.apps.find(app => app.title === 'Location App');
        assert(everythingApp && locationApp, 'Everything app & location app are not defined');
        const shareGroupV2Ref = `${SHARE_GROUP_TEST_PREFIX}.v2`;
        const shareGroupV3Ref = `${SHARE_GROUP_TEST_PREFIX}.v3`;
        const { share_group } = await shareAppsFromProject(client, masterProject.uuid, {
            group_title: 'TEST: Everything Test App V2',
            share_group: shareGroupV2Ref,
            app_uuids: [everythingApp.uuid!],
        });
        expect(share_group).toBeDefined();
        expect(share_group.share_group).toBe(shareGroupV2Ref);
        expect(share_group.group_title).toBe('TEST: Everything Test App V2');
        expect(share_group.group_description).toBeNull();
        expect(share_group.apps).toHaveLength(1);
        expectShareGroupAppSnapshot(share_group.apps[0], everythingApp);
        const shareGroupV2 = share_group;
        assert(importedAppSchema, 'Imported app schema is not defined');
        assert(shareGroupV2, 'Share group v2 is not defined');

        const { project: projectToImportTo } = await projectPurger.createTestProject(client, {
            project_name: 'Importing a Share Group',
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            address_country: 'GB',
            project_client: 'Import Share Group Test',
        });

        const { apps: importedApps } = await importAppGroup(client, projectToImportTo.uuid, shareGroupV2Ref);
        expect(importedApps).toHaveLength(1);
        expect(importedApps[0].title).toBe(shareGroupV2.apps[0].title);

        await expect(shareAppsFromProject(client, masterProject.uuid, {
            group_title: 'TEST: Everything Test App V3',
            share_group: shareGroupV2Ref,
            app_uuids: [everythingApp.uuid!],
        }), 'Cannot use the same share_group twice').rejects.toThrow();

        // Update the share group to v3
        const { share_group: shareGroupV3 } = await updateShareGroup(client, masterProject.uuid, shareGroupV2Ref, {
            group_title: 'TEST: Everything Test App V3',
            group_description: 'Everything Test App V3',
            app_uuids: [everythingApp.uuid!, locationApp.uuid!],
            share_group: shareGroupV3Ref,
        });
        expect(shareGroupV3.share_group).toBe(shareGroupV3Ref);
        expect(shareGroupV3.group_description).toBe('Everything Test App V3');
        expect(shareGroupV3.apps).toHaveLength(2);
        const sortedApps = shareGroupV3.apps.sort((a, b) => a.title.localeCompare(b.title));
        expectShareGroupAppSnapshot(sortedApps[0], everythingApp);
        expectShareGroupAppSnapshot(sortedApps[1], locationApp);

        // Ensure it doesnt duplicate, add a description
        const { share_group: shareGroupV3_1 } = await updateShareGroup(client, masterProject.uuid, shareGroupV3Ref, {
            group_title: 'TEST: Everything Test App V3',
            share_group: shareGroupV3Ref,
            group_description: 'Everything Test App V3',
            app_uuids: [everythingApp.uuid!],
        });
        expect(shareGroupV3_1.share_group).toBe(shareGroupV3Ref);
        expect(shareGroupV3_1.group_description).toBe('Everything Test App V3');
        expect(shareGroupV3_1.apps).toHaveLength(1);
        expectShareGroupAppSnapshot(shareGroupV3_1.apps[0], everythingApp);

        // Can search by share_group prefix
        const companyShareGroups = await listSharedAppGroups(client, 1, 'company', {
            search: SHARE_GROUP_TEST_PREFIX,
        });
        expect(companyShareGroups.data, 'Search results should only contain the share groups that match the prefix').toHaveLength(
            companyShareGroups.data
                .filter(shareGroup =>
                    shareGroup.share_group.startsWith(SHARE_GROUP_TEST_PREFIX)
                ).length
        );
        expect(companyShareGroups.data).toHaveLength(1);

        // The system lets you delete master apps that are shared.
        await deleteApp(client, masterProject.uuid, everythingApp.uuid!)

        await unshareAppGroup(client, masterProject.uuid, shareGroupV3.share_group);
        await expect(unshareAppGroup(client, masterProject.uuid, shareGroupV2.share_group)).rejects.toThrow();
        await expect(importAppGroup(client, projectToImportTo.uuid, shareGroupV2.share_group)).rejects.toThrow();

        const companyShareGroups2 = await listSharedAppGroups(client, 1, 'company');
        const groupsWithPrefix2 = companyShareGroups2.data.filter(shareGroup => shareGroup.share_group.startsWith(SHARE_GROUP_TEST_PREFIX));
        expect(groupsWithPrefix2).toHaveLength(0);
    }, { timeout: 90000 });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
