import DatanestClient, { PaginatedResponse, UUID } from "./index";
import { User } from "./users";

export type CompanyWorkflow = {
    workflow_id: number,
    workflow_title: string,
    company_id: number,
    favourite_project_uuid: null | UUID,
    workflow_groups: {
        workflow_group_id: number,
        title: string,
        has_linked_apps: boolean,
        has_user_specific_apps: boolean,
    }[],
    workflow_figures: {
        workflow_figure_id: number,
        title: string,
        version: string,
        drawn_by: null | string,
        figure_no: string,
        view_size: number,
        checked_by: null | string,
        view_scale: number,
        basemap_index: number,
        has_scale_bar: boolean,
        view_layout_id: number,
        has_north_arrow: boolean,
        view_projection: string,
        figure_no_prefix: string,
        view_orientation: string,
        has_site_boundary_default: boolean,
    }[],
    workflow_apps: {
        workflow_app_id: number;
        share_group: string,
        group_title: string,
        group_description: string,
    }[],
    updated_at: string,
    created_at: string,
}

export type CompanyCustomRole = {
    custom_role_id: number,
    custom_role_title: string,
}

/**
 * Get Company Workflow templates.
 * You can use this to help setup projects with workflows.
 * @param client 
 * @returns 
 */
export async function getCompanyWorkflows(client: DatanestClient): Promise<PaginatedResponse<CompanyWorkflow>> {
    const response = await client.get('v1/company-workflows');
    return await response.json();
}

/**
 * Get Custom Roles for your account.
 * You can use this to restrict module access for certain users in project teams.
 * To set up custom roles please use the Company Settings -> User Access section in the Web interface.
 * @param client DatanestClient
 * @returns 
 */
export async function getCompanyCustomRoles(client: DatanestClient): Promise<CompanyCustomRole[]> {
    const response = await client.get('v1/company-custom-roles');
    return await response.json();
}

/**
 * Append a workflow user to a project.
 * The user will also be added to the project team.
 * @param client DatanestClient
 * @param projectUuid 
 * @param userUuidOrEmail 
 * @param workflowAppId 
 * @param customRoleId optional custom role id
 * @returns 
 */
export async function assignProjectWorkflowAppUser(client: DatanestClient, projectUuid: UUID, userUuidOrEmail: UUID, workflowAppId: number, customRoleId?: number | null): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/workflow-apps/' + workflowAppId + '/' + userUuidOrEmail, {
        custom_role_id: customRoleId,
    });
    return await response.json();
}

/**
 * Unassign a workflow user from a project. The user remains in project team.
 * Use teams.removeProjectTeamMember or teams.removeExternalUserToProject to
 *  completely remove them from the project.
 * @param client 
 * @param projectUuid 
 * @param userUuidOrEmail 
 * @returns 
 */
export async function unassignProjectWorkflowAppUser(client: DatanestClient, projectUuid: UUID, userUuidOrEmail: UUID, workflowAppId: number): Promise<User> {
    const response = await client.delete('v1/projects/' + projectUuid + '/teams/workflow-apps/' + workflowAppId + '/' + userUuidOrEmail);
    return await response.json();
}
