import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  getBezierPath,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import { useNavigate } from "react-router-dom";
import {
  buildGraph,
  computeNodeAges,
  getLayoutedElements,
  NODE_WIDTH,
  NODE_HEIGHT,
} from "./etymologyTree";
import type { Neo4jPath, EtymologyData } from "./etymologyTree";
import "@xyflow/react/dist/style.css";

export type { EtymologyData, FamilyTreeNode } from "./etymologyTree";

// The modern word sits at the bottom (deepest age); each step back in time
// shifts toward amber then rose, making the lineage's depth readable at a glance.
const RECENT_RGB = [99, 102, 241]; // #6366f1 (indigo)
const ANCIENT_RGB = [225, 29, 72]; // #e11d48 (rose)

function heredityColor(ageRatio: number): string {
  const t = Math.max(0, Math.min(1, ageRatio));
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${lerp(RECENT_RGB[0], ANCIENT_RGB[0])}, ${lerp(RECENT_RGB[1], ANCIENT_RGB[1])}, ${lerp(
    RECENT_RGB[2],
    ANCIENT_RGB[2],
  )})`;
}

interface WordNodeData {
  label: string;
  term: string;
  lang?: string;
  ageRatio: number;
  [key: string]: unknown;
}

type WordNode = Node<WordNodeData>;

function WordNodeCard({ data }: NodeProps<WordNode>) {
  const accent = heredityColor(data.ageRatio);
  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, borderColor: accent, borderLeftWidth: 4 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
        {data.label}
      </div>
      {data.lang && (
        <div className="truncate text-[11px] leading-tight text-zinc-500">{data.lang}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

// Edge with an arrowhead and a hover-revealed relationship label instead of a
// permanent text badge on every edge.
function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
  label,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          stroke: hovered ? "#4f46e5" : "#cbd5e1",
          strokeWidth: hovered ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.9,
        }}
        markerEnd={markerEnd}
        interactionWidth={0}
      />
      {/* Invisible wide path that registers hover even on the 1.5px line. */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        style={{ pointerEvents: "stroke" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-md"
            style={{ left: labelX, top: labelY }}
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { relationship: RelationshipEdge };

// Interior component so we can access React Flow's viewport controls
const TreeCanvas = ({ data }: { data: Neo4jPath[] }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<WordNode>([]);
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
      const ages = computeNodeAges(laidOutNodes, laidOutEdges);
      const maxAge = Math.max(...ages.values(), 1);
      const styledNodes = laidOutNodes.map((node) => {
        const age = ages.get(node.id) ?? 0;
        return {
          ...node,
          type: "word",
          data: { ...node.data, ageRatio: 1 - age / maxAge } as WordNodeData,
        };
      }) as WordNode[];
      const styledEdges: Edge[] = laidOutEdges.map((edge) => ({
        ...edge,
        type: "relationship",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: "#94a3b8",
        },
        label: edge.label,
        style: { stroke: "#cbd5e1", strokeWidth: 1.5 },
        labelStyle: undefined,
        labelBgStyle: undefined,
        labelBgPadding: undefined,
        labelBgBorderRadius: undefined,
      }));
      setNodes(styledNodes);
      setEdges(styledEdges);
      // Delay fitView briefly so the viewport matches fresh node DOM boundaries
      window.requestAnimationFrame(() => fitView({ padding: 0.25 }));
    });

    return () => {
      cancelled = true;
    };
  }, [data, setNodes, setEdges, fitView]);

  const nodeTypes = useMemo(() => ({ word: WordNodeCard }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        const nodeData = node.data as WordNodeData;
        const term = encodeURIComponent(nodeData.term);
        const lang = nodeData.lang ? `?lang=${encodeURIComponent(nodeData.lang)}` : "";
        navigate(`/words/${term}${lang}`);
      }}
      fitView
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: false }}
    >
      <Background color="#e4e4e7" gap={16} />
      <Controls />
    </ReactFlow>
  );
};

export default function EtymologyTree({ data }: { data: EtymologyData }) {
  return (
    <div className="h-[480px] w-full shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
      <ReactFlowProvider>
        <TreeCanvas data={data.graph} />
      </ReactFlowProvider>
    </div>
  );
}
