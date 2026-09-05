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
import { useNavigate } from "react-router-dom";
import { buildGraph, getLayoutedElements } from "./etymologyTree";
import type { Neo4jPath, EtymologyData } from "./etymologyTree";
import "@xyflow/react/dist/style.css";

export type { EtymologyData, FamilyTreeNode } from "./etymologyTree";

// Interior component so we can access React Flow's viewport controls
const TreeCanvas = ({ data }: { data: Neo4jPath[] }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView } = useReactFlow();
  const navigate = useNavigate();

  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraph(data);
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    let cancelled = false;
    getLayoutedElements(rawNodes, rawEdges).then(({ nodes: laidOutNodes, edges: laidOutEdges }) => {
      if (cancelled) return;
      setNodes(laidOutNodes);
      setEdges(laidOutEdges);
      // Delay fitView briefly so the viewport matches fresh node DOM boundaries
      window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
    });

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
      onNodeClick={(_, node) => {
        const term = encodeURIComponent(node.data.term as string);
        const lang = node.data.lang ? `?lang=${encodeURIComponent(node.data.lang as string)}` : "";
        navigate(`/words/${term}${lang}`);
      }}
      fitView
    >
      <Background color="#e4e4e7" gap={16} />
      <Controls />
    </ReactFlow>
  );
};

export default function EtymologyTree({ data }: { data: EtymologyData }) {
  return (
    <div className="h-[480px] w-full rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
      <ReactFlowProvider>
        <TreeCanvas data={data.graph} />
      </ReactFlowProvider>
    </div>
  );
}
