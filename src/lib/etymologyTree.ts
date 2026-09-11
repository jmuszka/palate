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
  head?: {
    Props?: { term?: string; lang?: string };
  };
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
  "elk.spacing.nodeNode": "24",
  "elk.layered.spacing.nodeNodeBetweenLayers": "56",
  "elk.edgeRouting": "ORTHOGONAL",
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
      targetPosition: "bottom",
      sourcePosition: "top",
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

// ---- Graph semantics: ancestry spine + collapsible branch groups ----
// The graph mixes true ancestry (inherited/borrowed/derived chains) with
// lateral links (doublets, cognates) and affix/compound webs. To keep the
// visualization readable, the direct ancestry of the page's word forms a
// "spine" that always stays visible, while large off-spine components are
// folded into clickable capsule nodes.

export type EdgeKind = "lineage" | "derivation" | "lateral" | "contains";

const LATERAL_RELATIONS = new Set(["doublet_with", "etymologically_related_to", "cognate_of"]);

const DERIVATION_RELATIONS = new Set([
  "derived_from",
  "back-formation_from",
  "calque_of",
  "semantic_loan_of",
  "blend_of",
  "clipping_of",
  "abbreviation_of",
  "initialism_of",
  "compound_of",
  "named_after",
  "is_onomatopoeic",
  "phono-semantic_matching_of",
  "has_affix",
  "has_confix",
  "has_prefix",
  "has_prefix_with_root",
  "has_root",
  "has_suffix",
]);

// Everything else (inherited_from, borrowed_from and its variants, …) counts
// as lineage. Lateral links never point to an ancestor, so they are excluded
// from ancestry traversal.
export function edgeKind(type?: string): EdgeKind {
  if (!type) return "lineage";
  if (LATERAL_RELATIONS.has(type)) return "lateral";
  if (DERIVATION_RELATIONS.has(type)) return "derivation";
  return "lineage";
}

// The set of nodes on the ancestry chain from the page's word up through its
// historical ancestors, following lineage/derivation edges (descendant ->
// ancestor) only. Lateral links (doublets, cognates) never enter the spine.
export function ancestrySpine(startId: string, edges: Edge[]): Set<string> {
  const spine = new Set<string>();
  if (!startId) return spine;
  spine.add(startId);
  const stack = [startId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const edge of edges) {
      if (edge.source !== current) continue;
      const label = typeof edge.label === "string" ? edge.label : undefined;
      if (edgeKind(label) === "lateral") continue;
      if (spine.has(edge.target)) continue;
      spine.add(edge.target);
      stack.push(edge.target);
    }
  }
  return spine;
}

export interface CapsuleNodeData {
  isCapsule: true;
  // Stable id of the folded component (sorted member node ids joined).
  compId: string;
  count: number;
  expanded: boolean;
  [key: string]: unknown;
}

// Components at or below this size are small enough to render inline without
// a capsule; larger ones start collapsed.
export const AUTO_EXPAND_SIZE = 20;

// Capsule component ids join their member node ids. Node ids already contain
// "|" (they are term|lang pairs), so a control character keeps the join
// injective and round-trippable.
export const COMPONENT_ID_SEPARATOR = "\u0001";

// Folding recurses inside expanded components; cap the depth so pathological
// graphs always terminate.
const MAX_COLLAPSE_DEPTH = 8;

const capsuleNodeId = (compId: string) => `capsule:${compId}`;

function makeCapsuleNode(compId: string, count: number, expanded: boolean): Node {
  return {
    id: capsuleNodeId(compId),
    position: { x: 0, y: 0 },
    data: { isCapsule: true, compId, count, expanded } as CapsuleNodeData,
  };
}

// Connected components among the given ids, using only edges whose endpoints
// are both in the set.
function connectedComponents(ids: Set<string>, edges: Edge[]): Set<string>[] {
  const adjacency = new Map<string, string[]>();
  for (const id of ids) adjacency.set(id, []);
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
    }
  }

  const seen = new Set<string>();
  const components: Set<string>[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const component = new Set<string>();
    const stack = [id];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop() as string;
      component.add(current);
      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    components.push(component);
  }
  return components;
}

