import DatanestClient, { PaginatedResponse, UUID } from "./index";

export type User = {
    uuid: string;
    name: string | null;
    email: string;
    initials?: string | null;
}

export async function getCompanyUsers(client: DatanestClient): Promise<PaginatedResponse<User>> {
    const response = await client.get('v1/users');

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

/**
 * Get team members, external users and manager of a project
 * @param client Datanest REST API Client
 * @param page Page number
 * @param archived Show archived projects instead?
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function getProjectTeam(client: DatanestClient, projectUuid: UUID) {
    const response = await client.get('v1/projects/' + projectUuid + '/teams');

    const data = await response.json();
    return data as {
        project_manager: User,
        members: User[],
        external_users: User[],
    }
}

/**
 * Update project manager, team members and external invites
 * @param client 
 * @param projectUuid 
 * @throws DatanestResponseError Request HTTP server or validation error
 * @returns 
 */
export async function updateProjectTeam(client: DatanestClient, projectUuid: UUID, teamData: any) {

}

export async function removeProjectTeamMember(client: DatanestClient, projectUuid: UUID, teamData: any) {

}
