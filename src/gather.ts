import DatanestClient, { DatanestResponseError, PaginatedResponse, Timestamp, UUID } from "./index";

export type App = {
    uuid: UUID;
    project_uuid: UUID;
    cloned_from_uuid: UUID;
    /**
     * Unique group identifier for imported shared app
     */
    shared_from_group: string | null;
    title: string;

    /**
     * System reference slug of the app's title
     */
    system_reference: string;

    /**
     * New item title prefix
     */
    prefix: null | string;
    description: string;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
};

export type Item = {
    id: number;
    project_uuid: UUID;
    app_uuid: UUID;
    latitude: null | number;
    longitude: null | number;
    title: string;
    lab_title?: string | null;
    enviro_start_depth: null | number;
    enviro_end_depth: null | number;
    enviro_soil_description: null | string;
    enviro_lab_sample_type: null | string;
    enviro_sampled_date: null | string;
    enviro_analyzed_date: null | string;
    enviro_duplicate_of_id: null | number;
    enviro_triplicate_of_id: null | number;
    enviro_composite_of: null | string;
    enviro_matrix: null | string;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
};

export type ItemWithDetails = Item & Record<string, any | any[]>;

export type ItemUpdatableData = {
    title?: string;
    lab_title?: string | null;
    original_title?: string | null;
    latitude?: null | number;
    longitude?: null | number;
}

export type Document = {
    id: number;
    project_uuid: UUID;
    /**
     * User who created the Document
     */
    creator_uuid: UUID;
    name: string;
    type: 'word' | 'excel';
    status: number;
    status_updated_at: string | null;
    has_been_exported: boolean;
    next_export_number: number;
    /**
     * Template file UUID
     */
    file_uuid: UUID;
    /**
     * Template file name
     */
    file_name: string;
    errors: {
        [key: number]: {
            message?: string,
            command?: string,
        };
    } | null;
};

export type DataEvent = {
    id: number;
    project_uuid: UUID;
    label: string;
    is_enabled: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
};

/**
 * List apps in project with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjectApps(client: DatanestClient, projectUuid: UUID) {
    const response = await client.get('v1/projects/' + projectUuid + "/apps");

    const data = await response.json();
    return data as { apps: App[] };
}

type ProjectItemsOptions = {
    /**
     * Filter items by master App UUID.
     * This can be the UUID of a master App or a UUID of a shared App.
     */
    template_app_uuid?: UUID;
};

/**
 * List items of all kinds in project with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjectItems(client: DatanestClient, projectUuid: UUID, page = 1, options: ProjectItemsOptions = {}) {
    const response = await client.get('v1/projects/' + projectUuid + "/items", { page, ...options });

    const data = await response.json();
    return data as PaginatedResponse<Item>;
}

/**
 * Get an item's detailed data
 * @param client Datanest REST API Client
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function getProjectItemDetails(client: DatanestClient, projectUuid: UUID, itemId: number) {
    const response = await client.get('v1/projects/' + projectUuid + "/items/" + itemId);

    const data = await response.json();
    return data as ItemWithDetails;
}


/**
 * List specific app's items in project with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjectAppItems(client: DatanestClient, projectUuid: UUID, appUuid: UUID, page = 1) {
    const response = await client.get('v1/projects/' + projectUuid + "/apps/" + appUuid + '/items', { page });

    const data = await response.json();
    return data as PaginatedResponse<Item>;
}

/**
 * The app's schema describes the app's form structure of fields and sections.
 * @param client 
 * @param projectUuid 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function getAppSchema(client: DatanestClient, appUuid: string) {
    const response = await client.get('v1/apps/' + appUuid + '/schema');

    const data = await response.json();
    return data as App;
}

/**
 * List shared app groups, app groups can include multiple Apps, Data Events and Auto Docs
 * @param client
 * @param page
 * @returns 
 */
export async function listSharedAppGroups(client: DatanestClient, page = 1) {
    const response = await client.get('v1/apps/share-groups', { page });

    const data = await response.json();
    return data as PaginatedResponse<{
        /**
         * Unique group identifier for shared app group, used for importing
         */
        share_group: string;
        group_title: string;
        /**
         * Scope of the shared app group
         */
        shareable_type: string;
        group_description: string | null;
        /**
         * Group icon URL as a temporary S3 URL
         */
        icon_url: string;

        apps: App[];
        documents: Document[];
        data_events: DataEvent[];
    }>;
}

/**
 * Import shared app group, with its accompanying Apps, Data Events and Auto Docs
 * @param client
 * @param projectUuid
 * @param shareGroup
 * @returns 
 */
export async function importAppGroup(client: DatanestClient, projectUuid: UUID, shareGroup: string) {
    const response = await client.post('v1/projects/' + projectUuid + '/apps/import-share-group', {
        share_group: shareGroup,
    });

    return await response.json() as {
        apps: App[];
        documents: Document[];
        data_events: DataEvent[];
    }
}

export type ItemUpdateMeta = {
    /**
     * List of skipped section keys that were not found in the app.
     */
    skipped_sections: string[];
    /**
     * List of skipped field keys that were not found in the app.
     */
    skipped_fields: string[];
};

/**
 * Create an Item with Gather Sections and Fields
 * @param client 
 * @param projectUuid 
 * @param appUuid 
 * @param data 
 * @returns 
 */
export async function createGatherItem(client: DatanestClient, projectUuid: UUID, appUuid: UUID, data: ItemUpdatableData & Record<string, any>) {
    data.app_uuid = appUuid;
    const response = await client.post('v1/projects/' + projectUuid + '/items', data);

    const responseData = await response.json();
    return responseData as ItemWithDetails & ItemUpdateMeta;
}

/**
 * Update an Item with Gather Sections and Fields
 * @param client 
 * @param projectUuid 
 * @param itemId 
 * @param data 
 * @returns 
 */
export async function updateGatherItem(client: DatanestClient, projectUuid: UUID, itemId: number, data: ItemUpdatableData & Record<string, any>) {
    const response = await client.patch('v1/projects/' + projectUuid + '/items/' + itemId, data);

    const responseData = await response.json();
    return responseData as ItemWithDetails & ItemUpdateMeta;
}

/**
 * Delete a Gather Item
 * @param client 
 * @param projectUuid 
 * @param itemId 
 * @returns 
 */
export async function deleteItem(client: DatanestClient, projectUuid: UUID, itemId: number) {
    const response = await client.delete('v1/projects/' + projectUuid + '/items/' + itemId);

    await response.json();
    return true;
}
