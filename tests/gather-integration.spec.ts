import { it, expect, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient, { gather, projects } from '../src';
import { listProjectItems } from '../src/gather';
import { ProjectPurger } from './project-cleanup';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    let projectUuid = '';
    let appUuid: string;
    let itemId: number;
    let shareGroupProjectUuid = '';
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString().split('.')[0] + 'Z';
    const projectPurger = new ProjectPurger();

    beforeAll(async () => {
        const client = new DatanestClient();
        const [newProject, sharedAppGroups] = await Promise.all([
            projectPurger.createTestProject(client, {
                project_name: 'My project',
                project_client: 'My client',
                address_country: 'GB',
                project_address: '123 Fake Street',
                project_type: projects.ProjectType.PROJECT_TYPE_STANDARD,
            }),
            gather.listSharedAppGroups(client),
        ]);
        projectUuid = newProject.project.uuid;

        await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        // We need to get the imported app's UUID
        // We cannot use a master app UUID, in another project
        const apps = await gather.listProjectApps(client, projectUuid);

        const newItem = await gather.createGatherItem(client, projectUuid, apps.apps[0].uuid, {
            title: "Past Item",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value"
            },
            _meta: {
                created_at: pastDate,
                updated_at: pastDate,
            }
        });
        expect(newItem.created_at.split('.')[0] + 'Z', 'created_at should be the past date, and format should match').equals(pastDate);
    }, 30_000);
    afterAll(async () => {
        await projectPurger.cleanup();
    });

    it('GET v1/projects/:project_uuid/apps - List apps', async () => {
        const client = new DatanestClient();
        const projectAppList = await gather.listProjectApps(client, projectUuid);

        expect(projectAppList.apps).is.an('array');

        if (projectAppList.apps.length) {
            appUuid = projectAppList.apps[0].uuid;
            expect(projectAppList.apps[0].uuid).is.a('string');
            expect(projectAppList.apps[0].title).is.a('string');
            expect(projectAppList.apps[0].system_reference).is.a('string');
        }
    });

    it.concurrent('GET v1/projects/:project_uuid/apps/:app_id - List apps\' items', async () => {
        const client = new DatanestClient();
        expect(appUuid).is.a('string', 'appUuid is not set unable to perform this test');
        const paginatedItems = await gather.listProjectAppItems(client, projectUuid, appUuid);

        expect(paginatedItems.data).is.an('array');

        if (paginatedItems.data.length) {
            expect(paginatedItems.data[0].id).is.a('number');
            itemId = paginatedItems.data[0].id;
            expect(paginatedItems.data[0].title).is.a('string');
            expect(paginatedItems.data[0].app_uuid).equals(appUuid);
        }
    });

    it('GET v1/projects/:project_uuid/items/:item_id - Get Item details', async () => {
        const client = new DatanestClient();
        expect(itemId).is.a('number', 'itemId is not set unable to perform this test');
        const itemWithDetails = await gather.getProjectItemDetails(client, projectUuid, itemId);

        expect(itemWithDetails.id).equals(itemId);
        expect(itemWithDetails.app_uuid).equals(appUuid);
        expect(itemWithDetails.title).is.a('string');
    });

    it.concurrent('GET v1/apps/:app_uuid/schema - Get App Schema (structure of the app form)', async () => {
        const client = new DatanestClient();
        expect(appUuid).is.a('string', 'appUuid is not set unable to perform this test');
        const appSchema = await gather.getAppSchema(client, appUuid);

        expect(appSchema.uuid).equals(appUuid);
        expect(appSchema.title).is.a('string');
    });

    it.concurrent('Can list and import shared app group', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client);

        expect(sharedAppGroups.data).is.an('array');
        expect(sharedAppGroups.data[0].share_group).is.a('string');
        expect(sharedAppGroups.data[0].group_title).is.a('string');

        const importedData = await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        expect(importedData.apps).is.an('array');
        expect(importedData.apps[0].uuid).is.a('string');
        expect(importedData.apps[0].title).is.a('string');
        expect(importedData.data_events).is.an('array');
        expect(importedData.documents).is.an('array');
    });

    it.concurrent('Can create, edit and delete Gather Items', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client);

        await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        // We need to get the imported app's UUID
        // We cannot use a master app UUID, in another project
        const apps = await gather.listProjectApps(client, projectUuid);

        const currentDate = new Date().toISOString().split('.')[0] + 'Z';

        const itemDetails = await gather.createGatherItem(client, projectUuid, apps.apps[0].uuid, {
            title: "New Item",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value"
            },
        });

        expect(itemDetails.id).is.a('number');
        expect(itemDetails.title).equals("New Item");
        expect(itemDetails.skipped_sections[0]).equals("some_nonsense_section");
        expect(itemDetails.skipped_fields).is.an('array');

        const updatedItemDetails = await gather.updateGatherItem(client, projectUuid, itemDetails.id, {
            title: "Test Gather Item Updated",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value updated"
            }
        });

        expect(updatedItemDetails.id).equals(itemDetails.id);
        expect(updatedItemDetails.title).equals("Test Gather Item Updated");
        expect(updatedItemDetails.skipped_sections[0]).equals("some_nonsense_section");
        expect(updatedItemDetails.skipped_fields).is.an('array');

        const todaysDateYMD = currentDate.slice(0, 10);

        const [noFilter, pastItems, todaysItems, updatedTodayItems] = await Promise.all([
            gather.listProjectAppItems(client, projectUuid, appUuid, 1),
            gather.listProjectAppItems(client, projectUuid, appUuid, 1, {
                created_from: pastDate,
                created_to: todaysDateYMD,
            }),
            gather.listProjectAppItems(client, projectUuid, appUuid, 1, {
                created_from: todaysDateYMD,
                created_to: todaysDateYMD + 'T23:59:59Z',
            }),
            gather.listProjectAppItems(client, projectUuid, appUuid, 1, {
                updated_from: todaysDateYMD,
            }),
        ]);

        expect(noFilter.data.length).equals(2);
        expect(pastItems.data.length).equals(1);
        expect(todaysItems.data.length).equals(1);
        expect(updatedTodayItems.data.length).equals(1);

        await gather.deleteItem(client, projectUuid, itemDetails.id);
    });

    it.concurrent('Can filter items by bounding box', async () => {
        const mapsProjectUuid = process.env.MAPS_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || projectUuid;
        const client = new DatanestClient();
        const allProjectItems = await listProjectItems(client, mapsProjectUuid);
        let minLat = 90;
        let maxLat = -90;
        let minLon = 180;
        let maxLon = -180;
        for (let item of allProjectItems.data) {
            if (item.latitude && item.longitude) {
                minLat = Math.min(minLat, item.latitude);
                maxLat = Math.max(maxLat, item.latitude);
                minLon = Math.min(minLon, item.longitude);
                maxLon = Math.max(maxLon, item.longitude);
            }
        }

        const bboxItems = await listProjectItems(client, mapsProjectUuid, 1, {
            bbox: [minLon, minLat, maxLon, maxLat / 2]
        });
        expect(bboxItems.data).is.an('array');
        expect(bboxItems.meta.total).is.lessThan(allProjectItems.meta.total);
        if (bboxItems.data.length === 0) {
            console.warn('Warning: No items found in the bounding box, unable to verify bbox filter worked');
        }
    });

    it.concurrent('Ensure Share Groups imported Apps match the share group list', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client, 1, 'global');

        expect(sharedAppGroups.data.length).is.greaterThan(0, 'No global share groups found, unable to verify share group list');

        const shareGroup = sharedAppGroups.data[0];
        expect(shareGroup.share_group).is.a('string');
        expect(shareGroup.group_title).is.a('string');
        expect(shareGroup.apps).is.an('array');
        expect(shareGroup.apps.length).is.greaterThan(0, 'there should always be at least one app in a share group');

        const newProject = await projectPurger.createTestProject(client, {
            project_name: 'My project',
            project_client: 'My client',
            address_country: 'GB',
            project_address: '123 Fake Street',
        });
        shareGroupProjectUuid = newProject.project.uuid;
        const importResult = await gather.importAppGroup(client, newProject.project.uuid, sharedAppGroups.data[0].share_group);
        expect(importResult.apps).is.an('array');
        expect(importResult.apps.length).equals(shareGroup.apps.length);

        const importedApps = await gather.listProjectApps(client, newProject.project.uuid);
        expect(importedApps.apps).is.an('array');
        expect(importedApps.apps.length).equals(shareGroup.apps.length);
        for (let app of importedApps.apps) {
            const matchingApp = shareGroup.apps.find(a => a.uuid === app.cloned_from_uuid);
            expect(matchingApp).is.not.undefined;
            if (!matchingApp) {
                return;
            }
            expect(app.title).equals(matchingApp.title);
            expect(app.system_reference).equals(matchingApp.system_reference);
        }
    });

} else {
    it('Skipping gather integration tests', () => { });
    console.warn('[WARN] Skipping gather integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}