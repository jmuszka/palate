import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Neo4jPath } from "./etymologyTree";

const { layoutMock } = vi.hoisted(() => ({ layoutMock: vi.fn() }));

vi.mock("elkjs/lib/elk.bundled.js", () => ({
  default: class {
    layout(graph: unknown) {
      return layoutMock(graph);
    }
  },
}));

import { buildGraph, getLayoutedElements } from "./etymologyTree";

function path(
  nodes: Array<{ id: number; term?: string; lang?: string }>,
  relationships: Array<{ id: number; start: number; end: number; type?: string }>,
): Neo4jPath {
  return {
    path: {
      Nodes: nodes.map((n) => ({
        Id: n.id,
        Labels: [],
        Props: { term: n.term, lang: n.lang },
      })),
      Relationships: relationships.map((r) => ({
        Id: r.id,
        StartId: r.start,
        EndId: r.end,
        Type: r.type ?? "",
        Props: {},
      })),
    },
  };
}

describe("buildGraph", () => {
  beforeEach(() => {
    layoutMock.mockReset();
  });

  it("builds a node per unique term|lang pair", () => {
    const { nodes } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "rinnan", lang: "enm" },
        ],
        [],
      ),
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes.map((n) => n.id)).toEqual(["run|en", "rinnan|enm"]);
  });

  it("deduplicates nodes by term + language", () => {
    const { nodes } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "run", lang: "en" },
        ],
        [],
      ),
    ]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("run|en");
  });

  it("labels nodes as 'term (lang)' and falls back to term", () => {
    const { nodes } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "rinnan" },
        ],
        [],
      ),
    ]);

    const withLang = nodes.find((n) => n.id === "run|en");
    const withoutLang = nodes.find((n) => n.id === "rinnan|undefined");
    expect(withLang?.data.label).toBe("run (en)");
    expect(withoutLang?.data.label).toBe("rinnan");
  });

  it("remaps edges from Neo4j ids onto canonical node ids", () => {
    const { edges } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "rinnan", lang: "enm" },
        ],
        [{ id: 10, start: 1, end: 2, type: "descends" }],
      ),
    ]);

    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("run|en");
    expect(edges[0].target).toBe("rinnan|enm");
    expect(edges[0].label).toBe("descends");
  });

  it("skips self-loops produced by node merging", () => {
    const { edges } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "run", lang: "en" },
        ],
        [{ id: 10, start: 1, end: 2 }],
      ),
    ]);

    expect(edges).toHaveLength(0);
  });

  it("deduplicates parallel edges between the same pair", () => {
    const { edges } = buildGraph([
      path(
        [
          { id: 1, term: "run", lang: "en" },
          { id: 2, term: "rinnan", lang: "enm" },
        ],
        [
          { id: 10, start: 1, end: 2 },
          { id: 11, start: 1, end: 2 },
        ],
      ),
    ]);

    expect(edges).toHaveLength(1);
  });

  it("returns empty results for empty or undefined input", () => {
    expect(buildGraph([])).toEqual({ nodes: [], edges: [] });
    expect(buildGraph(undefined as unknown as Neo4jPath[])).toEqual({ nodes: [], edges: [] });
  });
});

describe("getLayoutedElements", () => {
  beforeEach(() => {
    layoutMock.mockReset();
  });

  it("maps ELK coordinates back onto the nodes", async () => {
    layoutMock.mockResolvedValue({
      children: [
        { id: "a", x: 10, y: 20 },
        { id: "b", x: 30, y: 40 },
      ],
    });

    const nodes = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ] as never;
    const edges = [] as never;

    const result = await getLayoutedElements(nodes, edges);

    expect(result.nodes[0].position).toEqual({ x: 10, y: 20 });
    expect(result.nodes[1].position).toEqual({ x: 30, y: 40 });
    expect(result.edges).toBe(edges);
  });

  it("falls back to the original nodes when layout fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    layoutMock.mockRejectedValue(new Error("boom"));

    const nodes = [{ id: "a", position: { x: 0, y: 0 }, data: {} }] as never;
    const edges = [] as never;

    const result = await getLayoutedElements(nodes, edges);

    expect(result.nodes).toBe(nodes);
    expect(result.edges).toBe(edges);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
