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

import {
  AUTO_EXPAND_SIZE,
  COMPONENT_ID_SEPARATOR,
  ancestrySpine,
  buildGraph,
  collapsibleGraph,
  computeNodeAges,
  edgeKind,
  getLayoutedElements,
} from "./etymologyTree";
import type { Edge, Node } from "@xyflow/react";

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

  it("labels nodes with just the term", () => {
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
    expect(withLang?.data.label).toBe("run");
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

describe("computeNodeAges", () => {
  const node = (id: string) => ({ id, position: { x: 0, y: 0 }, data: {} });
  const edge = (source: string, target: string) =>
    ({ id: `${source}->${target}`, source, target }) as never;

  it("assigns 0 to roots and increases toward the descendant head", () => {
    const ages = computeNodeAges([node("a"), node("b"), node("c")] as never, [
      edge("b", "a"),
      edge("c", "b"),
    ]);

    expect(ages.get("a")).toBe(0);
    expect(ages.get("b")).toBe(1);
    expect(ages.get("c")).toBe(2);
  });

  it("takes the longest ancestor chain on merges", () => {
    const ages = computeNodeAges([node("a"), node("b"), node("c"), node("d")] as never, [
      edge("b", "a"),
      edge("c", "b"),
      edge("d", "a"),
    ]);

    expect(ages.get("d")).toBe(1);
    expect(ages.get("c")).toBe(2);
  });

  it("terminates on cyclic graphs", () => {
    const ages = computeNodeAges([node("a"), node("b")] as never, [edge("a", "b"), edge("b", "a")]);

    // The cycle boundary gets cut at whichever node was visited first;
    // ages stay finite and deterministic for layout purposes.
    expect(ages.get("a")).toBe(2);
    expect(ages.get("b")).toBe(1);
  });
});

const graphNode = (id: string): Node => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: id, term: id, lang: "L" },
});
const graphEdge = (source: string, target: string, label?: string): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
  label,
});

describe("edgeKind", () => {
  it("classifies inheritance and borrowing as lineage", () => {
    expect(edgeKind("inherited_from")).toBe("lineage");
    expect(edgeKind("borrowed_from")).toBe("lineage");
    expect(edgeKind("learned_borrowing_from")).toBe("lineage");
    expect(edgeKind(undefined)).toBe("lineage");
  });

  it("classifies derivations separately", () => {
    expect(edgeKind("derived_from")).toBe("derivation");
    expect(edgeKind("has_affix")).toBe("derivation");
    expect(edgeKind("compound_of")).toBe("derivation");
  });

  it("classifies lateral links", () => {
    expect(edgeKind("doublet_with")).toBe("lateral");
    expect(edgeKind("cognate_of")).toBe("lateral");
    expect(edgeKind("etymologically_related_to")).toBe("lateral");
  });
});

describe("ancestrySpine", () => {
  it("follows lineage edges from the start word to its ancestors", () => {
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("dogge", "docga", "inherited_from"),
      graphEdge("docga", "gau", "derived_from"),
    ];
    expect(ancestrySpine("dog", edges)).toEqual(new Set(["dog", "dogge", "docga", "gau"]));
  });

  it("never enters the spine through lateral links", () => {
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("dog", "hound", "doublet_with"),
      graphEdge("hound", "hundaz", "inherited_from"),
    ];
    expect(ancestrySpine("dog", edges)).toEqual(new Set(["dog", "dogge"]));
  });

  it("terminates on cycles", () => {
    const edges = [graphEdge("a", "b", "inherited_from"), graphEdge("b", "a", "inherited_from")];
    expect(ancestrySpine("a", edges)).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty spine when no start id is given", () => {
    expect(ancestrySpine("", [graphEdge("a", "b")])).toEqual(new Set());
  });
});

