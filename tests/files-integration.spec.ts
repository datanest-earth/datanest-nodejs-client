import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { deleteFile, getProjectFile, getProjectFiles, getRecentNotifications, uploadFile } from '../src/files';
import { readFileSync, unlink, unlinkSync, writeFileSync } from 'fs';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    it.concurrent('GET project files, if there is a file check you can get the project link', async () => {
        const client = new DatanestClient();
        const fileProjectUuid = process.env.FILE_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const files = await getProjectFiles(client, fileProjectUuid);

        expect(files.data).is.an('array');
        if (!files.data.length) {
            console.warn('No files found, skipping test');
            return;
        }
        expect(files.data[0].uuid).is.a('string');
        expect(files.data[0].display_name).is.a('string');
        expect(files.data[0].path).is.a('string');

        const file = await getProjectFile(client, fileProjectUuid, files.data[0].uuid);
        expect(file.uuid).is.a('string');
        expect(file.temporary_url).is.a('string');

        expect(file.display_name).is.a('string');
        expect(file.path).is.a('string');
        expect(file.size_mb).is.a('number');
        expect(file.version).is.a('number');
        expect(file.is_final).is.a('boolean');
        expect(file.virus_status).is.a('number');
        expect(file.review_status).is.a('number');
    });

    it.concurrent('Can upload a blob to a project', async () => {
        const fileProjectUuid = process.env.FILE_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const client = new DatanestClient();

        const file = await uploadFile(client, fileProjectUuid, 'API Upload', 'test.txt', new Blob(['Hello, World!']));
        expect(file.uuid).is.a('string');
        expect(file.display_name).toBe('test.txt');
        expect(file.path).toBe('API Upload');
        expect(file.size_mb).toBeLessThan(0.01);

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('Hello, World!');

        // Cleanup
        await deleteFile(client, fileProjectUuid, file.uuid)
    });

    it.concurrent('Can upload a local file with fs readFileSync api and create a export download notification', async () => {
        const fileProjectUuid = process.env.FILE_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const client = new DatanestClient();

        writeFileSync('./test-with-notification.txt', 'Hello, World 2');
        const file = await uploadFile(client, fileProjectUuid, 'API Upload', 'test-with-notification.txt', readFileSync('./test-with-notification.txt'), { create_notification: true });
        unlinkSync('./test-with-notification.txt');
        expect(file.uuid).is.a('string');
        expect(file.display_name).toBe('test-with-notification.txt');
        expect(file.path).toBe('API Upload');
        expect(file.size_mb).toBeLessThan(0.01);

        const notifications = await getRecentNotifications(client, file.project_uuid);
        const fileNotification = notifications.data.find(n => n.file_uuid === file.uuid);
        expect(fileNotification).is.an('object');
        expect(fileNotification!.file).is.an('object');
        expect(fileNotification!.file!.uuid).toBe(file.uuid);
        expect(fileNotification!.file!.display_name).toBe('test-with-notification.txt');

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('Hello, World 2');

        await deleteFile(client, fileProjectUuid, file.uuid);

        const notifications2 = await getRecentNotifications(client, file.project_uuid);
        const fileNotification2 = notifications2.data.find(n => n.file_uuid === file.uuid);
        expect(fileNotification2).toBe(undefined);
    });

    it.concurrent('Can upload a string as a file', async () => {
        const fileProjectUuid = process.env.FILE_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const client = new DatanestClient();

        const file = await uploadFile(client, fileProjectUuid, 'API Upload', 'test-string-upload.txt', 'My content as a string', { create_notification: true });
        expect(file.uuid).is.a('string');
        expect(file.display_name).toBe('test-string-upload.txt');
        expect(file.path).toBe('API Upload');
        expect(file.size_mb).toBeLessThan(0.01);

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('My content as a string');

        await deleteFile(client, fileProjectUuid, file.uuid);
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}