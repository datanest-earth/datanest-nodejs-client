import DatanestClient, { DateRangeFilters, PaginatedResponse, UUID } from "./index";
import { User } from "./users";

export type CompanyWorkflow = {
    workflow_id: number,
    /** Workflow ID of the original revision 0 workflow */
    original_workflow_id: number,
    workflow_title: string,
    /** Starting at 0, incremented when the workflow is updated */
    revision: number,
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
    published_at: string | null,
    updated_at: string,
    created_at: string,
}

export type CompanyCustomRole = {
    custom_role_id: number,
    custom_role_title: string,
}

export type WorkflowFilters = {
    /** Include draft workflows where published_at is null */
    include_drafts?: boolean;
    /**
     * Include revisions of the workflow that have previous `revision` values.
     * These cannot be used to create or assign to new projects.
     */
    include_revisions?: boolean;
}

/**
 * Get Company Workflow templates.
 * You can use this to help setup projects with workflows.
 * By default, only published workflows are returned. See WorkflowFilters
 * @param client 
 * @returns 
 */
export async function getCompanyWorkflows(client: DatanestClient, filters?: WorkflowFilters & DateRangeFilters): Promise<PaginatedResponse<CompanyWorkflow>> {
    const response = await client.get('v1/company-workflows', filters);
    return await response.json();
}

/**
 * Get Company Workflow workflow with the latest revision.
 * You can use this to help setup projects with workflows.
 * @param client 
 * @returns 
 */
export async function getCompanyWorkflow(client: DatanestClient, workflowId: number): Promise<{
    original_workflow_id: number;
    /** Starting at 0, incremented when the workflow is updated */
    revision: number;
    /** Starting at 0, incremented when the workflow is updated. Includes draft */
    latest_revision: number;
    /** Starting at 0, incremented when the workflow is updated. Includes draft */
    latest_revision_id: number;
    /** Starting at 0, incremented when the workflow is updated. Includes draft */
    latest_published_revision: number | null;
    /** Workflow ID of the latest published revision */
    latest_published_id: number | null;
    /** Is the workflow the latest published revision? */
    is_latest: boolean;
    /** Workflow for the workflowId requested, which may be a draft or revision or latest published */
    workflow: CompanyWorkflow;
    /** This will always have a published_at set but there may be no published workflow yet. */
    latest_published_workflow: CompanyWorkflow | null;
    /** This may be a draft with published_at set to null */
    latest_workflow: CompanyWorkflow;
}> {
    const response = await client.get('v1/company-workflows/' + workflowId);
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
export async function assignProjectWorkflowAppUser(client: DatanestClient, projectUuid: UUID, userUuidOrEmail: UUID, shareGroupOrWorkflowAppId: string | number, customRoleId?: number | null): Promise<User> {
    const response = await client.post('v1/projects/' + projectUuid + '/teams/workflow-apps/' + shareGroupOrWorkflowAppId + '/' + userUuidOrEmail, {
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

export function getLatestWorkflowFromList(workflows: CompanyWorkflow[]) {
    return workflows.reduce((max, workflow) => {
        if (workflow.revision > max.revision) {
            return workflow;
        }
        return max;
    }, workflows[0]);
}

export function getLatestDraftWorkflowFromList(workflows: CompanyWorkflow[]) {
    return workflows.reduce((max, workflow) => {
        if (workflow.published_at !== null) {
            return max;
        }
        if (workflow.revision > max.revision) {
            return workflow;
        }
        return max;
    }, workflows[0]);
}

export function getLatestPublishedWorkflowFromList(workflows: CompanyWorkflow[]) {
    return workflows.reduce((max, workflow) => {
        if (workflow.published_at === null) {
            return max;
        }
        if (workflow.revision > max.revision) {
            return workflow;
        }
        return max;
    }, workflows[0]);
}

export function isDraftWorkflow(workflow: CompanyWorkflow) {
    return workflow.published_at === null;
}

/** This does not mean that it is the latest published workflow. Just that it was published at some point. */
export function isPublishedWorkflow(workflow: CompanyWorkflow) {
    return workflow.published_at !== null;
}
