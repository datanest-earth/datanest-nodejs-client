import { Item } from "./gather";
import DatanestClient, { Country2CharCode, DateRangeFilters, PaginatedResponse } from "./index";
import { BBox } from "./maps";

export type ProjectAssessed = {
    assessed_id: number;
    matrix: EnviroMatrix;
    hq_type: null;
    groundwater_depth: null;
    replace_na_values: boolean;
    test_hydrocarbons: string;
    by_matching_units: boolean;
    by_standards: boolean;
    is_favourite: boolean;
    batch_number: null;
    from_assessed_id: null;
};

export type GuidelineStandard = {
    standard_id: number;
    batch: number;
    country: Country2CharCode;
    matrix: EnviroMatrix;
    standard_identifier: string;
    standard_url: string;
    standard: string;
    standard_shorthand: string | null;
    formatted_title: string;
    acronym: string;
    type: string;
    hq_type: string | null;
    new_revision_standard_id: null;
    by_standard_specific: boolean;
};

export type Guideline = {
    id: number;
    is_custom_guideline: boolean;
    is_hierarchy_only: boolean;
    guideline_scenario_id: number;
    standard_id: number;
    chemical_id: number;
    chemical_title: string;
    chemical_casno: string;
    company_standard_id: null;
    original_guideline_id: null;
    superseded_guideline_id: null;
    pathways: string;
    soil_type: null;
    value_min: number;
    value_max: number | null;
    value_alphanumeric: null;
    units: string;
    groundwater_depth: null | number;
    soil_depth: null | number;
    cec_value: null | number;
    ph_value: null | number;
    clay_content: null | number;
    produce_consumption_percentage: null | number;
    table_reference: null | string;
};

export type GuidelineScenario = {
    id: number;
    basis: string;
    matrix: EnviroMatrix;
    land_use: string;
    type: null;
    full_title: null;
};

export type ProjectScenario = {
    id: number;
    project_assessed_id: number;
    guideline_scenario_id: number;
    guideline_document_id: number;
    criteria_set_id: number | null;
    is_background: boolean;
    is_processing: boolean;
    is_processed: boolean;
    has_processing_failure: boolean;
    is_outdated: boolean;
    is_deleting: boolean;
    factor: number;
    options: {
        exceed_when_no_criteria: boolean;
        exceed_above_upper_range: boolean;
        dont_exceed_below_lower_range: boolean;
    };
    assessed: ProjectAssessed | null;
    scenario: GuidelineScenario | null;
    criteria_set: CriteriaSet | null;
    standard: GuidelineStandard | null;
};

export type CriteriaSet = {
    title: string;
    matrix: EnviroMatrix;
    use_analyte_comments: boolean;
    exclude_non_detects: boolean;
    is_background: boolean;
    comments: string | null;
    user_uuid: string | null;
    is_approved: boolean;
};

export type EnviroMatrix = 'soil' | 'water' | 'leachate' | 'soilgas' | 'sediment';

export type EnviroChemical = {
    id: number;
    casno: string;
    chemical_name: string;
}

/**
 * Profile of a company's chemical aliases
 */
export type CompanyChemicalProfile = {
    profile_id: number;
    title: string;
};

export type EnviroChemicalWithAliases = EnviroChemical & {
    casno_aliases: string[];
    chemical_aliases: string[];
};

export type SampleResult = {
    result_id: number;
    exceeds_background: boolean;
    sample_id: number;
    linked_sample_id: number | null;
    sample_custom_title: string;
    sample_latitude: number;
    sample_longitude: number;
    sample_lab_title: string;
    sample_start_depth: number | null;
    sample_end_depth: number | null;
    sample_location_code: string | null;
    sample_lab_report_number: string | null;
    sample_soil_description: string | null;
    sample_lab_sample_type: string | null;
    sample_sampled_date: string | null;
    sample_analyzed_date: string | null;
    sample_duplicate_of_id: number | null;
    sample_triplicate_of_id: number | null;

    matrix: EnviroMatrix;
    chemical_id: number;
    chemical_casno: string;
    chemical_title: string;
    units: string;
    unit_multiplier: number;
    eql: number | null;
    total_or_filtered: 'T' | 'F';
    is_surrogate: boolean;
    is_internal_standard: boolean;
    result: number | null;
    lod_result: number | null;
    prefix: string | null;
    display_result: number | null;
    changed_result_value: number | null;
    changed_result_reason: string | null;
    pcb_value: number | null;
    duplicate_rpd: number | null;
    triplicate_rpd: number | null;
    lab_flags: string | null;
    comments: string | null;
};

