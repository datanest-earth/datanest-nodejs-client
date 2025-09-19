import DatanestClient, { Country2CharCode, DatanestResponseError, DateRangeFilters, Email, MeasurementType, PaginatedResponse, Timestamp, TimezoneIdentifier, UUID } from "./index";
import { CompanyWorkflow } from "./workflows";

export enum ProjectType {
    /**
     * Project with Enviro/Evalu8 module enabled
     */
    PROJECT_TYPE_ENVIRO = 0,
    /**
     * Standard project (previously known as Maps or Figure project)
     */
    PROJECT_TYPE_STANDARD = 1,
}

/**
 * A Datanest Project
 */
export type Project = {
    uuid: UUID,
    project_number: string,
    project_name: string,
    project_client: string,
    project_type: ProjectType,
    workflow_id: number | null,
    /** Timestamp of when the workflow started importing, null if importing is complete. */
    workflow_importing_at: Timestamp | null,
    /** Is the workflow currently importing in the background, more Apps, Auto Docs, Data Events and Figures may appear in the project */
    is_workflow_importing: boolean;
    archived: boolean,
    is_confidential: boolean,
    is_confirmed: boolean,

    project_manager_uuid: null | UUID;

    /**
     * Latitude in decimal degrees (WGS84)
     */
    latitude: null | number,
    /**
     * Longitude in decimal degrees (WGS84)
     */
    longitude: null | number,

    storage_needs_calc: boolean,
    storage_usage_mb: number,
    has_soil_upload: boolean,
    has_water_upload: boolean,
    has_leachate_upload: boolean,
    has_soilgas_upload: boolean,
    has_xrf_data: boolean,
    has_chemical_misalignment: boolean,
    has_sample_merging_misalignment: boolean,
    has_matrice_misalignment: boolean,
    has_unit_misalignment: boolean,
    has_rpd_misalignment: boolean,
    has_spatial_misalignment: boolean,
    is_gather_non_spatial_view: boolean,
    is_legacy_gather_table: boolean,
    project_address: null | string,
    google_place_id: null | string,
    address_street: null | string,
    address_locality: null | string,
    address_city: null | string,
    address_state: null | string,

    /** 
     * Additional fields can be configured in Company Settings -> Workflow Settings
     * Record null values are removed and will be undefined.
     */
    additional: null | Record<string, string | number | null>,

    /**
     * Supported ISO 3166-1 alpha-2 country codes
     */
    address_country: Country2CharCode,
    address_postcode: null | string,
    measurement_type: MeasurementType | null,
    /** IANA Timezone identifier e.g. Australia/Sydney or Pacific/Auckland */
    timezone: null | 'UTC' | TimezoneIdentifier,

    enviro_processed_at: null | Timestamp,
    last_accessed_at: null | Timestamp,
    updated_at: null | Timestamp,
    created_at: null | Timestamp,
};

/**
 * Minimal data required to create a project
 */
export type ProjectCreationData = {
    project_number: string;
    project_name: string;
    project_client: string;


    /**
     * Full postal address
     */
    project_address?: string;

    /**
     * Project type: Enviro = 0 or Standard = 1
     * @default 1
     */
    project_type?: ProjectType;

    /**
     * Supported ISO 3166-1 alpha-2 country codes
     */
    address_country: Country2CharCode;

    /** UUID of the project manager */
    project_manager_uuid?: UUID;
    /** Email of the project manager */
    project_manager?: Email;

    workflow_assignments?: ProjectWorkflowAssignments;

    /**
     * Additional fields can be configured in Company Settings -> Workflow Settings
     * Provide null to remove the field
     */
    additional?: Record<string, string | number | null>;
};

type WorkflowAppIdentifier = {
    /**
     * Recommended workflow app selector.
     * The recommended convention is `share.company.app-identifier-version`
     * To handle version control, only provide the prefix and the project's version will be automatically resolved.
     * E.g. use "share.my-company.app-identifier" and the corresponding "share.my-company.app-identifier.v3" will be automatically resolved.
     */
    share_group: string;
} | {
    /**
     * Caution: Publishing new revisions will change the ID of the workflow_app_id
     * this can be inconvenient as republishing a workflow will cause breaking changes to API calls.
     * @deprecated Please use share_group instead
     */
    workflow_app_id: number;
};

