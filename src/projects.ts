import DatanestClient, { DatanestResponseError } from "./index";

enum ProjectType {
    PROJECT_TYPE_ENVIRO = 0,
    PROJECT_TYPE_MAPS = 1,
}

/**
 * ISO 8601 date string
 */
type Timestamp = string;

/**
 * ISO 3166-1 alpha-2 country code
 */
type Country2CharCode = 'NZ' | 'GB' | 'US' | 'AU' | 'CA';

/**
 * A Datanest Project
 */
type Project = {
    uuid: string,
    project_number: string,
    project_name: string,
    project_client: string,
    project_type: ProjectType,
    archived: boolean,
    is_confidential: boolean,
    is_confirmed: boolean,

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

    address_country: Country2CharCode,
    address_postcode: null | string,
    measurement_type: null,

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
    project_address: string;

    /**
     * ISO 3166-1 alpha-2 country code
     */
    address_country: Country2CharCode;
};

type PaginatedResponse<T> = {
    data: T[],

    /**
     * @deprecated This may not be permanent
     */
    links: {
        first: string,
        last: string,
        prev: null | string,
        next: null | string,
    },

    meta: {
        /**
         * @deprecated This may not be permanent
         */
        links: {
            url: null | string, label: string, active: boolean,
        }[],

        /**
         * Current page number
         */
        current_page: number;

        /**
         * Last page number
         */
        last_page: number;

        /**
         * Number of items per page
         */
        per_page: number;

        /**
         * Total number of items
         */
        total: number;
    },
};

export async function listProjects(client: DatanestClient, page = 1) {
    const response = await client.get('v1/projects', { page });

    const data = await response.json();
    return data as PaginatedResponse<Project>;
}

export async function getProject(client: DatanestClient, projectUuid: string) {
    const response = await client.get('v1/projects/' + projectUuid);

    const data = await response.json();
    return data as {
        project: Project;
        project_link: string;
    };
}

export async function createProject(client: DatanestClient, projectData: ProjectCreationData) {
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