export type EnviroItemFilters = {
    verification_type?: string;
    sample_type?: 'xrf' | 'laboratory' | 'gather' | 'all';
    lab_sample_type?: string;
    /** These are the same as Enviro Sample IDs & Gather Item IDs */
    item_ids?: number[];
    hide_duplicate_samples?: boolean;
    hide_triplicate_samples?: boolean;
    hide_hidden_samples?: boolean;
    depths?: { start_depth: number, end_depth: number }[];
    elevations?: { start_elevation: number, end_elevation: number }[];
    apec?: string[];
    kit_ids?: number[];
    /** Provide one or more soil descriptions to exact match at least one of them */
    soil_descriptions?: string[];
    lab_report_numbers?: string[];
    project_figure_layer_id?: number;
    /** Chemical CAS numbers */
    casno?: string[];
    chemical_ids?: number[];
};

/**
 * Get all Enviro Matrices with their aliases for Datanest
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getAllEnviroMatrices(client: DatanestClient) {
    const response = await client.get('v1/enviro/matrices');
    return await response.json() as {
        matrices: {
            matrix_id: number;
            matrix: EnviroMatrix;
            aliases: string[];
        }[],
    };
}

/**
 * Get all chemicals with aliases
 * @param filters.profile_id Filter by profile ID, by default all profile aliases are returned
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getAllEnviroChemicals(client: DatanestClient, page: number = 1, filters?: {
    profile_id?: number | null;
} & DateRangeFilters): Promise<PaginatedResponse<EnviroChemicalWithAliases[]>> {
    const response = await client.get('v1/enviro/chemicals', {
        page,
        ...filters,
    });
    return await response.json();
}

/**
 * Get all chemical aliases profiles
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getCompanyChemicalProfiles(client: DatanestClient) {
    const response = await client.get('v1/enviro/chemicals/alias-profiles');
    return await response.json() as {
        profiles: CompanyChemicalProfile[];
    };
}


/**
 * Get active Enviro Matrices with their aliases for a specific project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectMatrices(client: DatanestClient, projectUuid: string) {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/matrices');
    return await response.json() as {
        matrices: {
            matrix_id: number;
            matrix: EnviroMatrix;
            aliases: string[];
        }[],
    };
}

/**
 * Get all Scenarios of a project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectScenarios(client: DatanestClient, projectUuid: string): Promise<{ scenarios: ProjectScenario[] }> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/scenarios');
    return await response.json();
}


/**
 * Get all Guideline Standards of a project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectScenarioStandards(client: DatanestClient, projectUuid: string, scenarioId: number, filters?: {
    page?: number;
    standard_id?: number;
    standard_ids?: number[];
}): Promise<PaginatedResponse<GuidelineStandard> & {
    guideline_scenario: GuidelineScenario;
}> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/scenarios/' + scenarioId + '/standards', filters);
    return await response.json();
}

/**
 * Get all Guidelines of a project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectScenarioGuidelines(client: DatanestClient, projectUuid: string, scenarioId: number, filters?: {
    page?: number;
    standard_id?: number;
    standard_ids?: number[];
    chemical_id?: number;
    chemical_ids?: number[];
}): Promise<PaginatedResponse<Guideline> & {
    guideline_scenario: GuidelineScenario;
}> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/scenarios/' + scenarioId + '/guidelines', filters);
    return await response.json();
}

/**
 * Get sample chemical results from a project
 * Note the date range filters applies to the sample locations, not when the results were created/updated.
 * @param filters.casno Optionally filter by one or more CAS numbers
 * @param filters.sample_ids Optionally filter by one or more Datanest sample ids
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectSampleChemicalResults(client: DatanestClient, projectUuid: string, filters?: {
    casno?: string[];
    sample_ids?: number[];
} & DateRangeFilters): Promise<PaginatedResponse<SampleResult>> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/samples/chemical-results', filters);
    return await response.json();
}

/**
 * Get all sample locations of a project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectSampleLocations(client: DatanestClient, projectUuid: string, filters?: {
    bbox?: BBox;
    include_geojson?: boolean;
    page?: number;
    /** Search for samples by title, lab title or original titles */
    search?: string;
} & DateRangeFilters): Promise<PaginatedResponse<Item>> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/samples/locations', filters);
    return await response.json();
}

/**
 * Get all samples of a project
 * @throws DatanestResponseError Request HTTP server or validation error
 */
export async function getProjectSamples(client: DatanestClient, projectUuid: string, filters?: {
    page?: number;
    /** Search for samples by title, lab title or original titles */
    search?: string;
} & EnviroItemFilters & DateRangeFilters): Promise<PaginatedResponse<Item>> {
    const response = await client.get('v1/projects/' + projectUuid + '/enviro/samples', filters);
    return await response.json();
}