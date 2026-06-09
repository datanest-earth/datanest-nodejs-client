import { it, expect } from 'bun:test';
import DatanestClient from '../src';
import { listProjectFigureLayerItems, listProjectFigureLayers, listProjectFigures } from '../src/maps';

if (process.env.DATANEST_API_KEY && process.env.DATANEST_API_SECRET && process.env.DATANEST_API_BASE_URL) {
    it('GET project figures, get figure layers, get items in default group', async () => {
        const client = new DatanestClient();
        const mapsProjectUuid = process.env.MAPS_PROJECT_UUID || process.env.ENVIRO_PROJECT_UUID || 'd91c8a4e-5dc8-48ba-bdc1-5584ff94b4c9';
        const figures = await listProjectFigures(client, mapsProjectUuid);

        expect(Array.isArray(figures.data)).toBe(true);
        if (!figures.data.length) {
            console.warn('No files found, skipping test');
            return;
        }
        expect(typeof figures.data[0].id).toBe('number');
        expect(figures.data[0].project_uuid).toBe(mapsProjectUuid);
        expect(typeof figures.data[0].title).toBe('string');

        const defaultFigure = figures.data.find(figure => figure.figure_no === '1')!;
        expect(defaultFigure).toEqual(expect.any(Object));

        const figureLayers = await listProjectFigureLayers(client, mapsProjectUuid, defaultFigure.id);
        expect(Array.isArray(figureLayers.data)).toBe(true);

        const figureDefaultGroup = figureLayers.data.find(figure => figure.is_default_item_group)!;
        expect(figureDefaultGroup).toEqual(expect.any(Object));
        expect(typeof figureDefaultGroup.group_marker_key).toBe('string');
        expect(typeof figureDefaultGroup.marker_svg_url).toBe('string');
        expect(typeof figureDefaultGroup.marker_color).toBe('string');
        expect(figureDefaultGroup.project_uuid).toBe(mapsProjectUuid);

        const items = await listProjectFigureLayerItems(client, mapsProjectUuid, defaultFigure.id, figureDefaultGroup.id);
        expect(Array.isArray(items.data)).toBe(true);
        if (items.data.length) {
            expect(typeof items.data[0].id).toBe('number');
            expect(items.data[0].project_uuid).toBe(mapsProjectUuid);
            expect(typeof items.data[0].title).toBe('string');
        }

        const bboxItems = await listProjectFigureLayerItems(client, mapsProjectUuid, defaultFigure.id, figureDefaultGroup.id, {
            bbox: [
                176.3116908,
                -37.7083753,
                176.3120186,
                -37.7079616
            ]
        });

        expect(Array.isArray(bboxItems.data)).toBe(true);
        expect(bboxItems.data.length).toBeLessThan(items.data.length);
        if (bboxItems.data.length === 0) {
            console.warn('Warning: No items found in the bounding box, unable to verify bbox filter worked');
        }
    });
} else {
    it('Skipping integration tests', () => { });
    console.warn('[WARN] Skipping integration tests because DATANEST_API_KEY, DATANEST_API_SECRET or DATANEST_API_BASE_URL is not set.');
}