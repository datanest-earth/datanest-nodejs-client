import DatanestClient, { UUID } from "./index";
import { User } from "./user";

/**
 * Get team members, external users and manager of a project
 * @param client Datanest REST API Client
 * @param projectUuid UUID of the project
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

export async function addProjectTeamMember(client: DatanestClient, projectUuid: UUID, userUuid: UUID): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/members/' + userUuid);

    const data = await response.json();
    return data.user;
}

export async function removeProjectTeamMember(client: DatanestClient, projectUuid: UUID, userUuid: UUID): Promise<User> {
    const response = await client.delete('v1/projects/' + projectUuid + '/teams/members/' + userUuid);

    const data = await response.json();
    return data.user;
}

export async function addExternalUserToProject(client: DatanestClient, projectUuid: UUID, userData: { email: string, name?: string | null }): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/external-users', userData);

    const data = await response.json();
    return data.user;
}

export async function removeExternalUserToProject(client: DatanestClient, projectUuid: UUID, userUuidOrEmail: UUID | string): Promise<User> {
    const response = await client.delete('v1/projects/' + projectUuid + '/teams/external-users/' + userUuidOrEmail);

    const data = await response.json();
    return data.user;
}
