import dotenv from 'dotenv';
import { expect, it } from 'vitest';
import { getCompanyWorkflow, getCompanyWorkflows } from '../src/workflows';
import DatanestClient from '../src';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    const client = new DatanestClient();
    it('getCompanyWorkflow: Check workflow revision', async () => {
        const [publishedWorkflows, withDraftWorkflows, withRevisionWorkflows] = [
            await getCompanyWorkflows(client),
            await getCompanyWorkflows(client, { include_drafts: true }),
            await getCompanyWorkflows(client, { include_revisions: true }),
        ];

        expect(publishedWorkflows.meta.total).to.be.greaterThan(0, 'Prerequisite: There should be at least one workflow in the test company');
        expect(withDraftWorkflows.meta.total).to.not.equal(publishedWorkflows.meta.total, 'Prerequisite: There should be at least one draft workflow');
        expect(withRevisionWorkflows.meta.total).to.not.equal(publishedWorkflows.meta.total, 'Prerequisite: There should be at least one revision workflow');

        expect(withDraftWorkflows.meta.total).to.be.greaterThan(publishedWorkflows.meta.total, 'With draft workflows should never be less than without');
        expect(withRevisionWorkflows.meta.total).to.be.greaterThan(publishedWorkflows.meta.total, 'With revision workflows should never be less than without');

        const workflowWithMaxRevision = publishedWorkflows.data.reduce((max, workflow) => {
            if (workflow.published_at === null) {
                return max;
            }
            if (workflow.revision > max.revision) {
                return workflow;
            }
            return max;
        }, publishedWorkflows.data[0]);

        expect(workflowWithMaxRevision.revision).to.be.greaterThan(1, 'Prerequisite: There should be at least one workflow in the test company with revision greater than 1');

        const workflow = await getCompanyWorkflow(client, workflowWithMaxRevision.original_workflow_id);
        expect(workflow.is_latest).to.be.false;
        expect(workflow.revision).to.be.equal(0);
        expect(workflow.latest_revision).to.be.greaterThanOrEqual(workflowWithMaxRevision.revision);
        expect(workflow.latest_revision_id).to.be.greaterThanOrEqual(workflowWithMaxRevision.workflow_id);
        expect(workflow.original_workflow_id).to.be.equal(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.workflow.workflow_id).to.be.equal(workflowWithMaxRevision.original_workflow_id);
        expect(workflow.latest_workflow.workflow_id).to.be.greaterThanOrEqual(workflowWithMaxRevision.workflow_id);

        if (workflow.latest_published_workflow) {
            expect(workflow.latest_published_revision).to.be.greaterThanOrEqual(workflowWithMaxRevision.revision);
            expect(workflow.latest_published_id).to.be.greaterThanOrEqual(workflow.workflow.workflow_id);
            expect(workflow.latest_revision_id).to.be.greaterThanOrEqual(workflow.latest_published_id!);
        } else {
            expect(workflow.latest_published_revision).to.be.null;
            expect(workflow.latest_published_id).to.be.null;
        }
    });
}