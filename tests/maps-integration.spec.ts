import { it, expect } from 'vitest';
import dotenv from 'dotenv';
import DatanestClient from '../src';
import { listProjectFigureLayerItems, listProjectFigureLayers, listProjectFigures } from '../src/maps';

dotenv.config();

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    it('GET project figures, get figure layers, get items in default group', async () => {
        const client = new DatanestClient();
        const mapsProjectUuid = process.env.MAPS_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const figures = await listProjectFigures(client, mapsProjectUuid);

        expect(figures.data).is.an('array');
        if (!figures.data.length) {
            console.warn('No files found, skipping test');
            return;
        }
        expect(figures.data[0].id).is.a('number');
        expect(figures.data[0].project_uuid).to.equal(mapsProjectUuid);
        expect(figures.data[0].title).is.a('string');

        const defaultFigure = figures.data.find(figure => figure.figure_no === '1')!;
        expect(defaultFigure).is.an('object');

        const figureLayers = await listProjectFigureLayers(client, mapsProjectUuid, defaultFigure.id);
        expect(figureLayers.data).is.an('array');

        const figureDefaultGroup = figureLayers.data.find(figure => figure.is_default_item_group)!;
        expect(figureDefaultGroup).is.an('object');
        expect(figureDefaultGroup.group_marker_key).is.a('string');
        expect(figureDefaultGroup.marker_svg_url).is.a('string');
        expect(figureDefaultGroup.marker_color).is.a('string');
        expect(figureDefaultGroup.project_uuid).toBe(mapsProjectUuid);

        const items = await listProjectFigureLayerItems(client, mapsProjectUuid, defaultFigure.id, figureDefaultGroup.id);
        expect(items.data).is.an('array');
        if (items.data.length) {
            expect(items.data[0].id).is.a('number');
            expect(items.data[0].project_uuid).toBe(mapsProjectUuid);
            expect(items.data[0].title).is.a('string');
        }

        const bboxItems = await listProjectFigureLayerItems(client, mapsProjectUuid, defaultFigure.id, figureDefaultGroup.id, {
            bbox: [
                176.3116908,
                -37.7083753,
                176.3120186,
                -37.7079616
            ]
        });

        expect(bboxItems.data).is.an('array');
        expect(bboxItems.data.length).is.lessThan(items.data.length);
        if (bboxItems.data.length === 0) {
            console.warn('Warning: No items found in the bounding box, unable to verify bbox filter worked');
        }
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}