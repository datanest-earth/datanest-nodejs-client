import dotenv from 'dotenv';
import { assert, beforeAll, expect, it } from 'vitest';
import DatanestClient from '../src';
import { listProjects, Project } from '../src/projects';
import { assignProjectsToWorkspace, createWorkspace, deleteWorkspace, getWorkspaceWithProjects, unassignProjectsFromWorkspace, updateWorkspace, Workspace } from '../src/workspaces';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    const client = new DatanestClient();
    let workspace: Workspace | undefined;
    let assignedProjects: Project[] = [];
    let allProjects: Project[] = [];

    beforeAll(async () => {
        allProjects = (await listProjects(client)).data;
        assert(allProjects.length >= 2);
    });

    it('Create workspace', async () => {
        let name = 'Test workspace ' + new Date().toISOString();
        const data = await createWorkspace(client, { name });
        workspace = data.workspace;
        expect(data.workspace_link).toContain(`/w/${workspace.uuid}`);
        expect(workspace.uuid).toBeDefined();
        expect(workspace.name).toBe(name);
        expect(workspace.projects_count).toBe(0);
    });

    it('Assign projects to workspace', async () => {
        assert(workspace);
        const projectUuids = allProjects.slice(0, 2).map(p => p.uuid);
        expect(projectUuids.length).toBe(2);
        workspace = (await assignProjectsToWorkspace(client, workspace.uuid, projectUuids)).workspace;
        expect(workspace.projects_count).toBe(2);

        const currentProjects = await getWorkspaceWithProjects(client, workspace.uuid);
        expect(currentProjects.projects.data.length).toBe(2);
        expect(currentProjects.projects.data.every(p => projectUuids.includes(p.uuid))).toBe(true);
        assignedProjects = currentProjects.projects.data;
    });

    it('Can assign the same project to another workspace', async () => {
        let newWorkspace = (await createWorkspace(client, { name: 'Another workspace ' + new Date().toISOString() })).workspace;
        expect(newWorkspace.uuid).toBeDefined();
        expect(newWorkspace.projects_count).toBe(0);

        const projectUuid = assignedProjects[0].uuid;
        // Test that assigning a project twice only add it once
        await assignProjectsToWorkspace(client, newWorkspace.uuid, [projectUuid]);
        newWorkspace = (await assignProjectsToWorkspace(client, newWorkspace.uuid, [projectUuid])).workspace;
        expect(newWorkspace.projects_count).toBe(1);

        const currentProjects = await getWorkspaceWithProjects(client, newWorkspace.uuid);
        expect(currentProjects.projects.data.length).toBe(1);
        expect(currentProjects.projects.data[0].uuid).toBe(projectUuid);

        await deleteWorkspace(client, newWorkspace.uuid);
    });

    it('Unassign a project from workspace', async () => {
        assert(workspace);
        const projectUuid = assignedProjects[0].uuid;
        workspace = (await unassignProjectsFromWorkspace(client, workspace.uuid, [projectUuid])).workspace;
        expect(workspace.projects_count).toBe(1);

        const currentProjects = await getWorkspaceWithProjects(client, workspace.uuid);
        expect(currentProjects.projects.data.length).toBe(1);
        expect(currentProjects.projects.data[0].uuid).toBe(assignedProjects[1].uuid);
    });

    it('Can update name and delete workspace', async () => {
        assert(workspace);
        workspace = (await updateWorkspace(client, workspace.uuid, { name: 'Updated name' })).workspace;
        expect(workspace.name).toBe('Updated name');
        expect(workspace.projects_count).toBe(1);

        await deleteWorkspace(client, workspace.uuid);

        client.setLogErrors(false); // Don't log 404
        try {
            await getWorkspaceWithProjects(client, workspace.uuid);
            assert(false);
        } catch (error) {
            expect(error.status).toBe(404);
        }
    });
} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
} 
