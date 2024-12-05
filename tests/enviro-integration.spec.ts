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

        it('GET v1/enviro/chemicals/alias-profiles - Chemical Aliases Profiles', { timeout: 10000 }, async () => {
            const client = new DatanestClient();
            const companyProfiles = await enviro.getCompanyChemicalProfiles(client);

            expect(companyProfiles.profiles).is.an('array');
        });
    });

    describe('Enviro Project Integration Tests', () => {
        let projectUuid = '';
        beforeAll(async () => {
            if (process.env.ENVIRO_PROJECT_UUID) {
                projectUuid = process.env.ENVIRO_PROJECT_UUID;
                return;
            }
            const client = new DatanestClient();
            const enviroProjects = await projects.listProjects(client, 1, false, {
                project_type: ProjectType.PROJECT_TYPE_ENVIRO,
            });
            if (enviroProjects.data.length === 0) {
                console.warn('WARNING: No Enviro projects found');
            }

            projectUuid = enviroProjects.data[0].uuid;
        });

        it('GET v1/projects/:project_uuid/enviro/matrices - List matrices active in project', async () => {
            const client = new DatanestClient();
            const projectMatrices = await enviro.getProjectMatrices(client, projectUuid);

            expect(projectMatrices.matrices).is.an('array');

            if (projectMatrices.matrices.length === 0) {
                console.error('No matrices found in project');
                return;
            }
            expect(projectMatrices.matrices[0].matrix_id).is.a('number');
            expect(projectMatrices.matrices[0].matrix).is.a('string');
            expect(projectMatrices.matrices[0].aliases).is.an('array');
        });

        it('List project scenarios, get scenario standards and guideline values, filter guideline values', async () => {
            const client = new DatanestClient();
            const projectScenarios = await enviro.getProjectScenarios(client, projectUuid);

            expect(projectScenarios.scenarios).is.an('array');

            if (projectScenarios.scenarios.length === 0) {
                console.warn('WARNING:No matrices found in project');
                return;
            }
            expect(projectScenarios.scenarios[0].id).is.a('number');
            expect(projectScenarios.scenarios[0].options).is.an('object');

            const scenario = projectScenarios.scenarios[0];
            expect(scenario).to.contain.keys(['assessed', 'scenario', 'criteria_set', 'standard']);

            if (scenario.assessed) {
                expect(scenario.assessed.assessed_id).is.a('number');
            }

            if (scenario.scenario) {
                expect(scenario.scenario.id).is.a('number');
                expect(scenario.scenario.full_title).is.oneOf([null, 'string']);
                expect(scenario.scenario.land_use).is.a('string');
                expect(scenario.scenario.matrix).is.a('string');
                expect(scenario.scenario.type).is.oneOf([null, 'string']);
            }

            if (scenario.standard) {
                expect(scenario.standard.standard_id).is.a('number');
                expect(scenario.standard.batch).is.a('number');
                expect(scenario.standard.country).is.a('string');
                expect(scenario.standard.matrix).is.a('string');
                expect(scenario.standard.standard_identifier).is.a('string');
                expect(scenario.standard.standard_url).is.oneOf(['string', null]);
                expect(scenario.standard.standard).is.a('string');
                expect(scenario.standard.acronym).is.a('string');
                expect(scenario.standard.new_revision_standard_id).is.a('number');
                expect(scenario.standard.by_standard_specific).is.a('boolean');
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

            const [scenarioGuidelines, scenarioStandards] = await Promise.all([
                enviro.getProjectScenarioGuidelines(client, projectUuid, scenario.id),
                enviro.getProjectScenarioStandards(client, projectUuid, scenario.id),
            ]);
            expect(scenarioGuidelines.data).is.an('array');
            expect(scenarioStandards.data).is.an('array');

            // get first two unique ids
            const standardIds = scenarioStandards.data.map(standard => standard.standard_id).filter((value, index, self) => self.indexOf(value) === index).slice(0, 2);
            const chemicalIds = scenarioGuidelines.data.map(guideline => guideline.chemical_id).filter((value, index, self) => self.indexOf(value) === index).slice(0, 2);

            const [filteredStandards, filteredGuidelinesByStandard, filteredGuidelinesByChemical, filteredGuidelinesByBoth] = await Promise.all([
                enviro.getProjectScenarioStandards(client, projectUuid, scenario.id, { standard_ids: standardIds }),
                enviro.getProjectScenarioGuidelines(client, projectUuid, scenario.id, { standard_ids: standardIds }),
                enviro.getProjectScenarioGuidelines(client, projectUuid, scenario.id, { chemical_ids: chemicalIds }),
                enviro.getProjectScenarioGuidelines(client, projectUuid, scenario.id, { standard_ids: standardIds, chemical_ids: chemicalIds }),
            ]);

            for (const standard of filteredStandards.data) {
                expect(standardIds).contains(standard.standard_id);
            }
            expect(filteredStandards.data.map(standard => standard.standard_id).filter((value, index, self) => self.indexOf(value) === index)).to.have.lengthOf(standardIds.length);
            for (const guideline of filteredGuidelinesByStandard.data) {
                expect(standardIds).contains(guideline.standard_id);
            }
            expect(filteredGuidelinesByStandard.data.map(guideline => guideline.standard_id).filter((value, index, self) => self.indexOf(value) === index)).to.have.lengthOf(standardIds.length);

            for (const guideline of filteredGuidelinesByChemical.data) {
                expect(chemicalIds).contains(guideline.chemical_id);
            }
            expect(filteredGuidelinesByChemical.data.map(guideline => guideline.chemical_id).filter((value, index, self) => self.indexOf(value) === index)).to.have.length.lessThanOrEqual(chemicalIds.length);

            for (const guideline of filteredGuidelinesByBoth.data) {
                expect(standardIds).contains(guideline.standard_id);
                expect(chemicalIds).contains(guideline.chemical_id);
            }
            expect(filteredGuidelinesByBoth.data.map(guideline => guideline.standard_id).filter((value, index, self) => self.indexOf(value) === index)).to.have.length.lessThanOrEqual(standardIds.length);
            expect(filteredGuidelinesByBoth.data.map(guideline => guideline.chemical_id).filter((value, index, self) => self.indexOf(value) === index)).to.have.length.lessThanOrEqual(chemicalIds.length);
        });

        it('GET v1/projects/:project_uuid/enviro/samples/chemical-results', async () => {
            const client = new DatanestClient();
            const results = await enviro.getProjectSampleChemicalResults(client, projectUuid);

            expect(results.data).is.an('array');
            if (results.data.length === 0) {
                console.warn('WARNING: No chemical results found in project');
                return;
            }

            const sample = results.data[0];
            expect(sample.result_id).is.a('number');
            expect(sample.sample_id).is.a('number');
            expect(sample.chemical_id).is.a('number');
            expect(sample.chemical_title).is.a('string');
            expect(sample.chemical_casno).is.a('string');
            expect(sample.matrix).is.a('string');
            expect(sample.result).is.an('number');

            const uniqueCasNos = results.data.map(sample => sample.chemical_casno).filter((value, index, self) => self.indexOf(value) === index).slice(0, 5);
            const uniqueSampleIds = results.data.map(sample => sample.sample_id).filter((value, index, self) => self.indexOf(value) === index).slice(0, 5);

            const filteredRequest = await enviro.getProjectSampleChemicalResults(client, projectUuid, {
                casno: uniqueCasNos,
                sample_ids: uniqueSampleIds,
            });

            // results should not include any other casno or sample_id
            for (const sample of filteredRequest.data) {
                expect(uniqueCasNos).contains(sample.chemical_casno);
                if (!sample.linked_sample_id || !uniqueSampleIds.includes(sample.linked_sample_id)) {
                    expect(uniqueSampleIds).contains(sample.sample_id);
                }
            }
        });
    });

} else {
    it('Skipping enviro integration tests', () => { });
    console.warn('[WARN] Skipping enviro integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}