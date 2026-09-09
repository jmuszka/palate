import { describe, expect, it, vi } from "vitest";
import type { Feature, FeatureCollection } from "geojson";
import {
  normalizeGeometry,
  escapeHtml,
  renderPopup,
  computeFeatureBounds,
  trimToMajority,
  fitToGeometry,
  smoothGeometry,
} from "./mapGeometry";

const { LngLatBounds } = vi.hoisted(() => {
  class MockLngLatBounds {
    extended: Array<[number, number]> = [];
    extend(coord: [number, number]) {
      this.extended.push(coord);
    }
    isEmpty() {
      return this.extended.length === 0;
    }
  }
  return { LngLatBounds: MockLngLatBounds };
});

vi.mock("maplibre-gl", () => ({
  default: {
    LngLatBounds,
    Map: class {},
    config: {},
    Popup: class {},
    GeoJSONSource: class {},
  },
}));

describe("smoothGeometry", () => {
  it("rounds polygon corners while keeping the ring closed", () => {
    const geometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    } as Feature["geometry"];

    const result = smoothGeometry(geometry) as { coordinates: number[][][] };
    const ring = result.coordinates[0];

    expect(ring.length).toBe(17);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    // Original corner vertices are cut away and replaced with curve points.
    expect(ring).not.toContainEqual([2, 2]);
    for (const [lon, lat] of ring) {
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThanOrEqual(2);
      expect(lat).toBeGreaterThanOrEqual(0);
      expect(lat).toBeLessThanOrEqual(2);
    }
  });

  it("smooths every polygon in a MultiPolygon including holes", () => {
    const geometry = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
          [
            [0.5, 0.5],
            [1.5, 0.5],
            [1.5, 1.5],
            [0.5, 1.5],
            [0.5, 0.5],
          ],
        ],
      ],
    } as Feature["geometry"];

    const result = smoothGeometry(geometry) as { coordinates: number[][][][] };
    expect(result.coordinates).toHaveLength(1);
    const [outer, hole] = result.coordinates[0];
    expect(outer.length).toBe(17);
    expect(hole.length).toBe(17);
    expect(outer[0]).toEqual(outer[outer.length - 1]);
    expect(hole[0]).toEqual(hole[hole.length - 1]);
  });

  it("passes non-polygon geometry through untouched", () => {
    const point = { type: "Point", coordinates: [1, 2] } as Feature["geometry"];
    expect(smoothGeometry(point)).toBe(point);

    const line = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    } as Feature["geometry"];
    expect(smoothGeometry(line)).toBe(line);
  });
});

describe("normalizeGeometry", () => {
  it("deduplicates features by id", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "en" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "en" },
          geometry: { type: "Point", coordinates: [1, 1] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features).toHaveLength(1);
  });

  it("keeps multiple features that share a name (geography regions)", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "BritishEmpire" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { name: "BritishEmpire" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 10],
                [11, 10],
                [11, 11],
                [10, 10],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features).toHaveLength(2);
  });

  it("maps Natural Earth properties (ADMIN / ISO_A3) to id and name", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { ADMIN: "India", ISO_A2: "IN", ISO_A3: "IND" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: "Feature",
          properties: { ADMIN: "Canada", ISO_A2: "CA", ISO_A3: "CAN" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [10, 10],
                [11, 10],
                [11, 11],
                [10, 10],
              ],
            ],
          },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features).toHaveLength(2);
    expect(result.features[0].properties).toEqual({
      id: "IND",
      name: "India",
      lang: "India",
      count: 1,
      family: "",
      familyCode: "",
      ancestors: "",
    });
    expect(result.features[1].properties).toEqual({
      id: "CAN",
      name: "Canada",
      lang: "Canada",
      count: 1,
      family: "",
      familyCode: "",
      ancestors: "",
    });
  });

  it("falls back to name for id and defaults name to id", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "English" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "fr" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features[0].properties).toEqual({
      id: "English",
      name: "English",
      lang: "English",
      count: 1,
      family: "",
      familyCode: "",
      ancestors: "",
    });
    expect(result.features[1].properties).toEqual({
      id: "fr",
      name: "fr",
      lang: "fr",
      count: 1,
      family: "",
      familyCode: "",
      ancestors: "",
    });
  });

  it("passes through family lineage properties", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "olde1238",
            name: "Old English (ca. 450-1100)",
            count: 12,
            family: "Anglic",
            familyCode: "angl1265",
            ancestors: "|indo1319|germ1287|angl1265|",
          },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    const { properties } = normalizeGeometry(fc).features[0];
    expect(properties).toMatchObject({
      id: "olde1238",
      name: "Old English (ca. 450-1100)",
      lang: "Old English (ca. 450-1100)",
      count: 12,
      family: "Anglic",
      familyCode: "angl1265",
      ancestors: "|indo1319|germ1287|angl1265|",
    });
  });

  it("rounds a positive count and defaults invalid counts to 1", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "a", count: 4.6 },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "b", count: -2 },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
        {
          type: "Feature",
          properties: { id: "c", count: "nope" },
          geometry: { type: "Point", coordinates: [0, 0] },
        },
      ],
    };

    const result = normalizeGeometry(fc);
    expect(result.features[0].properties?.count).toBe(5);
    expect(result.features[1].properties?.count).toBe(1);
    expect(result.features[2].properties?.count).toBe(1);
  });

  it("skips features with no id or name", () => {
    const fc: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] } },
      ],
    };

    expect(normalizeGeometry(fc).features).toHaveLength(0);
  });
});

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#039;&lt;/a&gt;",
    );
  });
});