// Replaces large off-spine components with capsule nodes. Expanded capsules
// keep their members visible and are linked to them by invisible "contains"
// edges so the header sits above its group in the layout. Inside an expanded
// component the same folding applies recursively: its own ancestry forms the
// core while dense off-core sub-clusters collapse into nested capsules. When
// the start word cannot be located, the graph is returned unchanged.
export function collapsibleGraph(
  nodes: Node[],
  edges: Edge[],
  startId: string,
  expandedIds: ReadonlySet<string>,
): { nodes: Node[]; edges: Edge[]; spine: Set<string> } {
  const spine = ancestrySpine(startId, edges);
  // When the start word cannot be located in the graph, fold nothing.
  if (spine.size === 0 || !nodes.some((node) => node.id === startId)) {
    return { nodes, edges, spine };
  }

  const outNodes: Node[] = [];
  const outEdges: Edge[] = [];
  // Maps a node id onto the visible node that stands in for it (itself, or a
  // capsule header when the node is folded away, at any nesting depth).
  const representative = new Map<string, string>();

  const pushVisible = (node: Node) => {
    outNodes.push(node);
    representative.set(node.id, node.id);
  };

  const collapseLevel = (
    levelNodes: Node[],
    levelEdges: Edge[],
    coreIds: Set<string>,
    depth: number,
  ) => {
    for (const node of levelNodes) {
      if (coreIds.has(node.id)) pushVisible(node);
    }
    for (const edge of levelEdges) {
      if (coreIds.has(edge.source) && coreIds.has(edge.target)) outEdges.push(edge);
    }

    const offCore = new Set(
      levelNodes.filter((node) => !coreIds.has(node.id)).map((node) => node.id),
    );
    const components = connectedComponents(offCore, levelEdges);

    const groupOf = new Map<string, string>();
    for (const node of levelNodes) groupOf.set(node.id, coreIds.has(node.id) ? "core" : "");
    for (const component of components) {
      const compId = [...component].sort().join(COMPONENT_ID_SEPARATOR);
      for (const id of component) groupOf.set(id, compId);
    }

    for (const component of components) {
      const compId = [...component].sort().join(COMPONENT_ID_SEPARATOR);
      const members = levelNodes.filter((node) => component.has(node.id));
      const internal = levelEdges.filter(
        (edge) => component.has(edge.source) && component.has(edge.target),
      );

      if (component.size <= AUTO_EXPAND_SIZE) {
        for (const node of members) pushVisible(node);
        for (const edge of internal) outEdges.push(edge);
        continue;
      }

      const expanded = expandedIds.has(compId);
      outNodes.push(makeCapsuleNode(compId, component.size, expanded));

      if (!expanded) {
        for (const id of component) representative.set(id, capsuleNodeId(compId));
        continue;
      }

      // Decide which members stay visible via the same folding rules, with
      // the component's own ancestry (seeded from its boundary edges) as the
      // core. Then wire the visible nodes to the capsule header so the header
      // sits above its group (the layout flows upward). A component with no
      // boundary edges (or beyond the nesting depth) cannot be split further
      // and is shown flat to keep the fold deterministic.
      const boundary = new Set<string>();
      for (const edge of levelEdges) {
        if (component.has(edge.source) && !component.has(edge.target)) boundary.add(edge.source);
        if (component.has(edge.target) && !component.has(edge.source)) boundary.add(edge.target);
      }
      const before = outNodes.length;
      if (boundary.size === 0 || depth >= MAX_COLLAPSE_DEPTH) {
        for (const node of members) pushVisible(node);
        for (const edge of internal) outEdges.push(edge);
      } else {
        collapseLevel(members, internal, expandAncestry(boundary, internal), depth + 1);
      }
      for (const node of outNodes.slice(before)) {
        outEdges.push({
          id: `contains:${compId}:${node.id}`,
          source: node.id,
          target: capsuleNodeId(compId),
          type: "contains",
          data: { kind: "contains" },
        });
      }
    }

    // Edges that cross group boundaries. Endpoints that were folded into a
    // capsule (at any depth) are rerouted to their representative node.
    const pushed = new Set<string>();
    for (const edge of levelEdges) {
      const sourceGroup = groupOf.get(edge.source) ?? "";
      const targetGroup = groupOf.get(edge.target) ?? "";
      if (sourceGroup === targetGroup) continue;

      const source = representative.get(edge.source) ?? edge.source;
      const target = representative.get(edge.target) ?? edge.target;
      const key = `${source}->${target}`;
      if (pushed.has(key)) continue;
      pushed.add(key);
      outEdges.push({ ...edge, id: `link:${key}`, source, target });
    }
  };

  collapseLevel(nodes, edges, spine, 0);

  return { nodes: outNodes, edges: outEdges, spine };
}

// Grows a nested core from the component's boundary nodes by following
// lineage edges (inherited/borrowed) in both directions. Derivation and
// lateral edges never enter the core, so affix/doublet clusters keep
// collapsing into nested capsules.
function expandAncestry(seeds: Set<string>, edges: Edge[]): Set<string> {
  const core = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const label = typeof edge.label === "string" ? edge.label : undefined;
    if (edgeKind(label) !== "lineage") continue;
    const sources = adjacency.get(edge.source) ?? [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
    const targets = adjacency.get(edge.target) ?? [];
    targets.push(edge.source);
    adjacency.set(edge.target, targets);
  }
  const stack = [...seeds];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (core.has(current)) continue;
    core.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!core.has(next)) stack.push(next);
    }
  }
  return core;
}
