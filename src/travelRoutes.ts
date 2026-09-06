import { centroid } from "@turf/centroid";
import type { FeatureCollection, Feature } from "geojson";
import type { Neo4jPath } from "./etymologyTree";

// Great-circle interpolation on the sphere (slerp) — avoids pulling in a
// heavier turf dependency for a single geodesic utility.
const RAD = Math.PI / 180;

function toVec([lon, lat]: [number, number]): [number, number, number] {
  const phi = lat * RAD;
  const lambda = lon * RAD;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
}

function toLonLat(v: [number, number, number]): [number, number] {
  return [
    Math.round((Math.atan2(v[1], v[0]) / RAD) * 1e6) / 1e6,
    Math.round((Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD) * 1e6) / 1e6,
  ];
}

export function greatCircleCoordinates(
  from: [number, number],
  to: [number, number],
  points = 64,
): [number, number][] {
  const a = toVec(from);
  const b = toVec(to);
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return [from, to];

  const sinOmega = Math.sin(omega);
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const k1 = Math.sin((1 - t) * omega) / sinOmega;
    const k2 = Math.sin(t * omega) / sinOmega;
    coords.push(toLonLat([k1 * a[0] + k2 * b[0], k1 * a[1] + k2 * b[1], k1 * a[2] + k2 * b[2]]));
  }
  return coords;
}

// Consecutive aged pairs across every etymology path. Each record's path is
// ordered head (modern word) → oldest ancestor, so chains reversed become
// travel sequences. Pairs are deduped so overlapping branches render once.
export function extractChainPairs(graph: Neo4jPath[]): [string, string][] {
  const seen = new Set<string>();
  const pairs: [string, string][] = [];

  for (const { path } of graph ?? []) {
    if (!path) continue;
    const langs = path.Nodes.map((node) => node.Props.lang).filter(
      (lang): lang is string => typeof lang === "string",
    );
    const chain = langs.reverse();
    for (let i = 0; i < chain.length - 1; i++) {
      const from = chain[i];
      const to = chain[i + 1];
      if (from === to) continue;
      const key = `${from}|${to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([from, to]);
    }
  }

  return pairs;
}

export interface TravelRoutes {
  geojson: FeatureCollection;
  chain: [string, string][];
}

function featurePoint(feature: Feature): [number, number] | null {
  const center = centroid(feature);
  const coords = center.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = coords[0];
  const lat = coords[1];
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

export function buildTravelRoutes(
  graph: Neo4jPath[],
  geometry: FeatureCollection,
): TravelRoutes | null {
  const pairs = extractChainPairs(graph);
  if (pairs.length === 0) return null;

  const features: Feature[] = [];

  for (const [fromLang, toLang] of pairs) {
    const findRegion = (lang: string) => {
      let best: Feature | null = null;
      let bestCount = -1;
      for (const feature of geometry.features) {
        const props = (feature.properties ?? {}) as {
          lang?: string;
          name?: string;
          count?: number;
        };
        const name = props.lang ?? props.name ?? "";
        if (!name.startsWith(lang)) continue;
        const count = Number(props.count) || 0;
        if (count > bestCount) {
          bestCount = count;
          best = feature;
        }
      }
      return best;
    };

    const fromFeature = findRegion(fromLang);
    const toFeature = findRegion(toLang);
    const fromPt = fromFeature && featurePoint(fromFeature);
    const toPt = toFeature && featurePoint(toFeature);
    if (!fromPt || !toPt) continue;

    features.push({
      type: "Feature",
      properties: { from: fromLang, to: toLang },
      geometry: {
        type: "LineString",
        coordinates: greatCircleCoordinates(fromPt, toPt),
      },
    });
  }

  if (features.length === 0) return null;

  return { geojson: { type: "FeatureCollection", features }, chain: pairs };
}
