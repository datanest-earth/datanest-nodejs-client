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
