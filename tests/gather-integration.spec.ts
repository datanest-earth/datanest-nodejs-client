import { it, expect, beforeAll } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient, { gather, projects } from '../src';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    let projectUuid = '';
    let appUuid: string;
    let itemId: number;
    beforeAll(async () => {
        const paginatedProjects = await projects.listProjects(new DatanestClient());

        projectUuid = paginatedProjects.data[0].uuid;
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

    it('GET v1/projects/:project_uuid/apps/:app_id - List apps\' items', async () => {
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

    it('GET v1/apps/:app_uuid/schema - Get App Schema (structure of the app form)', async () => {
        const client = new DatanestClient();
        expect(appUuid).is.a('string', 'appUuid is not set unable to perform this test');
        const appSchema = await gather.getAppSchema(client, appUuid);

        expect(appSchema.uuid).equals(appUuid);
        expect(appSchema.title).is.a('string');
    });

    it('Can list and import shared app group', async () => {
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
    }, {
        timeout: 15000,
    });

    it('Can create, edit and delete Gather Items', async () => {
        const client = new DatanestClient();
        const sharedAppGroups = await gather.listSharedAppGroups(client);

        await gather.importAppGroup(client, projectUuid, sharedAppGroups.data[0].share_group);
        // We need to get the imported app's UUID
        // We cannot use a master app UUID, in another project
        const apps = await gather.listProjectApps(client, projectUuid);

        const itemDetails = await gather.createGatherItem(client, projectUuid, apps.apps[0].uuid, {
            title: "Test Gather Item",
            some_nonsense_section: {
                some_nonsense_field: "Some nonsense value"
            }
        });

        expect(itemDetails.id).is.a('number');
        expect(itemDetails.title).equals("Test Gather Item");
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

        await gather.deleteItem(client, projectUuid, itemDetails.id);
    }, { timeout: 15000 })

} else {
    it('Skipping gather integration tests', () => { });
    console.warn('[WARN] Skipping gather integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}