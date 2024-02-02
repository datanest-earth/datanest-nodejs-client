import DatanestClient, { PaginatedResponse, Timestamp, UUID } from "./index";

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
    size_mb: null | number;
    version: number;
    is_final: boolean;
    virus_status: VirusStatus;
    review_status: ReviewStatus;
    review_comments: string | null;
    formatter_comments: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
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
    const response = await client.get('v1/projects/' + projectUuid + '/files');

    const data = await response.json();
    return data as File & {
        /**
         * Temporary URL to download the file
         * This maybe undefined if the VirusStatus is FAILED.
         */
        temporary_url?: string
    };
}
