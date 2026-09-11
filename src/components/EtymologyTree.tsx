import { useCallback, useEffect, useMemo, useState } from "react";
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
  collapsibleGraph,
  edgeKind,
  COMPONENT_ID_SEPARATOR,
  NODE_WIDTH,
  NODE_HEIGHT,
} from "../lib/etymologyTree";
import type { Neo4jPath, EtymologyData, EdgeKind, CapsuleNodeData } from "../lib/etymologyTree";
import "@xyflow/react/dist/style.css";

export type { EtymologyData, FamilyTreeNode } from "../lib/etymologyTree";

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
  // Whether the node lies on the direct ancestry spine of the page's word.
  spine?: boolean;
  [key: string]: unknown;
}

type WordNode = Node<WordNodeData>;

function WordNodeCard({ data }: NodeProps<WordNode>) {
  const accent = heredityColor(data.ageRatio);
  const isSpine = data.spine !== false;
  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md ${
        isSpine ? "" : "bg-zinc-50"
      }`}
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderColor: isSpine ? accent : "#d4d4d8",
        borderLeftWidth: isSpine ? 4 : 2,
      }}
    >
      <Handle type="source" position={Position.Top} className="!opacity-0" />
      <div
        className={`truncate text-[13px] font-semibold leading-tight ${
          isSpine ? "text-zinc-900" : "text-zinc-500"
        }`}
      >
        {data.label}
      </div>
      {data.lang && (
        <div
          className={`truncate text-[11px] leading-tight ${isSpine ? "text-zinc-500" : "text-zinc-400"}`}
        >
          {data.lang}
        </div>
      )}
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

// Clickable capsule that folds a large off-spine component ("+37 related
// forms"). Clicking toggles the component between collapsed and expanded.
function CapsuleNodeCard({ data }: NodeProps<Node<CapsuleNodeData>>) {
  const capsule = data as CapsuleNodeData;
  return (
    <div
      className={`flex h-9 w-44 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dashed px-3 text-xs font-medium transition-colors ${
        capsule.expanded
          ? "border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          : "border-zinc-300 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      <Handle type="source" position={Position.Top} className="!opacity-0" />
      <span>
        {capsule.expanded ? "▾" : "▸"} {capsule.count} related forms
      </span>
      <Handle type="target" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

// Edge with an arrowhead and a hover-revealed relationship label instead of a
// permanent text badge on every edge. Lineage edges are solid indigo,
// derivation edges rose, and lateral links (doublets/cognates) dashed gray
// with no arrowhead. "contains" edges are layout-only and render nothing.
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
  data,
}: EdgeProps) {
  const kind = ((data as { kind?: EdgeKind } | undefined)?.kind ?? "lineage") as EdgeKind;
  const [hovered, setHovered] = useState(false);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (kind === "contains") return null;

  const stroke = (hovered ? "#4f46e5" : (style?.stroke as string | undefined)) ?? "#cbd5e1";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          stroke,
          strokeWidth: hovered ? 2.5 : ((style?.strokeWidth as number | undefined) ?? 1.5),
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
            {String(label).replace(/_/g, " ")}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Layout-only edges linking a capsule header to its members are invisible.
function ContainsEdge() {
  return null;
}

const edgeTypes = { relationship: RelationshipEdge, contains: ContainsEdge };

// Interior component so we can access React Flow's viewport controls
const TreeCanvas = ({
  data,
  onHeight,
}: {
  data: Neo4jPath[];
  onHeight: (height: number) => void;
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<WordNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { fitView } = useReactFlow();
  const navigate = useNavigate();

  // Reset fold state when navigating to a new word.
  useEffect(() => {
    setExpanded(new Set());
  }, [data]);

  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildGraph(data);
    if (rawNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // The head record is the page's word: the root of the ancestry spine.
    const head = data[0]?.head;
    const headTerm = head?.Props?.term;
    const headLang = head?.Props?.lang;
    const startId = typeof headTerm === "string" ? `${headTerm}|${headLang}` : "";

    const {
      nodes: foldedNodes,
      edges: foldedEdges,
      spine,
    } = collapsibleGraph(rawNodes, rawEdges, startId, expanded);

    let cancelled = false;
    getLayoutedElements(foldedNodes, foldedEdges).then(
      ({ nodes: laidOutNodes, edges: laidOutEdges }) => {
        if (cancelled) return;
        const ages = computeNodeAges(laidOutNodes, laidOutEdges);
        const maxAge = Math.max(...ages.values(), 1);
        const styledNodes = laidOutNodes.map((node) => {
          const isCapsule = Boolean((node.data as { isCapsule?: boolean } | undefined)?.isCapsule);
          const age = ages.get(node.id) ?? 0;
          return {
            ...node,
            type: isCapsule ? "capsule" : "word",
            data: {
              ...node.data,
              ageRatio: 1 - age / maxAge,
              spine: isCapsule ? false : spine.has(node.id),
            } as WordNodeData,
          };
        });
        const styledEdges: Edge[] = laidOutEdges.map((edge) => {
          const kind = ((edge.data as { kind?: EdgeKind } | undefined)?.kind ??
            edgeKind(typeof edge.label === "string" ? edge.label : undefined)) as EdgeKind;
          const stroke =
            kind === "lateral" ? "#d4d4d8" : kind === "derivation" ? "#fb7185" : "#6366f1";
          return {
            ...edge,
            type: kind === "contains" ? "contains" : "relationship",
            markerEnd:
              kind === "lateral" || kind === "contains"
                ? undefined
                : {
                    type: MarkerType.ArrowClosed,
                    width: 16,
                    height: 16,
                    color: stroke,
                  },
            data: { ...edge.data, kind },
            label: edge.label,
            style: {
              stroke,
              strokeWidth: kind === "lateral" ? 1.25 : 1.5,
              strokeDasharray: kind === "lateral" ? "4 3" : undefined,
            },
            labelStyle: undefined,
            labelBgStyle: undefined,
            labelBgPadding: undefined,
            labelBgBorderRadius: undefined,
          };
        });
        setNodes(styledNodes as WordNode[]);
        setEdges(styledEdges);

        // Size the pane to the laid-out content so the graph never overflows
        // and small trees don't drown in dead space.
        const ys = laidOutNodes.map((node) => node.position.y);
        const contentHeight = ys.length > 0 ? Math.max(...ys) - Math.min(...ys) : 0;
        onHeight(Math.min(760, Math.max(360, Math.round(contentHeight + NODE_HEIGHT + 120))));

        // Fit twice: node dimensions are measured after the first paint, so a
        // single fitView tends to be computed against stale bounds. When a
        // capsule is expanded, fit to that component's region instead of the
        // whole graph so the web stays at a readable zoom.
        const visibleIds = new Set(styledNodes.map((node) => node.id));
        const fitTarget = expanded.size
          ? [...expanded].flatMap((compId) =>
              [`capsule:${compId}`, ...compId.split(COMPONENT_ID_SEPARATOR)]
                .filter((id) => visibleIds.has(id))
                .map((id) => ({ id })),
            )
          : undefined;
        window.requestAnimationFrame(() => {
          fitView({ padding: 0.15, maxZoom: 1.2, nodes: fitTarget });
          window.requestAnimationFrame(() => {
            fitView({ padding: 0.15, maxZoom: 1.2, nodes: fitTarget });
            // Freshly mounted nodes report their dimensions asynchronously, so
            // a final pass after a short delay settles the viewport.
            window.setTimeout(
              () => fitView({ padding: 0.15, maxZoom: 1.2, nodes: fitTarget }),
              250,
            );
          });
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [data, expanded, setNodes, setEdges, fitView, onHeight]);

  const nodeTypes = useMemo(() => ({ word: WordNodeCard, capsule: CapsuleNodeCard }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => {
        const nodeData = node.data as WordNodeData & { isCapsule?: boolean; compId?: string };
        if (nodeData.isCapsule && nodeData.compId) {
          setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(nodeData.compId as string)) next.delete(nodeData.compId as string);
            else next.add(nodeData.compId as string);
            return next;
          });
          return;
        }
        const term = encodeURIComponent(nodeData.term);
        const lang = nodeData.lang ? `?lang=${encodeURIComponent(nodeData.lang)}` : "";
        navigate(`/words/${term}${lang}`);
      }}
      minZoom={0.05}
      maxZoom={1.5}
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
  const [canvasHeight, setCanvasHeight] = useState(480);
  const onHeight = useCallback((height: number) => setCanvasHeight(height), []);

  return (
    <div className="shrink-0">
      <div
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden"
        style={{ height: canvasHeight }}
      >
        <ReactFlowProvider>
          <TreeCanvas data={data.graph} onHeight={onHeight} />
        </ReactFlowProvider>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded bg-indigo-500" />
          ancestry
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded bg-rose-400" />
          derivation
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-dashed border-zinc-400" />
          related
        </span>
      </div>
    </div>
  );
}
