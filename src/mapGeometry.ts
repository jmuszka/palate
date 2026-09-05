import maplibregl from "maplibre-gl";
import type { FeatureCollection, Feature } from "geojson";

export interface RegionProperties {
  id?: string;
  name?: string;
  count?: number;
}

export interface NormalizedProps {
  id: string;
  name: string;
  count: number;
}

export function normalizeGeometry(geometry: FeatureCollection): FeatureCollection {
  const seen = new Set<string>();
  const features: Feature[] = [];

  for (const feature of geometry.features) {
    const raw = (feature.properties ?? {}) as RegionProperties;
    const id = raw.id ?? raw.name;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const name = raw.name ?? id;
    const countValue = Number(raw.count);
    const count = Number.isFinite(countValue) && countValue > 0 ? Math.round(countValue) : 1;

    features.push({
      ...feature,
      properties: { id, name, count },
    });
  }

  return { type: "FeatureCollection", features } as FeatureCollection;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderPopup(props: NormalizedProps): string {
  return `<span style="font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(props.name)}</span>`;
}

export function extendBounds(bounds: maplibregl.LngLatBounds, coords: unknown) {
  if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
    bounds.extend(coords as [number, number]);
    return;
  }
  if (Array.isArray(coords)) {
    for (const child of coords) extendBounds(bounds, child);
  }
}

export function fitToGeometry(map: maplibregl.Map, geometry: FeatureCollection) {
  const bounds = new maplibregl.LngLatBounds();
  for (const feature of geometry.features) {
    if (feature.geometry && "coordinates" in feature.geometry) {
      extendBounds(bounds, feature.geometry.coordinates);
    }
  }
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, { padding: 60, maxZoom: 8, animate: true, duration: 2000 });
}
