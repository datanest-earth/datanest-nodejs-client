import assert from 'node:assert';
import { expect } from 'bun:test';
import type { Item } from '../../src/gather';

type ItemWithGeoJson = Pick<Item, 'latitude' | 'longitude' | 'geojson'>;

export function expectGeoJsonPointForItem(item: ItemWithGeoJson) {
    expect(item.latitude).not.toBeNull();
    expect(item.longitude).not.toBeNull();
    expect(item.geojson).toBeTruthy();

    const geojson = item.geojson;
    assert(geojson, 'GeoJSON is required');
    expect(geojson.type).toBe('Feature');
    expect(geojson.geometry.type).toBe('Point');
    expect(geojson.geometry.coordinates).toEqual([item.longitude!, item.latitude!]);
    expect(geojson.properties).toEqual(expect.any(Object));
}
