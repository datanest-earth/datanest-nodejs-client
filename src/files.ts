import DatanestClient, { PaginatedResponse, Timestamp, UUID } from "./index";
import type { File as NodeFile } from "node:buffer";

export enum VirusStatus {
    /**
     * Pending scan
     */
    PENDING = 0,
    /**
     * No virus detected
     */
    PASSED = 1,
    /**
     * Virus detected
     */
    FAILED = 2,
    /**
     * Unable to scan
     */
    UNABLE = 3,
    /**
     * Scan skipped either by trusted internal process or file too large to scan.
     */
    SKIP = 4,
};

export enum ReviewStatus {
    WIP = 0,
    AWAITING_REVIEW = 1,
    REVIEW_PASSED = 2,
    REVIEW_FAILED = 3,
    AWAITING_FORMATTING = 4,
    FORMATTING_FAILED = 5,
    READY = 6,
    SENT = 7,
};

export type File = {
    uuid: UUID;
    project_uuid: UUID;
    display_name: string;
    path: string;
    /** Link to the web interface */
    link?: string;
    /** S3 file download link (expires after 10 minutes) */
    temporary_url?: string;
    size_mb: null | number;
    version: number;
    is_final: boolean;
    /** The file record is awaiting an upload. The file will have an `expires_at` property if upload is not completed in time. */
    is_pending: boolean;
    virus_status: VirusStatus;
    review_status: ReviewStatus;
    review_comments: string | null;
    formatter_comments: string | null;
    /** Used with `is_pending` */
    expires_at: Timestamp | null;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
};

export type FileVersion = {
    id: number;
    file_uuid: UUID;
    version: number;
    size_mb: number;
    created_at: Timestamp;
    deleted_at: Timestamp | null;
};

/**
 * Get project files
 * @param client Datanest REST API Client
 * @param projectUuid UUID of the project
 * @param page Page number
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectFiles(client: DatanestClient, projectUuid: UUID, page: number = 1) {
    const response = await client.get('v1/projects/' + projectUuid + '/files', { page });

    const data = await response.json();
    return data as PaginatedResponse<File>;
}

/**
 * Get a project file
 * @param client Datanest REST API Client
 * @param projectUuid UUID of the project
 * @param fileUuid UUID of the file
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectFile(client: DatanestClient, projectUuid: UUID, fileUuid: UUID) {
    const response = await client.get('v1/projects/' + projectUuid + '/files/' + fileUuid);

    const data = await response.json();
    return data as File & {
        /**
         * Temporary URL to download the file
         * This maybe undefined if the VirusStatus is FAILED.
         */
        temporary_url?: string
    };
}

/**
 * Get a project file with history
 * @param client Datanest REST API Client
 * @param projectUuid UUID of the project
 * @param fileUuid UUID of the file
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectFileHistory(client: DatanestClient, projectUuid: UUID, fileUuid: UUID) {
    const response = await client.get('v1/projects/' + projectUuid + '/files/' + fileUuid + '/history');

    const data = await response.json();
    return data as File & {
        /**
         * Temporary URL to download the file
         * This maybe undefined if the VirusStatus is FAILED.
         */
        temporary_url?: string

        previous_versions: FileVersion[];
    };
}

/**
 * Get project file version download url
 * @param client Datanest REST API Client
 * @param projectUuid UUID of the project
 * @param fileUuid UUID of the file
 * @param version Version number or id
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectFileVersionUrl(client: DatanestClient, projectUuid: UUID, fileUuid: UUID, version: number) {
    const response = await client.get('v1/projects/' + projectUuid + '/files/' + fileUuid + '/history/' + version + '/temporary-url');

    const data = await response.json();
    return data as FileVersion & {
        /**
         * Temporary URL to download the file
         */
        temporary_url: string
    };
}

export async function uploadFile(client: DatanestClient, projectUuid: UUID, path: string, name: string, file: NodeFile | Blob | Buffer | string, options?: { create_notification?: boolean; }): Promise<File> {
    const uploadUrl = await createNewFileUploadUrl(client, projectUuid, path, name, options);

    const response = await fetch(uploadUrl.upload_put_url, {
        method: 'PUT',
        headers: uploadUrl.upload_put_headers,
        body: file,
    } as RequestInit);
    if (!response.ok) {
        throw new Error('Failed to upload file: ' + response.status + ' ' + await response.text());
    }

    return await acceptFile(client, projectUuid, uploadUrl.uuid);
}

export async function createNewFileUploadUrl(client: DatanestClient, projectUuid: UUID, path: string, name: string, options?: { create_notification?: boolean; }) {
    const response = await client.post('v1/projects/' + projectUuid + '/files/upload-url', {
        path,
        name,
        create_notification: options?.create_notification,
    });

    const data = await response.json();
    return data as File & {
        uuid: string;
        /**
         * Temporary URL to upload the file
         * Make a PUT request with the `upload_headers`
         */
        upload_put_url: string;
        upload_put_headers: Record<string, string>;
        accept_post_url: string;
    };
}

export async function acceptFile(client: DatanestClient, projectUuid: UUID, fileUuid: UUID): Promise<File> {
    const response = await client.post('v1/projects/' + projectUuid + '/files/' + fileUuid + '/accept-upload');
    const data = await response.json();
    return data as File;
}

export async function deleteFile(client: DatanestClient, projectUuid: UUID, fileUuid: UUID) {
    await client.delete('v1/projects/' + projectUuid + '/files/' + fileUuid);
}

export async function getRecentNotifications(client: DatanestClient, projectUuid: UUID, page: number = 1) {
    const response = await client.get('v1/projects/' + projectUuid + '/notifications', { page });
    const data = await response.json();
    return data as PaginatedResponse<{
        id: number;
        project_uuid: UUID;
        /** Typically available when status = completed */
        file_uuid: UUID | null;
        type: 'plan'
        | 'parsing'
        | 'xlsx'
        | 'docx'
        | 'zip'
        | 'shapefile'
        | 'photolog'
        | 'image'
        | 'custom-document'
        | 'gather-table'
        | 'proucl-table'
        | 'other'
        | 'ai-document-review'
        | 'leaderboard';
        status: 'queued'
        | 'in_progress'
        | 'completed'
        | 'failed'
        | 'converting';
        /** When `file_id` is not null, otherwise file is not defined. */
        file?: File;
        created_at: Timestamp;
        updated_at: Timestamp;
    }>;
}
