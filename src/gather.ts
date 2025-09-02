import DatanestClient, { DateRangeFilters, PaginatedResponse, Timestamp, UUID } from "./index";
import { BBox, GeoJsonFeature } from "./maps";
import { Project } from "./projects";
import { CompanyWorkflow } from "./workflows";

export type App = {
    uuid?: UUID;
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

    /** @internal used internally by datanest, use of UUID for Public API is recommended. */
    id?: number;
};

export type AppSchema = App & {
    sections: SectionWithFields[];
}

export type Section = {
    id: number;
    template_tab_id: number;
    system_reference: string | null;
    cloned_from_id: number | null;
    label: string;
    is_public_form: boolean;
    is_shown_on_new_page: boolean;
    is_repeatable: boolean;
    is_permanent: boolean;
    order: number;
    is_lab_sample: boolean;
    is_health_safety: boolean;
    is_soil_log: boolean;
    is_site_visit: boolean;
    is_photolog: boolean;
    is_gps_point_metadata: boolean;
    is_number_used_as_title: boolean;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
    primary_field_id: number | null;
    secondary_field_id: number | null;
}

export type SectionWithFields = Section & {
    template_fields: Field[];
}

export const FieldTypes = {
    TEXT: 1,
    NUMBER: 2,
    DATE: 3,
    DROPDOWN: 4,
    CHECKBOX: 5,
    MEDIA: 6,
    DEPTH: 7,
    REFERENCE: 8,
    SIGNATURE: 9,
    CAPTION: 10,
    EXPRESSION: 11,
    DOCUMENT: 12,
    DUPLICATE: 13,
    TRIPLICATE: 14,
    DRAWING: 15,
    LITHOLOGY: 16,
    ADDRESS: 17,
    USER: 18,
    LAB_ID: 19,
    COPY_DATA_LINK: 20,
    AI_PROMPT: 21,
    FIELD_SPLITTER: 22,
} as const;

export type FieldTypeId = typeof FieldTypes[keyof typeof FieldTypes];

export const FieldTypeNames: Record<FieldTypeId, string> = {
    [FieldTypes.TEXT]: 'Text',
    [FieldTypes.NUMBER]: 'Number',
    [FieldTypes.DATE]: 'Date',
    [FieldTypes.DROPDOWN]: 'Choice / Dropdown',
    [FieldTypes.CHECKBOX]: 'Checkbox',
    [FieldTypes.MEDIA]: 'Media',
    [FieldTypes.DEPTH]: 'Depth',
    [FieldTypes.REFERENCE]: 'Link another App\'s Item',
    [FieldTypes.SIGNATURE]: 'Signature',
    [FieldTypes.CAPTION]: 'Caption',
    [FieldTypes.EXPRESSION]: 'Expression',
    [FieldTypes.DOCUMENT]: 'Document',
    [FieldTypes.DUPLICATE]: 'Duplicate',
    [FieldTypes.TRIPLICATE]: 'Triplicate',
    [FieldTypes.DRAWING]: 'Drawing',
    [FieldTypes.LITHOLOGY]: 'Lithology',
    [FieldTypes.ADDRESS]: 'Address',
    [FieldTypes.USER]: 'User',
    [FieldTypes.LAB_ID]: 'Lab ID',
    [FieldTypes.COPY_DATA_LINK]: 'Copy Data Link',
    [FieldTypes.AI_PROMPT]: 'AI Prompt',
    [FieldTypes.FIELD_SPLITTER]: 'Field Splitter',
}

/**
 * Not all options are supported by certain field types.
 * It is recommended to build the options via the App Editor UI and ask for a JSON export.
 */
export type FieldOptions = {
    default?: string;
    defaults?: any[];
    conditions?: any[];
    [key: string]: any;
};

export type Field = {
    id: number;
    template_section_id: number;
    field_type_id: FieldTypeId;
    system_reference: string | null;
    cloned_from_id: number | null;
    label: string;
    is_required: boolean;
    is_permanent: number;
    options: FieldOptions | null;
    order: number;
    width: number;
    c_template_field_id: number | null;
    c_input_value: any;
    created_at: Timestamp;
    updated_at: Timestamp;
    deleted_at: Timestamp | null;
}

