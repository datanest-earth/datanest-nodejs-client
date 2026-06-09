import { beforeAll, expect, it } from 'bun:test';
import DatanestClient, { gather, projects } from '../src';
import { listProjectItems } from '../src/gather';
import { expectGeoJsonPointForItem } from './lib/geojson-assertions';
import { projectPurger } from './project-cleanup';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    let projectUuid = '';
    let appUuid: string;
    let itemId: number;
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString().split('.')[0] + 'Z';
    const geoItemLatitude = -36.8485;
    const geoItemLongitude = 174.7633;

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
        appUuid = apps.apps[0].uuid!;

        const newItem = await gather.createGatherItem(client, projectUuid, appUuid, {
            title: "Past Item",
            latitude: geoItemLatitude,
            longitude: geoItemLongitude,
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value"
            },
            _meta: {
                created_at: pastDate,
                updated_at: pastDate,
            }
        });
        itemId = newItem.id;
        expect(newItem.created_at.split('.')[0] + 'Z').toBe(pastDate);
    }, { timeout: 90000 });

    it('GET v1/projects/:project_uuid/apps - List apps', async () => {
        const client = new DatanestClient();
        const projectAppList = await gather.listProjectApps(client, projectUuid);

        expect(Array.isArray(projectAppList.apps)).toBe(true);

        if (projectAppList.apps.length) {
            appUuid = projectAppList.apps[0].uuid!;
            expect(typeof projectAppList.apps[0].uuid).toBe('string');
            expect(typeof projectAppList.apps[0].title).toBe('string');
            expect(typeof projectAppList.apps[0].system_reference).toBe('string');
        }
    });

    it.concurrent('GET v1/projects/:project_uuid/apps/:app_id - List apps\' items', async () => {
        const client = new DatanestClient();
        expect(typeof appUuid).toBe('string');
        const paginatedItems = await gather.listProjectAppItems(client, projectUuid, appUuid);

        expect(Array.isArray(paginatedItems.data)).toBe(true);

        if (paginatedItems.data.length) {
            expect(typeof paginatedItems.data[0].id).toBe('number');
            expect(typeof paginatedItems.data[0].title).toBe('string');
            expect(paginatedItems.data[0].app_uuid).toBe(appUuid);
        }
    });

    it.concurrent('GET v1/projects/:project_uuid/items - Include GeoJSON when requested', async () => {
        const client = new DatanestClient();
        const paginatedItems = await listProjectItems(client, projectUuid, 1, {
            include_geojson: true,
        });

        expect(Array.isArray(paginatedItems.data)).toBe(true);

        const geoItem = paginatedItems.data.find(item => item.id === itemId);
        expect(geoItem).toBeDefined();
        expectGeoJsonPointForItem(geoItem!);
    });

    it.concurrent('GET v1/projects/:project_uuid/apps/:app_id/items - Include GeoJSON when requested', async () => {
        const client = new DatanestClient();
        expect(typeof appUuid).toBe('string');
        const paginatedItems = await gather.listProjectAppItems(client, projectUuid, appUuid, 1, {
            include_geojson: true,
        });

        expect(Array.isArray(paginatedItems.data)).toBe(true);

        const geoItem = paginatedItems.data.find(item => item.id === itemId);
        expect(geoItem).toBeDefined();
        expectGeoJsonPointForItem(geoItem!);
    });

    it('GET v1/projects/:project_uuid/items/:item_id - Get Item details', async () => {
        const client = new DatanestClient();
        expect(typeof itemId).toBe('number');
        const itemWithDetails = await gather.getProjectItemDetails(client, projectUuid, itemId);

        expect(itemWithDetails.id).toBe(itemId);
        expect(itemWithDetails.app_uuid).toBe(appUuid);
        expect(typeof itemWithDetails.title).toBe('string');
    });

    it.concurrent('GET v1/apps/:app_uuid/schema - Get App Schema (structure of the app form)', async () => {
        const client = new DatanestClient();
        expect(typeof appUuid).toBe('string');
        const appSchema = await gather.getAppSchema(client, appUuid);

        expect(appSchema.uuid).toBe(appUuid);
        expect(typeof appSchema.title).toBe('string');
    });

    it.concurrent('Can list and import shared app group', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client);

        expect(Array.isArray(sharedAppGroups.data)).toBe(true);
        expect(typeof sharedAppGroups.data[0].share_group).toBe('string');
        expect(typeof sharedAppGroups.data[0].group_title).toBe('string');

        const importedData = await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        expect(Array.isArray(importedData.apps)).toBe(true);
        expect(typeof importedData.apps[0].uuid).toBe('string');
        expect(typeof importedData.apps[0].title).toBe('string');
        expect(Array.isArray(importedData.data_events)).toBe(true);
        expect(Array.isArray(importedData.documents)).toBe(true);
    });

    it.concurrent('Can create, edit and delete Gather Items', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client);

        await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        // We need to get the imported app's UUID
        // We cannot use a master app UUID, in another project
        const apps = await gather.listProjectApps(client, projectUuid);

        const currentDate = new Date().toISOString().split('.')[0] + 'Z';

        const itemDetails = await gather.createGatherItem(client, projectUuid, apps.apps[0].uuid!, {
            title: "New Item",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value"
            },
        });

        expect(typeof itemDetails.id).toBe('number');
        expect(itemDetails.title).toBe("New Item");
        expect(itemDetails.skipped_sections[0]).toBe("some_nonsense_section");
        expect(Array.isArray(itemDetails.skipped_fields)).toBe(true);

        const updatedItemDetails = await gather.updateGatherItem(client, projectUuid, itemDetails.id, {
            title: "Test Gather Item Updated",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value updated"
            }
        });

        expect(updatedItemDetails.id).toBe(itemDetails.id);
        expect(updatedItemDetails.title).toBe("Test Gather Item Updated");
        expect(updatedItemDetails.skipped_sections[0]).toBe("some_nonsense_section");
        expect(Array.isArray(updatedItemDetails.skipped_fields)).toBe(true);

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

        expect(noFilter.data.length).toBe(2);
        expect(pastItems.data.length).toBe(1);
        expect(todaysItems.data.length).toBe(1);
        expect(updatedTodayItems.data.length).toBe(1);

        await gather.deleteItem(client, projectUuid, itemDetails.id);
    }, { timeout: 90000 });

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
        expect(Array.isArray(bboxItems.data)).toBe(true);
        expect(bboxItems.meta.total).toBeLessThan(allProjectItems.meta.total);
        if (bboxItems.data.length === 0) {
            console.warn('Warning: No items found in the bounding box, unable to verify bbox filter worked');
        }
    });

    it.concurrent('Ensure Share Groups imported Apps match the share group list', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client, 1, 'global');

        expect(sharedAppGroups.data.length, 'No global share groups found, unable to verify share group list').toBeGreaterThan(0);

        const shareGroup = sharedAppGroups.data[0];
        expect(typeof shareGroup.share_group).toBe('string');
        expect(typeof shareGroup.group_title).toBe('string');
        expect(Array.isArray(shareGroup.apps)).toBe(true);
        expect(shareGroup.apps.length, 'there should always be at least one app in a share group').toBeGreaterThan(0);

        const newProject = await projectPurger.createTestProject(client, {
            project_name: 'My project',
            project_client: 'My client',
            address_country: 'GB',
            project_address: '123 Fake Street',
        });
        const shareGroupProjectUuid = newProject.project.uuid!;
        const importResult = await gather.importAppGroup(client, shareGroupProjectUuid, sharedAppGroups.data[0].share_group);
        expect(Array.isArray(importResult.apps)).toBe(true);
        expect(importResult.apps.length).toBe(shareGroup.apps.length);

        const importedApps = await gather.listProjectApps(client, shareGroupProjectUuid);
        expect(Array.isArray(importedApps.apps)).toBe(true);
        expect(importedApps.apps.length).toBe(shareGroup.apps.length);
        for (let app of importedApps.apps) {
            const matchingApp = shareGroup.apps.find(a => a.uuid === app.cloned_from_uuid);
            expect(matchingApp).toBeDefined();
            if (!matchingApp) {
                return;
            }
            expect(app.title).toBe(matchingApp.title);
            expect(app.system_reference).toBe(matchingApp.system_reference);
        }
    }, { timeout: 60000 });

} else {
    it('Skipping gather integration tests', () => { });
    console.warn('[WARN] Skipping gather integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}