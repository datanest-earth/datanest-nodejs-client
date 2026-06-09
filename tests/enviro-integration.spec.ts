import { beforeAll, describe, it, expect } from 'bun:test';
import DatanestClient, { enviro, projects } from '../src';
import { ProjectType } from '../src/projects';
import { EnviroMatrix } from '../src/enviro';
import { expectGeoJsonPointForItem } from './lib/geojson-assertions';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {

    describe('Enviro Company Integration Tests', () => {
        it('GET v1/enviro/matrices - List all Enviro Matrices', async () => {
            const client = new DatanestClient();
            const companyMatrices = await enviro.getAllEnviroMatrices(client);

            expect(Array.isArray(companyMatrices.matrices)).toBe(true);
            expect(companyMatrices.matrices.length).toBe(5);

            expect(typeof companyMatrices.matrices[0].matrix_id).toBe('number');
            expect(typeof companyMatrices.matrices[0].matrix).toBe('string');
            expect(Array.isArray(companyMatrices.matrices[0].aliases)).toBe(true);

            const matrices = companyMatrices.matrices.map(matrix => matrix.matrix);
            for (const m of [
                'soil', 'water', 'soilgas', 'leachate', 'sediment'
            ] as EnviroMatrix[]) {
                expect(matrices).toContain(m);
            }
        });

        it('GET v1/enviro/chemicals - List all Enviro Chemicals', async () => {
            const client = new DatanestClient();
            const companyMatrices = await enviro.getAllEnviroChemicals(client);

            expect(Array.isArray(companyMatrices.data)).toBe(true);
        });

        it('GET v1/enviro/chemicals/alias-profiles - Chemical Aliases Profiles', async () => {
            const client = new DatanestClient();
            const companyProfiles = await enviro.getCompanyChemicalProfiles(client);

            expect(Array.isArray(companyProfiles.profiles)).toBe(true);
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
        }, 90000);

        it('GET v1/projects/:project_uuid/enviro/matrices - List matrices active in project', async () => {
            const client = new DatanestClient();
            const projectMatrices = await enviro.getProjectMatrices(client, projectUuid);

            expect(Array.isArray(projectMatrices.matrices)).toBe(true);

            if (projectMatrices.matrices.length === 0) {
                console.error('No matrices found in project');
                return;
            }
            expect(typeof projectMatrices.matrices[0].matrix_id).toBe('number');
            expect(typeof projectMatrices.matrices[0].matrix).toBe('string');
            expect(Array.isArray(projectMatrices.matrices[0].aliases)).toBe(true);
        });

        it('List project scenarios, get scenario standards and guideline values, filter guideline values', async () => {
            const client = new DatanestClient();
            const projectScenarios = await enviro.getProjectScenarios(client, projectUuid);

            expect(Array.isArray(projectScenarios.scenarios)).toBe(true);

            if (projectScenarios.scenarios.length === 0) {
                console.warn('WARNING:No matrices found in project');
                return;
            }
            expect(typeof projectScenarios.scenarios[0].id).toBe('number');
            expect(projectScenarios.scenarios[0].options).toEqual(expect.any(Object));

            const scenario = projectScenarios.scenarios[0];
            expect(Object.keys(scenario)).toEqual(expect.arrayContaining(['assessed', 'scenario', 'criteria_set', 'standard']));

            if (scenario.assessed) {
                expect(typeof scenario.assessed.assessed_id).toBe('number');
            }

            if (scenario.scenario) {
                expect(typeof scenario.scenario.id).toBe('number');
                expect(scenario.scenario.full_title === null || typeof scenario.scenario.full_title === 'string').toBe(true);
                expect(typeof scenario.scenario.land_use).toBe('string');
                expect(typeof scenario.scenario.matrix).toBe('string');
                expect(scenario.scenario.type === null || typeof scenario.scenario.type === 'string').toBe(true);
            }

            if (scenario.standard) {
                expect(typeof scenario.standard.standard_id).toBe('number');
                expect(typeof scenario.standard.batch).toBe('number');
                expect(typeof scenario.standard.country).toBe('string');
                expect(typeof scenario.standard.matrix).toBe('string');
                expect(typeof scenario.standard.standard_identifier).toBe('string');
                expect(typeof scenario.standard.standard_url === 'string' || scenario.standard.standard_url === null).toBe(true);
                expect(typeof scenario.standard.standard).toBe('string');
                expect(typeof scenario.standard.acronym).toBe('string');
                expect(typeof scenario.standard.new_revision_standard_id).toBe('number');
                expect(typeof scenario.standard.by_standard_specific).toBe('boolean');
            }

            if (scenario.criteria_set) {
                expect(typeof scenario.criteria_set.title).toBe('string');
                expect(typeof scenario.criteria_set.matrix).toBe('string');
                expect(scenario.criteria_set.comments === null || typeof scenario.criteria_set.comments === 'string').toBe(true);
                expect(scenario.criteria_set.user_uuid === null || typeof scenario.criteria_set.user_uuid === 'string').toBe(true);
                expect(typeof scenario.criteria_set.is_approved).toBe('boolean');
                expect(typeof scenario.criteria_set.exclude_non_detects).toBe('boolean');
                expect(typeof scenario.criteria_set.is_background).toBe('boolean');
            }

            const [scenarioGuidelines, scenarioStandards] = await Promise.all([
                enviro.getProjectScenarioGuidelines(client, projectUuid, scenario.id),
                enviro.getProjectScenarioStandards(client, projectUuid, scenario.id),
            ]);
            expect(Array.isArray(scenarioGuidelines.data)).toBe(true);
            expect(Array.isArray(scenarioStandards.data)).toBe(true);

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
                expect(standardIds).toContain(standard.standard_id);
            }
            expect(filteredStandards.data.map(standard => standard.standard_id).filter((value, index, self) => self.indexOf(value) === index)).toHaveLength(standardIds.length);
            for (const guideline of filteredGuidelinesByStandard.data) {
                expect(standardIds).toContain(guideline.standard_id);
            }
            expect(filteredGuidelinesByStandard.data.map(guideline => guideline.standard_id).filter((value, index, self) => self.indexOf(value) === index)).toHaveLength(standardIds.length);

            for (const guideline of filteredGuidelinesByChemical.data) {
                expect(chemicalIds).toContain(guideline.chemical_id);
            }
            expect(filteredGuidelinesByChemical.data.map(guideline => guideline.chemical_id).filter((value, index, self) => self.indexOf(value) === index).length).toBeLessThanOrEqual(chemicalIds.length);

            for (const guideline of filteredGuidelinesByBoth.data) {
                expect(standardIds).toContain(guideline.standard_id);
                expect(chemicalIds).toContain(guideline.chemical_id);
            }
            expect(filteredGuidelinesByBoth.data.map(guideline => guideline.standard_id).filter((value, index, self) => self.indexOf(value) === index).length).toBeLessThanOrEqual(standardIds.length);
            expect(filteredGuidelinesByBoth.data.map(guideline => guideline.chemical_id).filter((value, index, self) => self.indexOf(value) === index).length).toBeLessThanOrEqual(chemicalIds.length);
        });

        it('GET v1/projects/:project_uuid/enviro/samples/chemical-results', async () => {
            const client = new DatanestClient();
            const results = await enviro.getProjectSampleChemicalResults(client, projectUuid);

            expect(Array.isArray(results.data)).toBe(true);
            if (results.data.length === 0) {
                console.warn('WARNING: No chemical results found in project');
                return;
            }

            const sample = results.data[0];
            expect(typeof sample.result_id).toBe('number');
            expect(typeof sample.sample_id).toBe('number');
            expect(typeof sample.chemical_id).toBe('number');
            expect(typeof sample.chemical_title).toBe('string');
            expect(typeof sample.chemical_casno).toBe('string');
            expect(typeof sample.matrix).toBe('string');
            expect(typeof sample.result).toBe('number');

            const uniqueCasNos = results.data.map(sample => sample.chemical_casno).filter((value, index, self) => self.indexOf(value) === index).slice(0, 5);
            const uniqueSampleIds = results.data.map(sample => sample.sample_id).filter((value, index, self) => self.indexOf(value) === index).slice(0, 5);

            const filteredRequest = await enviro.getProjectSampleChemicalResults(client, projectUuid, {
                casno: uniqueCasNos,
                sample_ids: uniqueSampleIds,
            });

            // results should not include any other casno or sample_id
            for (const sample of filteredRequest.data) {
                expect(uniqueCasNos).toContain(sample.chemical_casno);
                if (!sample.linked_sample_id || !uniqueSampleIds.includes(sample.linked_sample_id)) {
                    expect(uniqueSampleIds).toContain(sample.sample_id);
                }
            }
        });

        it('GET v1/projects/:project_uuid/enviro/samples/locations - Include GeoJSON when requested', async () => {
            const client = new DatanestClient();
            const sampleLocations = await enviro.getProjectSampleLocations(client, projectUuid, {
                include_geojson: true,
            });

            expect(Array.isArray(sampleLocations.data)).toBe(true);
            if (sampleLocations.data.length === 0) {
                console.warn('WARNING: No sample locations found in project');
                return;
            }

            const geoJsonLocation = sampleLocations.data.find(item => item.geojson);
            if (!geoJsonLocation) {
                console.warn('WARNING: No sample locations with GeoJSON found in project');
                return;
            }

            expect(geoJsonLocation.project_uuid).toBe(projectUuid);
            expect(typeof geoJsonLocation.title).toBe('string');
            expectGeoJsonPointForItem(geoJsonLocation);
        });
    });

} else {
    it('Skipping enviro integration tests', () => { });
    console.warn('[WARN] Skipping enviro integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}