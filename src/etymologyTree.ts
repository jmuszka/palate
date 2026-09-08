import ELK from "elkjs/lib/elk.bundled.js";
import type { Node, Edge } from "@xyflow/react";
import type { FeatureCollection } from "geojson";

// Shape of the /etymology endpoint (standard Neo4j path response)
export interface Neo4jNode {
  Id: number;
  Labels: string[];
  Props: {
    lang?: string;
    term?: string;
    [key: string]: unknown;
  };
}

export interface Neo4jRelationship {
  Id: number;
  StartId: number;
  EndId: number;
  Type: string;
  Props: {
    reltype?: string;
    [key: string]: unknown;
  };
}

export interface Neo4jPath {
  path: {
    Nodes: Neo4jNode[];
    Relationships: Neo4jRelationship[];
  };
}

export interface FamilyTreeNode {
  id: string;
  name: string;
  value: number;
  glottocode?: string;
  children?: FamilyTreeNode[];
}

export type EtymologyData = {
  graph: Neo4jPath[];
  familyTree: FamilyTreeNode;
  geojson: FeatureCollection;
  ipa: string;
};

const elk = new ELK();

// Nominal node card size (px) — layout in ELK matches these dimensions.
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 56;

// Configuration for a clean, downward-flowing tree hierarchy
export const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "UP",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  // Place every node at its true distance from the root so nodes of the
  // same depth share a level, giving a clean top-down poly-tree structure.
  // (The default NETWORK_SIMPLEX pulls nodes toward their neighbors instead.)
  "elk.layered.layering.strategy": "LONGEST_PATH",
};

// Age of each node within the tree: 0 for the oldest ancestor (no further
// ancestors), 1 + max(age of its ancestors) for the rest. Edges point from a
// descendant to its ancestor (source = descendant, target = ancestor). The
// etymology graph can contain cycles (a word may be its own ancestor through
// e.g. doublets), so ages memoize and treat revisits as age 0.
export function computeNodeAges(nodes: Node[], edges: Edge[]): Map<string, number> {
  const ancestors = new Map<string, string[]>();
  for (const edge of edges) {
    const list = ancestors.get(edge.source) ?? [];
    list.push(edge.target);
    ancestors.set(edge.source, list);
  }

  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const ageOf = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = ancestors.get(id) ?? [];
    const age = parents.length === 0 ? 0 : 1 + Math.max(...parents.map((p) => ageOf(p)));
    visiting.delete(id);
    memo.set(id, age);
    return age;
  };

  for (const node of nodes) ageOf(node.id);
  return memo;
}

// Flatten the (potentially many) Neo4j paths into a deduplicated set of
// nodes and edges. Nodes are deduplicated by term + language, so
// the same word in the same language collapses into a single node. Edges reference nodes
// by Neo4j Id, so we remap each Id onto its term|lang node.
export const buildGraph = (data: Neo4jPath[]): { nodes: Node[]; edges: Edge[] } => {
  const nodeMap = new Map<string, Node>(); // term|lang -> node
  const canonical = new Map<string, string>(); // Neo4j Id -> term|lang node id
  const edgeMap = new Map<string, Edge>();

  for (const { path } of data ?? []) {
    if (!path) continue;

    for (const n of path.Nodes ?? []) {
      const { term, lang } = n.Props;
      const key = `${term}|${lang}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          id: key,
          data: { label: term ?? key, term, lang },
          position: { x: 0, y: 0 },
        });
      }
      // Point this Neo4j Id at whichever node "owns" the term|lang pair
      canonical.set(String(n.Id), key);
    }

    for (const r of path.Relationships ?? []) {
      const source = canonical.get(String(r.StartId)) ?? String(r.StartId);
      const target = canonical.get(String(r.EndId)) ?? String(r.EndId);
      if (source === target) continue; // self-loop from a merge — skip
      const key = `${source}->${target}`; // dedupe collapsed parallel edges
      if (!edgeMap.has(key)) {
        const label = r.Type;
        edgeMap.set(key, {
          id: key,
          source,
          target,
          type: "smoothstep",
          ...(label
            ? {
                label,
                labelStyle: { fill: "#52525b", fontSize: 10, fontWeight: 500 },
                labelBgStyle: { fill: "#fafafa", fillOpacity: 0.9 },
                labelBgPadding: [4, 2] as [number, number],
                labelBgBorderRadius: 4,
              }
            : {}),
        });
      }
    }
  }

  return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
};

// Calculate positions using ELK.js
export const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
  const graph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      targetPosition: "top",
      sourcePosition: "bottom",
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    // Map computed coordinates back onto original objects
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((child) => child.id === node.id);
      return {
        ...node,
        position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("ELK layout failed:", error);
    return { nodes, edges };
  }
};
