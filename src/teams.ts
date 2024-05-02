import DatanestClient, { UUID } from "./index";
import { User } from "./users";

export type TeamUser = User & {
    custom_role_id: number | null;
};

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
        members: TeamUser[],
        external_users: TeamUser[],
        workflow_assignments: {
            workflow_id: number,
            workflow_title: string,
            workflow_apps: {
                workflow_app_id: number;
                workflow_group_id: number;
                group_title: string,
                users: {
                    uuid: UUID,
                    name: string,
                    email: string,
                }[],
            }[],
        } | null,
    }
}

export async function addProjectTeamMember(client: DatanestClient, projectUuid: UUID, userUuid: UUID, customRoleId?: number | null): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/members/' + userUuid, {
        custom_role_id: customRoleId,
    });
    const data = await response.json();
    return data.user;
}

export async function removeProjectTeamMember(client: DatanestClient, projectUuid: UUID, userUuid: UUID): Promise<User> {
    const response = await client.delete('v1/projects/' + projectUuid + '/teams/members/' + userUuid);
    const data = await response.json();
    return data.user;
}

export async function addExternalUserToProject(client: DatanestClient, projectUuid: UUID, userData: { email: string, name?: string | null, custom_role_id?: number | null }): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/external-users', userData);
    const data = await response.json();
    return data.user;
}

export async function removeExternalUserToProject(client: DatanestClient, projectUuid: UUID, userUuidOrEmail: UUID | string): Promise<User> {
    const response = await client.delete('v1/projects/' + projectUuid + '/teams/external-users/' + userUuidOrEmail);
    const data = await response.json();
    return data.user;
}

export { assignProjectWorkflowAppUser as assignProjectWorkflowUser, unassignProjectWorkflowAppUser as unassignProjectWorkflowUser } from './workflows';