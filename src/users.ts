import DatanestClient, { PaginatedResponse, UUID } from "./index";
import { Project } from "./projects";

export type User = {
    uuid: string;
    name: string | null;
    email: string;
    initials?: string | null;
}

export async function getCompanyUsers(client: DatanestClient, params?: { page?: number, query?: string, latest?: boolean }): Promise<PaginatedResponse<User>> {
    const response = await client.get('v1/users', params);

    const data = await response.json();
    return data;
}

export async function inviteCompanyUser(client: DatanestClient, userData: { email: string, name: string | null, initials?: string | null }): Promise<User> {
    const response = await client.post('v1/users', userData);

    const data = await response.json();
    return data.user;
}

export async function patchCompanyUser(client: DatanestClient, userUuid: string, userData: { email?: string, name?: string, initials?: string | null }): Promise<User> {
    const response = await client.patch('v1/users/' + userUuid, userData);

    const data = await response.json();
    return data.user;
}

export async function deleteCompanyUser(client: DatanestClient, userUuid: UUID): Promise<{}> {
    const response = await client.delete('v1/users/' + userUuid);

    const data = await response.json();
    return data;
}

export async function getCompanyExternalUsers(client: DatanestClient, params?: { page?: number, latest?: boolean }): Promise<PaginatedResponse<User>> {
    const response = await client.get('v1/company/external-users', params);
    return await response.json();
}

export async function getCompanyExternalUserProjects(client: DatanestClient, externalUserUuid: string, params?: { page?: number }): Promise<PaginatedResponse<Project>> {
    const response = await client.get('v1/company/external-users/' + externalUserUuid + '/projects', params);
    return await response.json();
}

export async function purgeCompanyExternalUser(client: DatanestClient, externalUserUuid: string): Promise<PaginatedResponse<User>> {
    const response = await client.delete('v1/company/external-users/' + externalUserUuid);
    return await response.json();
}