export type WorkflowAppUserAssignment = WorkflowAppIdentifier & ({
    /**
     * Set currently assigned users to the project's app group by UUID
     * Omitted users will be removed from the project's app group
     */
    user_uuids: UUID[];
} | {
    /**
     * Set currently assigned users to the project's app group by email
     * Omitted users will be removed from the project's app group
     */
    users: Email[];
});

/**
 * By assigning a workflow a project can be pre-configured with:
 * Gather Apps, Auto Docs & Map Figures
 * Workflows can be configured to assign users to control which apps they can access
 * Tip: You can find company workflows and their IDs from getCompanyWorkflows in the workflows namespace
 */
type ProjectWorkflowAssignments = {
    workflow_id: number;

    workflow_apps?: WorkflowAppUserAssignment[];
};

/**
 * List projects with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @param archived Show archived projects instead?
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjects(client: DatanestClient, page = 1, archived = false, filters?: {
    project_type?: ProjectType;
    workspace_uuid?: UUID;
    search?: string;
    latest?: boolean;
} & DateRangeFilters) {
    const response = await client.get('v1/projects', { archived, page, ...filters });

    const data = await response.json();
    return data as PaginatedResponse<Project>;
}

/**
 * Get a single project via UUID
 * @param client 
 * @param projectUuid 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function getProject(client: DatanestClient, projectUuid: string) {
    const response = await client.get('v1/projects/' + projectUuid);

    const data = await response.json();
    return data as {
        project: Project;
        workflow: CompanyWorkflow | null;
        project_link: string;
        collection_link: string;
    };
}

/**
 * Create a Datanest Project
 * @param client 
 * @param projectData 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function createProject(client: DatanestClient, projectData: ProjectCreationData & Partial<Project>) {
    const response = await client.post('v1/projects', projectData);
    if (response.status !== 201) {
        throw new DatanestResponseError(`Failed to create project: ${response.status}`, response.status, await response.json());
    }

    const data = await response.json();
    return data as {
        project: Project;
        project_link: string;
    };
}

/**
 * Wait for a project workflow import to complete, up to a timeout
 * @param client 
 * @param projectUuid 
 * @param timeout 
 * @throw Error Timeout waiting for project workflow to complete
 * @throw DatanestResponseError Request HTTP server or validation error
 */
export async function waitForProjectWorkflow(client: DatanestClient, projectUuid: string, timeout = 45000): Promise<Project> {
    let projectData: Project | undefined = undefined;
    const start = Date.now();
    while (projectData?.workflow_importing_at !== null) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        projectData = (await getProject(client, projectUuid)).project;
        if (Date.now() - start > timeout) {
            throw new Error('Timeout waiting for project workflow to complete');
        }
    }

    return projectData;
}

/**
 * Update properties of a project
 * @param client 
 * @param projectData 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function patchProject(client: DatanestClient, projectUuid: string, projectData: Partial<ProjectCreationData> & Partial<Project>) {
    const response = await client.patch('v1/projects/' + projectUuid, projectData);
    if (response.status !== 200) {
        throw new DatanestResponseError(`Failed to create project: ${response.status}`, response.status, await response.json());
    }

    const data = await response.json();
    return data as {
        project: Project;
        project_link: string;
    };
}

/**
 * Archive a project to hide it from users, it will be automatically deleted after some time.
 * @param client 
 * @param projectUuid 
 * @param forceDelete It is recommended to use forceDelete=true when testing, by default archived projects are force deleted after 6 months.
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function archiveProject(client: DatanestClient, projectUuid: string, options?: { force_delete?: boolean }) {
    const response = await client.delete('v1/projects/' + projectUuid + '/archive', options);
    if (response.status !== 200) {
        throw new DatanestResponseError(`Failed to archive project: ${response.status}`, response.status, await response.json());
    }
    return true;
}

/**
 * Restore an archived project.
 * @param client 
 * @param projectUuid 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns true
 */
export async function restoreProject(client: DatanestClient, projectUuid: string) {
    await client.post('v1/projects/' + projectUuid + '/restore');
    return true;
}
