import { useEffect } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import "@xyflow/react/dist/style.css";

// Shape of the /etymology endpoint (standard Neo4j path response)
interface Neo4jNode {
  Id: number;
  Labels: string[];
  Props: {
    lang?: string;
    term?: string;
    [key: string]: unknown;
  };
}

interface Neo4jRelationship {
  Id: number;
  StartId: number;
  EndId: number;
  Type: string;
}

interface Neo4jPath {
  path: {
    Nodes: Neo4jNode[];
    Relationships: Neo4jRelationship[];
  };
}

export type EtymologyData = {
  graph: Neo4jPath[];
  family: string[];
  geojson: string[];
};

const elk = new ELK();

// Configuration for a clean, downward-flowing tree hierarchy
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "UP",
  "elk.spacing.nodeNode": "60",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  // Place every node at its true distance from the root so nodes of the
  // same depth share a level, giving a clean top-down poly-tree structure.
  // (The default NETWORK_SIMPLEX pulls nodes toward their neighbors instead.)
  "elk.layered.layering.strategy": "LONGEST_PATH",
};

// Flatten the (potentially many) Neo4j paths into a deduplicated set of
// nodes and edges. Nodes are deduplicated by term + language, so
// the same word in the same language collapses into a single node. Edges reference nodes
// by Neo4j Id, so we remap each Id onto its term|lang node.
const buildGraph = (data: Neo4jPath[]): { nodes: Node[]; edges: Edge[] } => {
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
          data: { label: lang ? `${term} (${lang})` : (term ?? key) },
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
        edgeMap.set(key, { id: key, source, target, type: "smoothstep" });
      }
    }
  }

  return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()] };
};

// Calculate positions using ELK.js
const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
  const graph = {
    id: "root",
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: 160,
      height: 60,
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
      const elkNode = layoutedGraph.children?.find(
        (child) => child.id === node.id,
      );
      return {
        ...node,
        position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("ELK layout failed:", error);
    return { nodes, edges };
  }
};

// Interior component so we can access React Flow's viewport controls
const TreeCanvas = ({ data }: { data: Neo4jPath[] }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();

  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraph(data);
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let cancelled = false;
    getLayoutedElements(rawNodes, rawEdges).then(
      ({ nodes: laidOutNodes, edges: laidOutEdges }) => {
        if (cancelled) return;
        setNodes(laidOutNodes);
        setEdges(laidOutEdges);
        // Delay fitView briefly so the viewport matches fresh node DOM boundaries
        window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
      },
    );

    return () => {
      cancelled = true;
    };
  }, [data, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#e4e4e7" gap={16} />
      <Controls />
    </ReactFlow>
  );
};

export default function EtymologyTree({ data }: { data: EtymologyData }) {
  return (
    <div className="h-[480px] w-full rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden">
      <ReactFlowProvider>
        <TreeCanvas data={data.graph} />
      </ReactFlowProvider>
    </div>
  );
}
