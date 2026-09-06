import maplibregl from "maplibre-gl";
import type { FeatureCollection, Feature } from "geojson";

export interface RegionProperties {
  id?: string;
  name?: string;
  lang?: string;
  count?: number;
  family?: string;
  familyCode?: string;
  ancestors?: string;
  ADMIN?: string;
  ISO_A3?: string;
  ISO_A2?: string;
}

export interface NormalizedProps {
  id: string;
  name: string;
  lang: string;
  count: number;
  family: string;
  familyCode: string;
  ancestors: string;
}

export function normalizeGeometry(geometry: FeatureCollection): FeatureCollection {
  const seen = new Set<string>();
  const features: Feature[] = [];

  for (const feature of geometry.features) {
    const raw = (feature.properties ?? {}) as RegionProperties;
    const name = raw.name ?? raw.ADMIN ?? raw.id;
    if (!name) continue;

    // A stable code (glottocode or ISO code) uniquely identifies a region, so
    // duplicate codes are collapsed. Features that carry only a name may
    // legitimately repeat (geography regions split into multiple polygons),
    // so those are all kept.
    const stableId = raw.id ?? raw.ISO_A3 ?? raw.ISO_A2;
    if (stableId) {
      if (seen.has(stableId)) continue;
      seen.add(stableId);
    }

    const id = stableId ?? name;
    const countValue = Number(raw.count);
    const count = Number.isFinite(countValue) && countValue > 0 ? Math.round(countValue) : 1;

    features.push({
      ...feature,
      properties: {
        id,
        name,
        lang: raw.lang ?? name,
        count,
        family: raw.family ?? "",
        familyCode: raw.familyCode ?? "",
        ancestors: raw.ancestors ?? "",
      },
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
  const title = escapeHtml(props.family || props.name);
  const subtitle = props.family ? escapeHtml(props.name) : "";
  return (
    `<div style="font-size:13px;font-weight:600;color:#18181b;">${title}</div>` +
    (subtitle ? `<div style="font-size:11px;color:#71717a;">${subtitle}</div>` : "")
  );
}

export interface Bounds {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface WeightedBounds {
  bounds: Bounds;
  count: number;
}

// Fraction of the total weighted count that the fitted view must retain.
// The remainder (the fringe) is allowed to be cropped out.
export const MAJORITY_FRACTION = 0.8;

function accumulateCoordinates(bounds: Bounds, coords: unknown) {
  if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
    const lon = coords[0] as number;
    const lat = coords[1] as number;
    if (lon < bounds.minLon) bounds.minLon = lon;
    if (lon > bounds.maxLon) bounds.maxLon = lon;
    if (lat < bounds.minLat) bounds.minLat = lat;
    if (lat > bounds.maxLat) bounds.maxLat = lat;
    return;
  }
  if (Array.isArray(coords)) {
    for (const child of coords) accumulateCoordinates(bounds, child);
  }
}

export function computeFeatureBounds(feature: Feature): Bounds | null {
  const geometry = feature.geometry as { coordinates?: unknown } | null;
  if (!geometry || !("coordinates" in geometry) || geometry.coordinates == null) return null;

  const bounds: Bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };
  accumulateCoordinates(bounds, geometry.coordinates);
  return bounds.minLon === Infinity ? null : bounds;
}

function unionBounds(items: WeightedBounds[]): Bounds {
  const bounds: Bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  };
  for (const item of items) {
    if (item.bounds.minLon < bounds.minLon) bounds.minLon = item.bounds.minLon;
    if (item.bounds.maxLon > bounds.maxLon) bounds.maxLon = item.bounds.maxLon;
    if (item.bounds.minLat < bounds.minLat) bounds.minLat = item.bounds.minLat;
    if (item.bounds.maxLat > bounds.maxLat) bounds.maxLat = item.bounds.maxLat;
  }
  return bounds;
}

function boundsArea(bounds: Bounds): number {
  return (bounds.maxLon - bounds.minLon) * (bounds.maxLat - bounds.minLat);
}

function isOnBoundary(bounds: Bounds, current: Bounds): boolean {
  return (
    bounds.minLon === current.minLon ||
    bounds.maxLon === current.maxLon ||
    bounds.minLat === current.minLat ||
    bounds.maxLat === current.maxLat
  );
}

// Greedily remove the feature that shrinks the bounding box the most, as long
// as the retained features still hold at least `fraction` of the total count.
// This keeps the bulk of the polygons in view while cropping far-flung outliers.
export function trimToMajority(
  items: WeightedBounds[],
  fraction = MAJORITY_FRACTION,
): WeightedBounds[] {
  if (items.length <= 1) return items;

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const target = total * fraction;

  let kept = items;
  for (;;) {
    const current = unionBounds(kept);
    const currentArea = boundsArea(current);
    const keptCount = kept.reduce((sum, item) => sum + item.count, 0);

    let bestIndex = -1;
    let bestReduction = 0;
    for (let i = 0; i < kept.length; i++) {
      if (!isOnBoundary(kept[i].bounds, current)) continue;
      if (keptCount - kept[i].count < target) continue;
      const rest = kept.slice(0, i).concat(kept.slice(i + 1));
      const reduction = currentArea - boundsArea(unionBounds(rest));
      if (reduction > bestReduction) {
        bestReduction = reduction;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    kept = kept.slice(0, bestIndex).concat(kept.slice(bestIndex + 1));
  }

  return kept;
}

export function fitToGeometry(map: maplibregl.Map, geometry: FeatureCollection) {
  const items: WeightedBounds[] = [];
  for (const feature of geometry.features) {
    const bounds = computeFeatureBounds(feature);
    if (!bounds) continue;
    const raw = Number(feature.properties?.count);
    const count = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 1;
    items.push({ bounds, count });
  }
  if (items.length === 0) return;

  const bounds = unionBounds(trimToMajority(items));
  const mapBounds = new maplibregl.LngLatBounds();
  mapBounds.extend([bounds.minLon, bounds.minLat]);
  mapBounds.extend([bounds.maxLon, bounds.maxLat]);
  map.fitBounds(mapBounds, { padding: 60, maxZoom: 8, animate: true, duration: 1500 });
}
