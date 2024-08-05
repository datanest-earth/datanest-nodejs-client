import { Item } from "./gather";
import DatanestClient, { PaginatedResponse, SoftDelete, Timestamp, Timestamps, UUID } from "./index";

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

export type Figure = {
    id: number;
    project_uuid: string;
    title: string;
    figure_no: string | null;
    figure_no_prefix: string | null;
    basemap_index: number;
    legend_type: string;
    is_basemap_figure: boolean;
    custom_print_layout_id: number | null;
    date: string | null;
    drawn_by: string | null;
    checked_by: string | null;
    version: string | null;
    locked_layer_ids: string | null;
    basemap_image: string | null;
    basemap_image_bounds: string | null;
    legend_font_size: number;
    minimap_location: string | null;
    minimap_basemap: number;
    site_boundary_indicator_type: number;
    site_boundary_indicator_size: number;
    north_arrow_type: number;
    north_arrow_size: number;
    popup_font_size: number;
    view_lat: number;
    view_lng: number;
    view_scale: number;
    view_rotation: number;
    view_size: number;
    view_orientation: string;
    view_projection: string;
    view_zoom: number;
    show_view_projection: boolean;
    show_site_boundary_indicator: boolean;
    hide_sample_labels: boolean;
    hide_legend_attributes: boolean;
    hide_sample_exceedance_styling: boolean;
    hide_ecs_without_exceedances: boolean;
    hide_chemicals_without_exceedances: boolean;
    hide_scenario_exceedances_in_legend: boolean;
    hide_non_detect_chemicals: boolean;
    has_gather_access: boolean;
    has_scale_bar: boolean;
    has_minimap: boolean;
    has_north_arrow: boolean;
    has_been_exported: boolean;
    has_site_boundary_default: boolean;
    has_callouts_decluttering_enabled: boolean;
    has_auto_fit_legend_items: boolean;
} & Timestamps & SoftDelete;

export type FigureLayer = {
    id: number,
    project_uuid: UUID,
    figure_id: number,
    title: string,
    type: "item_group" | string,
    is_default_item_group: true,
    /** Internal unique identifier for the group */
    group_marker_key: "0_#000000",
    /** URL to SVG image */
    marker_svg_url: "http://datanest.localhost:8080/markers/1",
    /** HEX color code */
    marker_color: string,
    bbox: BBox | null,
    geojson: GeoJsonFeature | null,
} & Timestamps & SoftDelete;

export async function listProjectFigures(client: DatanestClient, projectUuid: string): Promise<PaginatedResponse<Figure>> {
    const figures = await client.get(`/v1/projects/${projectUuid}/figures`);
    return (await figures.json()) as PaginatedResponse<Figure>;
}

export async function listProjectFigureLayers(client: DatanestClient, projectUuid: string, figureId: number): Promise<PaginatedResponse<FigureLayer>> {
    const layers = await client.get(`/v1/projects/${projectUuid}/figures/${figureId}/layers`);
    return (await layers.json()) as PaginatedResponse<FigureLayer>;
}

export async function listProjectFigureLayerItems(client: DatanestClient, projectUuid: string, figureId: number, layerId: number, options?: { bbox?: BBox }): Promise<PaginatedResponse<Item>> {
    const items = await client.get(`/v1/projects/${projectUuid}/figures/${figureId}/layers/${layerId}/items`, {
        ...(options?.bbox ? { bbox: options.bbox.join(",") } : {}),
    });
    return (await items.json()) as PaginatedResponse<Item>;
}