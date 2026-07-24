import DatanestClient from "../src";
import { archiveProject, createProject, Project, ProjectCreationData } from "../src/projects";
import { getCompanyUsers } from "../src/users";

export function makeTestProjectNumber() {
    return 'test:' + Math.random().toString(36).substring(7);
}

class ProjectPurger {
    private projectUUIDsToCleanUp: string[] = [];
    private defaultProjectManagerEmail?: string;

    /**
     * Ensure creates always send a valid project_manager.
     * Local API keys can resolve to a missing/soft-deleted creator user_id, which
     * otherwise inserts projects without a valid users FK.
     */
    private async resolveDefaultProjectManagerEmail(client: DatanestClient) {
        if (this.defaultProjectManagerEmail) {
            return this.defaultProjectManagerEmail;
        }
        const companyUsers = await getCompanyUsers(client);
        const projectManager = companyUsers.data[0];
        if (!projectManager?.email) {
            throw new Error('No company users available to assign as project manager for test projects');
        }
        this.defaultProjectManagerEmail = projectManager.email;
        return this.defaultProjectManagerEmail;
    }

    async createTestProject(client: DatanestClient, projectData: Omit<ProjectCreationData, 'project_number'> & Partial<Project>) {
        const hasExplicitManager = !!(projectData.project_manager || projectData.project_manager_uuid);
        const project = await createProject(client, {
            project_address: '123 Fake Street',
            address_locality: 'Sydenham',
            address_city: 'Christchurch',
            address_state: 'Canterbury',
            address_postcode: '8023',
            latitude: -43.5592767,
            longitude: 172.6845183,
            ...(!hasExplicitManager
                ? { project_manager: await this.resolveDefaultProjectManagerEmail(client) }
                : {}),
            ...projectData,
            project_number: projectData.project_number || makeTestProjectNumber(),
        });
        this.projectUUIDsToCleanUp.push(project.project.uuid);
        return project;
    }

    preserveProject(projectUuid: string) {
        console.warn('Preserving project', projectUuid);
        this.projectUUIDsToCleanUp = this.projectUUIDsToCleanUp.filter(uuid => uuid !== projectUuid);
    }

    async cleanup() {
        const client = new DatanestClient();
        const promises = this.projectUUIDsToCleanUp.map(uuid => archiveProject(client, uuid, { force_delete: true }));
        this.projectUUIDsToCleanUp = [];
        await Promise.all(promises);
    }
}

export const projectPurger = new ProjectPurger();
