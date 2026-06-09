import { it, expect } from 'bun:test';
import DatanestClient from '../src';
import { deleteFile, getProjectFile, getProjectFileHistory, getProjectFiles, getProjectFileVersionUrl, getRecentNotifications, uploadFile } from '../src/files';
import { readFileSync, unlinkSync, writeFileSync } from 'fs';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    const fileProjectUuid = process.env.FILE_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
    const filesToCleanup: string[] = [];
    it.concurrent('GET project files, if there is a file check you can get the project link', async () => {
        const client = new DatanestClient();
        const files = await getProjectFiles(client, fileProjectUuid);

        expect(Array.isArray(files.data)).toBe(true);
        if (!files.data.length) {
            console.warn('No files found, skipping test');
            return;
        }
        expect(typeof files.data[0].uuid).toBe('string');
        expect(typeof files.data[0].display_name).toBe('string');
        expect(typeof files.data[0].path).toBe('string');

        const file = await getProjectFile(client, fileProjectUuid, files.data[0].uuid);
        expect(typeof file.uuid).toBe('string');
        expect(typeof file.temporary_url).toBe('string');

        expect(typeof file.display_name).toBe('string');
        expect(typeof file.path).toBe('string');
        expect(typeof file.size_mb).toBe('number');
        expect(typeof file.version).toBe('number');
        expect(typeof file.is_final).toBe('boolean');
        expect(typeof file.virus_status).toBe('number');
        expect(typeof file.review_status).toBe('number');
    });

    it.concurrent('Can upload a blob to a project', async () => {
        const client = new DatanestClient();

        const file = await uploadFile(client, fileProjectUuid, 'API Upload', 'test.txt', new Blob(['Hello, World!']));
        expect(typeof file.uuid).toBe('string');
        expect(file.display_name).toBe('test.txt');
        expect(file.path).toBe('API Upload');
        expect(file.size_mb).toBeLessThan(0.01);

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('Hello, World!');

        filesToCleanup.push(file.uuid);
    });

    it.concurrent('Can upload a local file with fs readFileSync api and create a export download notification', async () => {
        const client = new DatanestClient();

        writeFileSync('./test-with-notification.txt', 'Hello, World 2');
        const file = await uploadFile(client, fileProjectUuid, 'API Upload/Notification', 'test-with-notification.txt', readFileSync('./test-with-notification.txt'), { create_notification: true });
        unlinkSync('./test-with-notification.txt');
        expect(typeof file.uuid).toBe('string');
        expect(file.display_name).toBe('test-with-notification.txt');
        expect(file.path).toBe('API Upload/Notification');
        expect(file.size_mb).toBeLessThan(0.01);

        const notifications = await getRecentNotifications(client, file.project_uuid);
        const fileNotification = notifications.data.find(n => n.file_uuid === file.uuid);
        expect(fileNotification).toEqual(expect.any(Object));
        expect(fileNotification!.file).toEqual(expect.any(Object));
        expect(fileNotification!.file!.uuid).toBe(file.uuid);
        expect(fileNotification!.file!.display_name).toBe('test-with-notification.txt');

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('Hello, World 2');

        await deleteFile(client, fileProjectUuid, file.uuid);

        const notifications2 = await getRecentNotifications(client, file.project_uuid);
        const fileNotification2 = notifications2.data.find(n => n.file_uuid === file.uuid);
        expect(fileNotification2).toBeUndefined();
    });

    it.concurrent('Can upload a string as a file', async () => {
        const client = new DatanestClient();
        const file = await uploadFile(client, fileProjectUuid, 'API Upload/String/', 'test-string-upload.txt', 'My content as a string', { create_notification: true });
        expect(typeof file.uuid).toBe('string');
        expect(file.display_name).toBe('test-string-upload.txt');
        expect(file.path).toBe('API Upload/String'); // trims trailing slash
        expect(file.size_mb).toBeLessThan(0.01);

        const downloadedContents = await (await fetch(file.temporary_url!)).text();
        expect(downloadedContents).toBe('My content as a string');

        filesToCleanup.push(file.uuid);
    });

    it.concurrent('Version control', async () => {
        const uniqueFileName = 'multiple-versions-' + Math.random().toString(36).substring(7) + '.txt';
        const client = new DatanestClient();

        const file = await uploadFile(client, fileProjectUuid, 'API Upload/Versions', uniqueFileName, 'Version 1');
        expect(typeof file.uuid).toBe('string');
        expect(file.version).toBe(1);
        expect(file.display_name).toBe(uniqueFileName);
        expect(file.path).toBe('API Upload/Versions');
        expect(file.size_mb).toBeLessThan(0.01);

        const fileV2 = await uploadFile(client, fileProjectUuid, 'API Upload/Versions', uniqueFileName, 'Version 2');
        expect(fileV2.uuid).toBe(file.uuid);
        expect(fileV2.version).toBe(2);
        expect(fileV2.display_name).toBe(uniqueFileName);
        expect(fileV2.path).toBe('API Upload/Versions');

        const fileV3 = await uploadFile(client, fileProjectUuid, 'API Upload/Versions', uniqueFileName, 'Version 3');
        expect(fileV3.uuid).toBe(file.uuid);
        expect(fileV3.version).toBe(3);
        expect(fileV3.display_name).toBe(uniqueFileName);
        expect(fileV3.path).toBe('API Upload/Versions');

        const versions = await getProjectFileHistory(client, fileProjectUuid, file.uuid);
        expect(Array.isArray(versions.previous_versions)).toBe(true);
        expect(versions.previous_versions.length).toBe(2);

        const version1 = versions.previous_versions.find(v => v.version === 1);
        expect(version1).toEqual(expect.any(Object));
        expect(version1!.file_uuid).toBe(file.uuid);
        expect(version1).not.toHaveProperty('temporary_url');

        const version2 = versions.previous_versions.find(v => v.version === 2);
        expect(version2).toEqual(expect.any(Object));
        expect(version2!.file_uuid).toBe(file.uuid);
        expect(version2).not.toHaveProperty('temporary_url');

        const version1Download = await getProjectFileVersionUrl(client, fileProjectUuid, file.uuid, 1);
        expect(version1Download.version).toBe(1);
        expect(typeof version1Download.temporary_url).toBe('string');

        const version2Download = await getProjectFileVersionUrl(client, fileProjectUuid, file.uuid, version2!.id);
        expect(version2Download.version).toBe(2);
        expect(typeof version2Download.temporary_url).toBe('string');

        filesToCleanup.push(file.uuid);
    });

    it('Can filter files by path', async () => {
        const client = new DatanestClient();

        const files = await getProjectFiles(client, fileProjectUuid, 1, { path: 'API Upload/Versions/' });
        expect(Array.isArray(files.data)).toBe(true);
        expect(files.data.length).toBeGreaterThan(0);
        expect(files.data.every(f => f.path.startsWith('API Upload/Versions'))).toBe(true);
    });

    it('deletes file', async () => {
        const client = new DatanestClient();
        for (const fileUuid of filesToCleanup) {
            await deleteFile(client, fileProjectUuid, fileUuid);
        }
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}