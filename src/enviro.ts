import DatanestClient, { Country2CharCode, PaginatedResponse } from "./index";

export type ProjectAssessed = {
    assessed_id: number;
    matrix: EnviroMatrix;
    hq_type: null;
    groundwater_depth: null;
    replace_na_values: boolean;
    test_hydrocarbons: string;
    by_matching_units: boolean;
    by_documents: boolean;
    is_favourite: boolean;
    batch_number: null;
    from_assessed_id: null;
};

export type GuidelineDocument = {
    document_id: number;
    batch: number;
    country: Country2CharCode;
    matrix: EnviroMatrix;
    document_identifier: string;
    document_url: string;
    document: string;
    document_shorthand: string | null;
    formatted_title: string;
    acronym: string;
    type: string;
    hq_type: string | null;
    new_revision_document_id: null;
    by_document_specific: boolean;
};

export type GuidelineScenario = {
    id: number;
    basis: string;
    media: string;
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
    document: GuidelineDocument | null;
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
    profile_id: number | null;
}): Promise<PaginatedResponse<EnviroChemicalWithAliases[]>> {
    const response = await client.get('v1/enviro/chemicals', {
        page,
    });
    return await response.json()
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
