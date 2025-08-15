import DatanestClient from "../src";
import { archiveProject, createProject, Project, ProjectCreationData } from "../src/projects";

export function makeTestProjectNumber() {
    return 'test:' + Math.random().toString(36).substring(7);
}

export class ProjectPurger {
    private projectUUIDsToCleanUp: string[] = [];

    async createTestProject(client: DatanestClient, projectData: Omit<ProjectCreationData, 'project_number'> & Partial<Project>) {
        const project = await createProject(client, {
            project_address: '15/14 Broad Street, Christchurch',
            ...projectData,
            project_number: projectData.project_number || makeTestProjectNumber(),
        });
        this.projectUUIDsToCleanUp.push(project.project.uuid);
        return project;
    }

    async cleanup() {
        const client = new DatanestClient();
        const promises = this.projectUUIDsToCleanUp.map(uuid => archiveProject(client, uuid, { force_delete: true }));
        this.projectUUIDsToCleanUp = [];
        await Promise.all(promises);
    }
}