export type Item = {
    id: number;
    project_uuid: UUID;
    app_uuid: UUID;
    latitude: null | number;
    longitude: null | number;
    title: string;
    lab_title?: string | null;
    original_title?: string | null;
    geojson?: GeoJsonFeature | null;
    enviro_location_code: null | string;
    enviro_lab_report_number: null | string;
    enviro_start_depth: null | number;
    enviro_end_depth: null | number;
    enviro_soil_description: null | string;
    enviro_lab_sample_type: null | string;
    enviro_sampled_date: null | string;
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

/**
 * List items of all kinds in project with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjectItems(client: DatanestClient, projectUuid: UUID, page = 1, filters: {
    bbox?: BBox;
    include_geojson?: boolean;
    page?: number;
    /** Search for samples by title, lab title or original titles */
    search?: string;
    /**
     * Filter items by master App UUID.
     * This can be the UUID of a master App or a UUID of a shared App.
     */
    template_app_uuid?: UUID;
} & DateRangeFilters = {}) {
    const response = await client.get('v1/projects/' + projectUuid + "/items", { page, ...filters });

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
export async function listProjectAppItems(client: DatanestClient, projectUuid: UUID, appUuid: UUID, page = 1, filters?: {
    bbox?: BBox;
    include_geojson?: boolean;
    /** Search for samples by title, lab title or original titles */
    search?: string;
} & DateRangeFilters) {
    const response = await client.get('v1/projects/' + projectUuid + "/apps/" + appUuid + '/items', { page, ...filters });

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
    return data as AppSchema;
}

export async function deleteApp(client: DatanestClient, projectUuid: UUID, appUuid: UUID) {
    const response = await client.delete('v1/projects/' + projectUuid + '/apps/' + appUuid);
    if (response.status !== 204) {
        throw new Error('Failed to delete app, unexpected status: ' + response.status);
    }
}

export type AppSchemaExportJson = {
    _datanest_type: 'gather_schema_v1' | string;
    _datanest_version: string;
    _datanest_env: string;
    project: Project;
    workflow: CompanyWorkflow | null;
    project_link: string;
    collection_link: string;
    apps: AppSchema[];
    exported_at: Timestamp;
};

/**
 * @internal EXPERIMENTAL ENDPOINT: Some field options including Auto Assigns & Expressions may not be supported.
 * Import multiple apps from a previous JSON export. Within the same project or across projects
 * If uploading to the same project, it will match existing IDs and avoid duplicates.
 * Tip: Remove any apps.*.id & apps.*.uuid to create duplicate apps
 * @param client asDuplicates
 * @param projectUuid 
 * @param appsJson 
 * @returns 
 */
export async function importAppSchemaFromJson(
    client: DatanestClient,
    projectUuid: UUID,
    appsJson: string | { apps: AppSchema[]; } & Partial<AppSchemaExportJson>,
    options?: {
        asDuplicates?: boolean,
    }
): Promise<AppSchemaExportJson> {
    if (typeof appsJson === 'string') {
        appsJson = JSON.parse(appsJson) as { apps: AppSchema[]; } & Partial<AppSchemaExportJson>;
    }
    if (options?.asDuplicates) {
        // Remove any apps.*.id & apps.*.uuid to create duplicate apps
        appsJson.apps = appsJson.apps.map(app => {
            delete app.id;
            delete app.uuid;
            return app;
        });
    }
    const response = await client.post('v1/projects/' + projectUuid + '/apps/schema', appsJson);
    const data = await response.json();
    return data;
}

export type ShareGroupFilter = 'all' | 'company' | 'global';

export type ShareGroupSearchFilters = {
    /**
     * Search for share groups by title or share_group prefix
     */
    search?: string;
    /**
     * Filter by share group or share group prefix
     */
    share_group?: string;
}

export type ShareGroup = {
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
};

/**
 * List shared app groups, app groups can include multiple Apps, Data Events and Auto Docs
 * @param client
 * @param page
 * @param filter Filter by share group type
 * @returns 
 */
export async function listSharedAppGroups(client: DatanestClient, page = 1, filter: ShareGroupFilter = 'all', filters?: ShareGroupSearchFilters & DateRangeFilters) {
    const response = await client.get('v1/apps/share-groups', { page, filter, ...filters });

    const data = await response.json();
    return data as PaginatedResponse<ShareGroup>;
}

/**
 * Import shared app group, with its accompanying Apps, Data Events and Auto Docs
 * @param client
 * @param projectUuid
 * @param shareGroup
 * @returns 
 */
export async function importAppGroup(client: DatanestClient, projectUuid: UUID, shareGroup: string) {
    if (typeof shareGroup !== 'string') {
        throw new Error('Share group must be a string');
    }
    // Formally: v1/projects/{project_uuid}/apps/import-share-group - which still works
    const response = await client.post(`v1/projects/${projectUuid}/share-groups/import`, {
        share_group: shareGroup,
    });

    return await response.json() as {
        apps: App[];
        documents: Document[];
        data_events: DataEvent[];
    }
}

export async function shareAppsFromProject(client: DatanestClient, projectUuid: UUID, shareGroupDetails: {
    app_uuids: UUID[];
    group_title: string;
    group_description?: string | null;
    share_group?: string | null;
}) {
    const response = await client.post(`v1/projects/${projectUuid}/share-groups`, shareGroupDetails);
    return await response.json() as {
        share_group: ShareGroup;
    }
}

/** This will REPLACE the shared apps, documents & data events with any specified */
export async function updateShareGroup(client: DatanestClient, projectUuid: UUID, shareGroup: string, shareGroupDetails: {
    app_uuids: UUID[];
    group_title: string;
    group_description?: string | null;
    share_group?: string | null;
}) {
    const response = await client.post(`v1/projects/${projectUuid}/share-groups/${shareGroup}`, shareGroupDetails);
    return await response.json() as {
        share_group: ShareGroup;
    }
}

export async function unshareAppGroup(client: DatanestClient, projectUuid: UUID, shareGroup: string) {
    await client.delete(`v1/projects/${projectUuid}/share-groups/${shareGroup}`);
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
export async function createGatherItem(client: DatanestClient, projectUuid: UUID, appUuid: UUID, data: ItemUpdatableData & Record<string, any> & {
    /** @internal */
    _meta?: {
        /** @internal for testing purposes */
        created_at?: Timestamp;
        /** @internal for testing purposes */
        updated_at?: Timestamp;
    };
}) {
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
