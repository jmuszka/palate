import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import { greatCircleCoordinates, extractChainPairs, buildTravelRoutes } from "./travelRoutes";
import type { Neo4jNode, Neo4jPath } from "./etymologyTree";

function word(id: number, term: string, lang: string): Neo4jNode {
  return { Id: id, Labels: ["Word"], Props: { term, lang } };
}

function pathRecord(nodes: Neo4jNode[]): Neo4jPath {
  return { path: { Nodes: nodes, Relationships: [] } };
}

describe("greatCircleCoordinates", () => {
  it("returns both endpoints", () => {
    const coords = greatCircleCoordinates([0, 0], [10, 10]);
    expect(coords[0]).toEqual([0, 0]);
    expect(coords[coords.length - 1]).toEqual([10, 10]);
  });

  it("interpolates between far points without going past the endpoints", () => {
    const coords = greatCircleCoordinates([-20, 50], [20, 55]);
    expect(coords.length).toBeGreaterThan(2);
    for (const [lon] of coords) {
      expect(lon).toBeGreaterThanOrEqual(-20.001);
      expect(lon).toBeLessThanOrEqual(20.001);
    }
  });
});

describe("extractChainPairs", () => {
  it("orders pairs oldest-to-newest along each path", () => {
    const record = pathRecord([
      word(1, "apple", "English"),
      word(2, "appel", "Middle English"),
      word(3, "æppel", "Old English"),
    ]);
    expect(extractChainPairs([record])).toEqual([
      ["Old English", "Middle English"],
      ["Middle English", "English"],
    ]);
  });

  it("dedupes pairs shared by multiple paths", () => {
    const record = pathRecord([word(1, "word", "English"), word(2, "wurd", "Old English")]);
    const duplicate = pathRecord([word(1, "word", "English"), word(2, "wurd", "Old English")]);
    expect(extractChainPairs([record, duplicate])).toEqual([["Old English", "English"]]);
  });

  it("skips repeated languages", () => {
    const record = pathRecord([
      word(1, "word", "English"),
      word(2, "orth", "Old English"),
      word(3, "wrda", "Old English"),
    ]);
    expect(extractChainPairs([record])).toEqual([["Old English", "English"]]);
  });
});

describe("buildTravelRoutes", () => {
  const geometry: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: "olde1238",
          name: "Old English (ca. 450-1100)",
          lang: "Old English (ca. 450-1100)",
          count: 12,
        },
        geometry: { type: "Point", coordinates: [-1, 52] },
      },
      {
        type: "Feature",
        properties: { id: "stan1293", name: "English", lang: "English", count: 11 },
        geometry: { type: "Point", coordinates: [0, 53] },
      },
    ],
  };

  it("builds a line per consecutive language pair", () => {
    const record = pathRecord([word(1, "apple", "English"), word(3, "æppel", "Old English")]);
    const result = buildTravelRoutes([record], geometry);
    expect(result).not.toBeNull();
    expect(result?.geojson.features).toHaveLength(1);
    const line = result?.geojson.features[0].geometry as { coordinates: unknown[][] };
    expect(line.coordinates.length).toBeGreaterThan(10);
  });

  it("filters out pairs with no matching region", () => {
    const record = pathRecord([word(1, "apple", "English"), word(4, "aplaz", "Proto-Germanic")]);
    const result = buildTravelRoutes([record], geometry);
    expect(result).toBeNull();
  });
});
