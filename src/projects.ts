import DatanestClient, { Country2CharCode, DatanestResponseError, MeasurementType, PaginatedResponse, Timestamp, UUID } from "./index";
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
     * Supported ISO 3166-1 alpha-2 country codes
     */
    address_country: Country2CharCode,
    address_postcode: null | string,
    measurement_type: MeasurementType | null,

    enviro_processed_at: null | Timestamp,
    updated_at: null | Timestamp,
    created_at: null | Timestamp,
};

/**
 * Minimal data required to create a project
 */
type ProjectCreationData = {
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

    workflow_assignments?: ProjectWorkflowAssignments;
};

/**
 * By assigning a workflow a project can be pre-configured with:
 * Gather Apps, Auto Docs & Map Figures
 * Workflows can be configured to assign users to control which apps they can access
 * Tip: You can find company workflows and their IDs from getCompanyWorkflows in the workflows namespace
 */
type ProjectWorkflowAssignments = {
    workflow_id: number;

    workflow_apps?: {
        workflow_app_id: number;
        /**
         * Set currently assigned users to the project's app group
         */
        user_uuids: UUID[];
    }[];
};

/**
 * List projects with pagination
 * @param client Datanest REST API Client
 * @param page Page number
 * @param archived Show archived projects instead?
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function listProjects(client: DatanestClient, page = 1, archived = false) {
    const response = await client.get('v1/projects', { archived, page });

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
 * Update properties of a project
 * @param client 
 * @param projectData 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function patchProject(client: DatanestClient, projectUuid: string, projectData: Partial<ProjectCreationData>) {
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
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function archiveProject(client: DatanestClient, projectUuid: string) {
    await client.delete('v1/projects/' + projectUuid + '/archive');
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
