import DatanestClient, { PaginatedResponse, UUID } from "./index";

export type User = {
    uuid: string;
    name: string | null;
    email: string;
    initials?: string | null;
}

export async function getCompanyUsers(client: DatanestClient, params?: { page?: number, query?: string }): Promise<PaginatedResponse<User>> {
    const response = await client.get('v1/users', params);

    const data = await response.json();
    return data;
}

export async function inviteCompanyUser(client: DatanestClient, userData: { email: string, name?: string | null, initials?: string | null }): Promise<User> {
    const response = await client.post('v1/users', userData);

    const data = await response.json();
    return data.user;
}

export async function patchCompanyUser(client: DatanestClient, userUuid: string, userData: { email?: string, name?: string | null, initials?: string | null }): Promise<User> {
    const response = await client.patch('v1/users/' + userUuid, userData);

    const data = await response.json();
    return data.user;
}

export async function deleteCompanyUser(client: DatanestClient, userUuid: UUID): Promise<{}> {
    const response = await client.delete('v1/users/' + userUuid);

    const data = await response.json();
    return data;
}
