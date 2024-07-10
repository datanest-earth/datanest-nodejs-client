export type GeoJsonFeature = {
    type: "Feature";
    geometry: {
        type: "Point";
        coordinates: LongLat;
    } | {
        type: "Polygon";
        coordinates: LongLat[][];
    } | {
        type: "LineString";
        coordinates: LongLat[];
    };
    bbox?: BBox;
    properties: Record<string, any>;
};

/** Coordinates in AGS84. Order: [long, lat] */
export type LongLat = [number, number];

/**
 * Bounding box in AGS84 coordinates.
 * Order: [minLong, minLat, maxLong, maxLat]
 */
export type BBox = [number, number, number, number];