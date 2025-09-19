import dotenv from 'dotenv';
import { assert, expect, it } from 'vitest';
import DatanestClient, { PaginatedResponse } from '../src';
import { listProjects, patchProject, Project, ProjectType } from '../src/projects';
import { projectPurger } from './project-cleanup';
import { getCompanyUsers } from '../src/users';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    it.concurrent('Ordered query params', async () => {
        const client = new DatanestClient();
        const responses = await Promise.all([client.get('v1/projects', { order: 'test', page: '1' }), client.get('v1/projects', { page: '1', order: 'test' })]);

        expect(responses[0].status).equals(200);
        expect(responses[1].status).equals(200);
    });

    it.concurrent('GET v1/projects - List projects', async () => {
        const client = new DatanestClient();
        const responses = await Promise.all([client.get('v1/projects'), client.get('v1/projects?page=2')]);

        expect(responses[0].status).equals(200);

        const [data, dataPage2] = await Promise.all([responses[0].json(), await responses[1].json()]);

        expect(data.data).is.an('array');
        expect(data.meta.last_page).is.a('number');
        expect(data.meta.current_page).equals(1);
        expect(data.meta.per_page).is.a('number');
        expect(data.meta.total).is.a('number');

        expect(dataPage2.meta.current_page).equals(2);
    });

    it.concurrent('Create, get, patch and archive, restore and re-archive', async () => {
        // Create 2 projects of each type
        // Check the GET and GET list endpoints
        // Patch the first project's name
        // Archive, GET again with 404 case, and with allow-archived option
        // Restore, and clean up by archiving again.

        const client = new DatanestClient();
        const firstProject = await projectPurger.createTestProject(client, {
            project_name: 'First project',
            project_client: 'My client',
            address_country: 'GB',
            project_type: ProjectType.PROJECT_TYPE_STANDARD,
        });

        const enviroProject = await projectPurger.createTestProject(client, {
            project_name: 'Latest project',
            project_client: 'My client',
            address_country: 'GB',
            project_type: ProjectType.PROJECT_TYPE_ENVIRO,
        });

        const data = firstProject;
        const enviroCreateResponseData = enviroProject;

        expect(data.project_link).is.a('string');
        expect(data.project.uuid).is.a('string');
        expect(data.project.project_type).toBe(ProjectType.PROJECT_TYPE_STANDARD);
        expect(enviroCreateResponseData.project.project_type).toBe(ProjectType.PROJECT_TYPE_ENVIRO);

        const [responseGetLatest, responseGet] = await Promise.all([
            client.get('v1/projects', { latest: true }),
            client.get('v1/projects/' + data.project.uuid),
        ]);

        expect(responseGet.status).equals(200);
        expect(responseGetLatest.status).equals(200);

        const dataGetLatest = await responseGetLatest.json();
        // check that Latest project comes first
        for (let i = 0; i < dataGetLatest.data.length; i++) {
            if (dataGetLatest.data[i].uuid === enviroCreateResponseData.project.uuid) {
                break;
            }
            if (dataGetLatest.data[i].uuid === data.project.uuid) {
                expect.fail('First project should not be in the latest list');
            }
        }

        expect(responseGet.status).equals(200);

        const dataGet = await responseGet.json();
        expect(data).toEqual(dataGet);

        const responsePatch = await client.patch('v1/projects/' + data.project.uuid, {
            project_name: 'My project 2',
        });

        expect(responsePatch.status).equals(200);
        const dataPatch = await responsePatch.json();
        expect(dataPatch.project.project_number).equals(dataGet.project.project_number);
        expect(dataPatch.project.project_name).equals('My project 2');

        // Expect only the project_name and updated_at should have changed
        dataGet.project.project_name = 'My project 2';
        dataGet.project.updated_at = dataPatch.project.updated_at;
        expect(dataPatch).toEqual(dataGet);

        const responseDelete = await client.delete('v1/projects/' + data.project.uuid + "/archive");
        client.delete('v1/projects/' + enviroCreateResponseData.project.uuid + "/archive")
        expect(responseDelete.status).equals(200);

        const latestWithoutArchive = await client.get('v1/projects', { latest: true });
        const latestWithoutArchiveData = await latestWithoutArchive.json() as PaginatedResponse<Project>;

        // Archived project 2 should not be found.
        expect(latestWithoutArchiveData.data.splice(-2).some(d => d.project_name === 'My project 2')).toBe(false);

        try {
            await client.get('v1/projects/' + data.project.uuid);
            expect.fail('Should have thrown 404');
        } catch (e: any) {
            expect(e.status).equals(404);
        }
        await client.get('v1/projects/' + data.project.uuid, { 'allow-archived': true });

        const responseRestore = await client.post('v1/projects/' + data.project.uuid + "/restore");
        expect(responseRestore.status).equals(200);

        await client.delete('v1/projects/' + data.project.uuid + "/archive");
    });

    it.concurrent('supports additional fields', async () => {
        const client = new DatanestClient();
        const [createdWithout, createWith] = await Promise.all([
            projectPurger.createTestProject(client, {
                project_name: 'Project with Additional Fields',
                project_client: 'My client',
                address_country: 'NZ',
            }),
            projectPurger.createTestProject(client, {
                project_name: 'Project with Additional Fields',
                project_client: 'My client',
                address_country: 'NZ',
                additional: {
                    my_additional_field: 'test',
                    my_reference: 123,
                },
            }),
        ]);

        expect(createdWithout.project.additional).equals(null);
        expect(createWith.project.additional).is.an('object');
        expect(createWith.project.additional?.my_additional_field).equals('test');
        expect(createWith.project.additional?.my_reference).equals(123);

        const updatedProject = await patchProject(client, createWith.project.uuid, {
            additional: {
                added_after_creation: 'yes',
                my_reference: null,
            },
        });

        expect(updatedProject.project.additional).is.an('object');
        expect(updatedProject.project.additional?.added_after_creation).equals('yes', 'New field should be added');
        expect(updatedProject.project.additional?.my_additional_field).equals('test', 'Old field should be retained');
        expect(updatedProject.project.additional?.my_reference).equals(undefined, 'Fields are completely removed with null');
    });

    it.concurrent('can search and filter projects', async () => {
        const hash = Math.random().toString(36).substring(7);
        const client = new DatanestClient();
        const newProject = await projectPurger.createTestProject(client, {
            project_number: 'test:' + hash,
            project_name: 'Name ' + hash,
            project_client: 'Client ' + hash,
            address_country: 'NZ',
        });

        const [
            searchByNumber,
            searchByUuid,
            searchByClient,
            notFound,
        ] = await Promise.all([
            listProjects(client, 1, false, { search: 'test:' + hash }),
            listProjects(client, 1, false, { search: newProject.project.uuid }),
            listProjects(client, 1, false, { search: 'Client ' + hash }),
            listProjects(client, 1, false, { search: 'Not Found ABC12345' }),
        ]);

        expect(searchByNumber.data.find(p => p.uuid === newProject.project.uuid)).is.not.undefined;
        expect(searchByUuid.data.find(p => p.uuid === newProject.project.uuid)).is.not.undefined;
        expect(searchByClient.data.find(p => p.uuid === newProject.project.uuid)).is.not.undefined;
        expect(notFound.data.length).equals(0);
    });

    it.concurrent('can set timezone on creation', async () => {
        const client = new DatanestClient();

        // Default based on country
        const project = await Promise.all([
            projectPurger.createTestProject(client, {
                project_name: 'Project with Timezone',
                project_client: 'My client',
                address_country: 'NZ',
            }),
            projectPurger.createTestProject(client, {
                project_name: 'Project with Timezone',
                project_client: 'My client',
                address_country: 'GB',
            }),
        ]);

        expect(project[0].project.timezone).equals('Pacific/Auckland');
        expect(project[1].project.timezone).equals('Europe/London');

        const updatedProject = await patchProject(client, project[0].project.uuid, {
            timezone: 'Europe/Paris',
        });
        expect(updatedProject.project.timezone).equals('Europe/Paris');

        const createdWithCustomTimezone = await projectPurger.createTestProject(client, {
            project_name: 'Project with Timezone',
            project_client: 'My client',
            address_country: 'NZ',
            timezone: 'Europe/Paris',
        });
        expect(createdWithCustomTimezone.project.timezone).equals('Europe/Paris');
    });

    it.concurrent('can set project manager by email', async () => {
        const client = new DatanestClient();
        const companyUsers = await getCompanyUsers(client);
        const projectManager = companyUsers.data[Math.floor(Math.random() * companyUsers.data.length - 2) + 1];
        const secondUser = companyUsers.data[0];
        assert(projectManager.uuid !== secondUser.uuid);
        const project = await projectPurger.createTestProject(client, {
            project_name: 'Project with Timezone',
            project_client: 'My client',
            address_country: 'NZ',
            project_manager: projectManager.email,
        });

        expect(project.project.project_manager_uuid).equals(projectManager.uuid);

        const updatedProject = await patchProject(client, project.project.uuid, {
            project_manager: secondUser.email,
        });
        expect(updatedProject.project.project_manager_uuid).equals(secondUser.uuid);
    });
} else {
    it('Skipping project integration tests', () => { });
    console.warn('[WARN] Skipping project integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
