import dotenv from 'dotenv';
import { afterAll, assert, beforeAll, expect, it } from 'vitest';
import DatanestClient from '../src';
import { AppSchemaExportJson, deleteApp, importAppGroup, importAppSchemaFromJson, listProjectApps, shareAppsFromProject, unshareAppGroup } from '../src/gather';
import { Project, ProjectType } from '../src/projects';
import { getCompanyUsers, User } from '../src/users';
import { getTestFixtureJson } from './lib/test-utils';
import { ProjectPurger } from './project-cleanup';

dotenv.config();

// BEFORE:
// 1. create project
// 2. import everything apps
// share App Share Groups
// 2b. delete an app that is shared to test it cannot be deleted
// 2c. delete un unshared app from the everything apps
// 3. Share with prefix for app groups
// create a workflow with shared apps
// 4. create workflow??
// 5. publish workflow
// 6. create new project with workflow & await workflow import
// 8. Assign users to share groups with prefix
// 9. Create another share group
// 10. revise the workflow
// 11. create another project with revised workflow
// 12. Assign users to share groups with prefix
// 13. validate user assignment persists and the the assignment team details is correct

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let randomProjectManager: User;
    let randomUser: User;
    let companyUsers: User[];
    const client = new DatanestClient();
    const projectPurger = new ProjectPurger();
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
        expect(importedAppSchema.apps).to.have.lengthOf(appsSchema.apps.length);
    });

    afterAll(async () => await projectPurger.cleanup());

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
        expect(share_group.apps).to.have.lengthOf(1);
        expect(share_group.apps[0].uuid).toBe(everythingApp.uuid);
        const shareGroupV1 = share_group;
        assert(importedAppSchema, 'Imported app schema is not defined');
        assert(shareGroupV1, 'Share group v1 is not defined');

        const { project: projectToImportTo } = await projectPurger.createTestProject(client, {
            project_name: 'Importing a Share Group',
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
            address_country: 'GB',
            project_client: 'Import Share Group Test',
        });

        console.log('shareGroupV1.share_group', shareGroupV1.share_group, shareGroupV1);

        const { apps: importedApps } = await importAppGroup(client, projectToImportTo.uuid, shareGroupV1.share_group);
        expect(importedApps).to.have.lengthOf(1);
        expect(importedApps[0].title).toBe(shareGroupV1.apps[0].title);

        const apps = await listProjectApps(client, projectToImportTo.uuid);
        expect(apps.apps).to.have.lengthOf(1);

        await deleteApp(client, projectToImportTo.uuid, importedApps[0].uuid!);

        const apps2 = await listProjectApps(client, projectToImportTo.uuid);
        expect(apps2.apps).to.have.lengthOf(0);

        await unshareAppGroup(client, masterProject.uuid, shareGroupV1.share_group);
        await expect(importAppGroup(client, projectToImportTo.uuid, shareGroupV1.share_group)).rejects.toThrow();
    });
} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