describe("collapsibleGraph", () => {
  it("returns the graph unchanged when the start word is missing", () => {
    const nodes = [graphNode("a")];
    const edges = [graphEdge("a", "b", "inherited_from")];
    const result = collapsibleGraph(nodes, edges, "missing|en", new Set());
    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual(edges);
  });

  it("keeps the spine and small off-spine components visible", () => {
    const nodes = [graphNode("dog"), graphNode("dogge"), graphNode("hound"), graphNode("hundaz")];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("dog", "hound", "doublet_with"),
      graphEdge("hound", "hundaz", "inherited_from"),
    ];
    const result = collapsibleGraph(nodes, edges, "dog", new Set());
    expect(result.nodes.map((n) => n.id)).toEqual(["dog", "dogge", "hound", "hundaz"]);
    expect(result.edges).toHaveLength(3);
    expect(result.spine).toEqual(new Set(["dog", "dogge"]));
  });

  it("folds a large off-spine component into a capsule and reroutes its edges", () => {
    const branch = Array.from({ length: AUTO_EXPAND_SIZE + 2 }, (_, i) => `branch${i}`);
    const nodes = [graphNode("dog"), graphNode("dogge"), ...branch.map(graphNode)];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("branch0", "dogge", "doublet_with"),
      ...branch.slice(0, -1).map((id, i) => graphEdge(id, branch[i + 1], "derived_from")),
    ];
    const result = collapsibleGraph(nodes, edges, "dog", new Set());

    const ids = result.nodes.map((n) => n.id);
    expect(ids).toEqual(["dog", "dogge", `capsule:${branch.sort().join(COMPONENT_ID_SEPARATOR)}`]);
    expect(result.nodes[2].data).toMatchObject({
      isCapsule: true,
      count: branch.length,
      expanded: false,
    });

    // The boundary edge now runs from the capsule to the spine node.
    const link = result.edges.find((e) => e.source.startsWith("capsule:"));
    expect(link?.source).toBe(`capsule:${branch.sort().join(COMPONENT_ID_SEPARATOR)}`);
    expect(link?.target).toBe("dogge");
    expect(link?.label).toBe("doublet_with");
  });

  it("shows members plus layout edges when a capsule is expanded", () => {
    const branch = Array.from({ length: AUTO_EXPAND_SIZE + 2 }, (_, i) => `branch${i}`);
    const compId = branch.sort().join(COMPONENT_ID_SEPARATOR);
    const nodes = [graphNode("dog"), graphNode("dogge"), ...branch.map(graphNode)];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("branch0", "dogge", "doublet_with"),
      ...branch.slice(0, -1).map((id, i) => graphEdge(id, branch[i + 1], "inherited_from")),
    ];
    const result = collapsibleGraph(nodes, edges, "dog", new Set([compId]));

    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain(`capsule:${compId}`);
    for (const id of branch) expect(ids).toContain(id);

    const contains = result.edges.filter((e) => e.type === "contains");
    expect(contains).toHaveLength(branch.length);
    for (const edge of contains) {
      expect(edge.target).toBe(`capsule:${compId}`);
      expect((edge.data as { kind?: string } | undefined)?.kind).toBe("contains");
    }

    // Boundary edges keep their member endpoints when expanded.
    expect(result.edges.some((e) => e.source === "branch0" && e.target === "dogge")).toBe(true);
  });

  it("folds a derivation web into a nested capsule inside an expanded component", () => {
    const root = "x";
    const chain = ["c1", "c2"];
    const web = Array.from({ length: AUTO_EXPAND_SIZE + 5 }, (_, i) => `w${i}`);
    const members = [root, ...chain, ...web];
    const compId = [...members].sort().join(COMPONENT_ID_SEPARATOR);

    const nodes = [graphNode("dog"), graphNode("dogge"), ...members.map(graphNode)];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      graphEdge("dogge", root, "doublet_with"),
      graphEdge(root, "c1", "inherited_from"),
      graphEdge("c1", "c2", "inherited_from"),
      graphEdge("c2", "w0", "derived_from"),
      ...web.slice(0, -1).map((id, i) => graphEdge(id, web[i + 1], "derived_from")),
    ];

    const result = collapsibleGraph(nodes, edges, "dog", new Set([compId]));
    const ids = result.nodes.map((n) => n.id);

    // The lineage core stays visible…
    for (const id of [root, ...chain]) expect(ids).toContain(id);
    // …while the derivation web folds into a nested capsule.
    const nested = result.nodes.find(
      (n) =>
        (n.data as { isCapsule?: boolean } | undefined)?.isCapsule && n.id !== `capsule:${compId}`,
    );
    expect(nested).toBeTruthy();
    expect(((nested?.data ?? {}) as { count: number }).count).toBe(web.length);
    for (const id of web) expect(ids).not.toContain(id);

    const link = result.edges.find((e) => e.target === nested?.id);
    expect(link?.source).toBe("c2");
    expect(link?.label).toBe("derived_from");
  });

  it("keeps lateral edges between spine nodes intact", () => {
    const nodes = [graphNode("a"), graphNode("b"), graphNode("c")];
    const edges = [
      graphEdge("a", "b", "inherited_from"),
      graphEdge("b", "c", "inherited_from"),
      graphEdge("a", "c", "doublet_with"),
    ];
    const result = collapsibleGraph(nodes, edges, "a", new Set());
    expect(result.nodes).toHaveLength(3);
    expect(result.edges.some((e) => e.label === "doublet_with")).toBe(true);
  });

  it("nests sub-components inside an expanded capsule", () => {
    const root = "x";
    const chain = ["c1", "c2", "c3"];
    const cluster = Array.from({ length: AUTO_EXPAND_SIZE + 5 }, (_, i) => `k${i}`);
    const members = [root, ...chain, ...cluster];
    const compId = [...members].sort().join(COMPONENT_ID_SEPARATOR);

    const nodes = [graphNode("dog"), graphNode("dogge"), ...members.map(graphNode)];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      // The whole component hangs off the spine through a lateral edge.
      graphEdge("dogge", root, "doublet_with"),
      graphEdge(root, "c1", "inherited_from"),
      graphEdge("c1", "c2", "inherited_from"),
      graphEdge("c2", "c3", "inherited_from"),
      graphEdge("c3", "k0", "doublet_with"),
      ...cluster.slice(0, -1).map((id, i) => graphEdge(id, cluster[i + 1], "doublet_with")),
    ];

    const result = collapsibleGraph(nodes, edges, "dog", new Set([compId]));
    const ids = result.nodes.map((n) => n.id);

    expect(ids).toContain(`capsule:${compId}`);
    expect(ids).toContain("dog");
    for (const id of [root, ...chain]) expect(ids).toContain(id);

    // The lateral-only cluster folds into a nested capsule; its members stay
    // hidden until that capsule is expanded.
    const nested = result.nodes.find(
      (n) =>
        (n.data as { isCapsule?: boolean } | undefined)?.isCapsule && n.id !== `capsule:${compId}`,
    );
    expect(nested).toBeTruthy();
    expect(((nested?.data ?? {}) as { count: number }).count).toBe(cluster.length);
    for (const id of cluster) expect(ids).not.toContain(id);

    // The internal boundary edge reaches the nested capsule through the
    // expanded parent component.
    const link = result.edges.find((e) => e.target === nested?.id);
    expect(link?.source).toBe("c3");
    expect(link?.label).toBe("doublet_with");
  });

  it("shows an expanded component flat when it has no boundary edges", () => {
    const cluster = Array.from({ length: AUTO_EXPAND_SIZE + 5 }, (_, i) => `k${i}`);
    const compId = cluster.sort().join(COMPONENT_ID_SEPARATOR);
    const nodes = [graphNode("dog"), ...cluster.map(graphNode)];
    const edges = [
      graphEdge("dog", "dogge", "inherited_from"),
      ...cluster.slice(0, -1).map((id, i) => graphEdge(id, cluster[i + 1], "doublet_with")),
    ];

    const result = collapsibleGraph(nodes, edges, "dog", new Set([compId]));
    const ids = result.nodes.map((n) => n.id);
    expect(ids).toContain(`capsule:${compId}`);
    for (const id of cluster) expect(ids).toContain(id);
  });
});