describe("renderPopup", () => {
  it("renders the family name as the title with the language as the subtitle", () => {
    expect(
      renderPopup({
        id: "x",
        name: "Old English",
        lang: "Old English",
        count: 1,
        family: "Anglic",
        familyCode: "angc",
        ancestors: "|angc|",
      }),
    ).toContain('style="font-size:13px;font-weight:600;color:#18181b;">Anglic</div>');
    expect(
      renderPopup({
        id: "x",
        name: "Old English",
        lang: "Old English",
        count: 1,
        family: "Anglic",
        familyCode: "angc",
        ancestors: "|angc|",
      }),
    ).toContain('style="font-size:11px;color:#71717a;">Old English</div>');
  });

  it("falls back to the name when no family is known", () => {
    expect(
      renderPopup({
        id: "x",
        name: "A&B",
        lang: "A&B",
        count: 1,
        family: "",
        familyCode: "",
        ancestors: "",
      }),
    ).toBe('<div style="font-size:13px;font-weight:600;color:#18181b;">A&amp;B</div>');
  });
});

describe("computeFeatureBounds", () => {
  it("computes bounds for a point", () => {
    const feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [1, 2] },
    } as Feature;

    expect(computeFeatureBounds(feature)).toEqual({ minLon: 1, minLat: 2, maxLon: 1, maxLat: 2 });
  });

  it("computes bounds across nested polygon coordinates", () => {
    const feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 5],
            [0, 0],
          ],
        ],
      },
    } as Feature;

    expect(computeFeatureBounds(feature)).toEqual({ minLon: 0, minLat: 0, maxLon: 10, maxLat: 5 });
  });

  it("returns null for geometry without coordinates", () => {
    const feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "GeometryCollection", geometries: [] },
    } as Feature;

    expect(computeFeatureBounds(feature)).toBeNull();
  });
});

const wb = (minLon: number, minLat: number, maxLon: number, maxLat: number, count: number) => ({
  bounds: { minLon, minLat, maxLon, maxLat },
  count,
});

describe("trimToMajority", () => {
  it("returns a single item unchanged", () => {
    const items = [wb(0, 0, 1, 1, 5)];
    expect(trimToMajority(items)).toEqual(items);
  });

  it("drops a distant fringe feature while keeping the majority", () => {
    const items = [wb(0, 0, 1, 1, 4), wb(1, 0, 2, 1, 4), wb(100, 0, 101, 1, 1)];

    expect(trimToMajority(items)).toHaveLength(2);
  });

  it("keeps all features when removing any would drop below the majority", () => {
    const items = [wb(0, 0, 1, 1, 4), wb(100, 0, 101, 1, 6)];

    expect(trimToMajority(items)).toHaveLength(2);
  });
});

describe("fitToGeometry", () => {
  it("calls fitBounds when geometry has coordinates", () => {
    const fitBounds = vi.fn();
    const geometry: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [1, 2] } },
      ],
    };

    fitToGeometry({ fitBounds } as never, geometry);

    expect(fitBounds).toHaveBeenCalledTimes(1);
    const [bounds, options] = fitBounds.mock.calls[0];
    expect(bounds).toBeInstanceOf(LngLatBounds);
    expect(options).toEqual({ padding: 60, maxZoom: 8, animate: true, duration: 1500 });
  });

  it("does not call fitBounds for empty geometry", () => {
    const fitBounds = vi.fn();
    fitToGeometry({ fitBounds } as never, { type: "FeatureCollection", features: [] });

    expect(fitBounds).not.toHaveBeenCalled();
  });
});
