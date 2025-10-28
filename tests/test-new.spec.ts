import dotenv from 'dotenv';
import { beforeAll, expect, it } from 'vitest';
import { assignProjectWorkflowAppUser, CompanyWorkflow, getCompanyCustomRoles, getCompanyWorkflow, getCompanyWorkflows, getLatestPublishedWorkflowFromList, unassignProjectWorkflowAppUser } from '../src/workflows';
import DatanestClient, { DatanestResponseError } from '../src';
import { patchProject, ProjectType, waitForProjectWorkflow } from '../src/projects';
import { addExternalUserToProject, getProjectTeam, removeProjectTeamMember, updateProjectMemberRole } from '../src/teams';
import { User } from '../src/users';
import { getCompanyUsers } from '../src/users';
import { projectPurger } from './project-cleanup';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    let firstProjectManager: User;
    let otherUser: User;
    let companyUsers: User[];
    const client = new DatanestClient();

    beforeAll(async () => {
        companyUsers = (await getCompanyUsers(client)).data;
        firstProjectManager = companyUsers[0];
        let attempts = 0;
        while (true) {
            otherUser = companyUsers[attempts];
            if (otherUser.email !== firstProjectManager.email) {
                break;
            }
            attempts++;
            if (attempts >= companyUsers.length) {
                throw new Error('Failed to find a random user that is not the project manager');
            }
        }
    });





 




} else {
    it.only('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}
