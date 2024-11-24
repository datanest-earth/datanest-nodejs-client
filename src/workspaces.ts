import DatanestClient, { PaginatedResponse, UUID } from "./index";
import { Project } from "./projects";

export type Workspace = {
    uuid: UUID;
    name: string;
    projects_count: number;
    updated_at: string;
    created_at: string;
    deleted_at: string | null;
};

export type DetailedWorkspace = {
    workspace: Workspace;
    workspace_link: string;
};

export async function getWorkspaces(client: DatanestClient, params?: { page?: number }): Promise<PaginatedResponse<Workspace>> {
    const response = await client.get('v1/workspaces', params);
    const data = await response.json();
    return data;
}

export async function createWorkspace(client: DatanestClient, workspaceData: { name: string }): Promise<DetailedWorkspace> {
    const response = await client.post('v1/workspaces', workspaceData);
    const data = await response.json();
    return data;
}

export async function updateWorkspace(client: DatanestClient, uuid: string, workspaceData: { name: string }): Promise<DetailedWorkspace> {
    const response = await client.patch('v1/workspaces/' + uuid, workspaceData);
    const data = await response.json();
    return data;
}

export async function deleteWorkspace(client: DatanestClient, uuid: string): Promise<void> {
    await client.delete('v1/workspaces/' + uuid);
}

export async function getWorkspaceWithProjects(client: DatanestClient, uuid: string): Promise<{ projects: PaginatedResponse<Project>, workspace: Workspace, workspace_link: string }> {
    const response = await client.get('v1/workspaces/' + uuid);
    const data = await response.json();
    return data;
}

export async function assignProjectsToWorkspace(client: DatanestClient, workspaceUuid: string, projectUuids: string[]): Promise<DetailedWorkspace> {
    const response = await client.post('v1/workspaces/' + workspaceUuid + '/assign-projects', { project_uuids: projectUuids });
    const data = await response.json();
    return data;
}

export async function unassignProjectsFromWorkspace(client: DatanestClient, workspaceUuid: string, projectUuids: string[]): Promise<DetailedWorkspace> {
    const response = await client.post('v1/workspaces/' + workspaceUuid + '/unassign-projects', { project_uuids: projectUuids });
    const data = await response.json();
    return data;
}
