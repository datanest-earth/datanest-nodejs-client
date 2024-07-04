import { it, expect, beforeAll, describe } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient, { enviro, projects } from '../src';
import { ProjectType } from '../src/projects';
import { EnviroMatrix } from '../src/enviro';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    describe('Enviro Company Integration Tests', () => {
        it('GET v1/enviro/matrices - List all Enviro Matrices', async () => {
            const client = new DatanestClient();
            const companyMatrices = await enviro.getAllEnviroMatrices(client);

            expect(companyMatrices.matrices).is.an('array');
            expect(companyMatrices.matrices.length).toBe(5);

            expect(companyMatrices.matrices[0].matrix_id).is.a('number');
            expect(companyMatrices.matrices[0].matrix).is.a('string');
            expect(companyMatrices.matrices[0].aliases).is.an('array');

            const matrices = companyMatrices.matrices.map(matrix => matrix.matrix);
            for (const m of [
                'soil', 'water', 'soilgas', 'leachate', 'sediment'
            ] as EnviroMatrix[]) {
                expect(matrices).contains(m);
            }
        });

        it('GET v1/enviro/chemicals - List all Enviro Chemicals', async () => {
            const client = new DatanestClient();
            const companyMatrices = await enviro.getAllEnviroChemicals(client);

            expect(companyMatrices.data).is.an('array');
        });

        it('GET v1/enviro/chemicals/alias-profiles - Chemical Aliases Profiles', async () => {
            const client = new DatanestClient();
            const companyProfiles = await enviro.getCompanyChemicalProfiles(client);

            expect(companyProfiles.profiles).is.an('array');
        });
    });

    describe('Enviro Project Integration Tests', () => {
        let projectUuid = '';
        beforeAll(async () => {
            const client = new DatanestClient();
            const enviroProjects = await projects.listProjects(client, 1, false, {
                project_type: ProjectType.PROJECT_TYPE_ENVIRO,
            });
            if (enviroProjects.data.length === 0) {
                it.skip('No Enviro projects found');
            }

            projectUuid = enviroProjects.data[0].uuid;
        });

        it('GET v1/projects/:project_uuid/enviro/matrices - List matrices active in project', async () => {
            const client = new DatanestClient();
            const projectMatrices = await enviro.getProjectMatrices(client, projectUuid);

            expect(projectMatrices.matrices).is.an('array');

            if (projectMatrices.matrices.length === 0) {
                it.skip('No matrices found in project');
                return;
            }
            expect(projectMatrices.matrices[0].matrix_id).is.a('number');
            expect(projectMatrices.matrices[0].matrix).is.a('string');
            expect(projectMatrices.matrices[0].aliases).is.an('array');
        });

        it('GET v1/projects/:project_uuid/enviro/scenarios - List project scenario active', async () => {
            const client = new DatanestClient();
            const projectScenarios = await enviro.getProjectScenarios(client, projectUuid);

            expect(projectScenarios.scenarios).is.an('array');

            if (projectScenarios.scenarios.length === 0) {
                it.skip('No matrices found in project');
                return;
            }
            expect(projectScenarios.scenarios[0].id).is.a('number');
            expect(projectScenarios.scenarios[0].options).is.an('object');

            const scenario = projectScenarios.scenarios[0];
            expect(scenario).to.have.keys(['assessed', 'scenario', 'criteria_set', 'document']);

            if (scenario.assessed) {
                expect(scenario.assessed.assessed_id).is.a('number');
            }

            if (scenario.scenario) {
                expect(scenario.scenario.id).is.a('number');
                expect(scenario.scenario.full_title).is.oneOf([null, 'string']);
                expect(scenario.scenario.land_use).is.a('string');
                expect(scenario.scenario.media).is.a('string');
                expect(scenario.scenario.type).is.oneOf([null, 'string']);
            }

            if (scenario.document) {
                expect(scenario.document.document_id).is.a('number');
                expect(scenario.document.batch).is.a('number');
                expect(scenario.document.country).is.a('string');
                expect(scenario.document.matrix).is.a('string');
                expect(scenario.document.document_identifier).is.a('string');
                expect(scenario.document.document_url).is.a('string');
                expect(scenario.document.document).is.a('string');
                expect(scenario.document.acronym).is.a('string');
            }

            if (scenario.criteria_set) {
                expect(scenario.criteria_set.title).is.a('string');
                expect(scenario.criteria_set.matrix).is.a('string');
                expect(scenario.criteria_set.comments).is.oneOf([null, 'string']);
                expect(scenario.criteria_set.user_uuid).is.oneOf([null, 'string']);
                expect(scenario.criteria_set.is_approved).is.a('boolean');
                expect(scenario.criteria_set.exclude_non_detects).is.a('boolean');
                expect(scenario.criteria_set.is_background).is.a('boolean');
            }
        });

        it('GET v1/projects/:project_uuid/enviro/samples/chemical-results - List chemicals active in project', async () => {
            const client = new DatanestClient();
            const results = await enviro.getProjectSampleChemicalResults(client, projectUuid);

            expect(results.data).is.an('array');
            if (results.data.length === 0) {
                it.skip('No samples found in project');
                return;
            }

            const sample = results.data[0];
            expect(sample.result_id).is.a('number');
            expect(sample.sample_id).is.a('number');
            expect(sample.chemical_id).is.a('number');
            expect(sample.chemical_title).is.a('string');
            expect(sample.chemical_casno).is.a('string');
            expect(sample.matrix).is.a('string');
            expect(sample.result).is.oneOf(['number', null]);
        });
    });

} else {
    it('Skipping enviro integration tests', () => { });
    console.warn('[WARN] Skipping enviro integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}