import DatanestClient, { DatanestResponseError } from "./index";

export enum IntegrationKey {
    BORE_DM = 'boredm',
}

export type IntegrationSetupData = {
    api_key?: string;
    access_token?: string;
    refresh_token?: string;

    /**
     * Some integrations allow you to override the API base URL
     * This is usually optional as the default production url can be inferred.
     */
    service_url?: string;
}

/**
 * Setup or override an integration with your Datanest company account
 * @param client 
 * @param integrationKey
 * @param integrationSetupData
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function setupIntegration(client: DatanestClient, integrationKey: IntegrationKey, integrationSetupData: IntegrationSetupData) {
    const response = await client.post('v1/integrations/' + integrationKey, integrationSetupData);
    if (response.status !== 200) {
        throw new DatanestResponseError(`Failed to setup integration: ${response.status}`, response.status, await response.json());
    }

    const data = await response.json();
    return data as {
        success: boolean;
    };
}

/**
 * Remove an integration from your Datanest company account
 * @param client 
 * @param integrationKey
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function removeIntegration(client: DatanestClient, integrationKey: IntegrationKey) {
    await client.delete('v1/integrations/' + integrationKey);
    return true;
}
