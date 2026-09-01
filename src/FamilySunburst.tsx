import { useMemo } from "react";
import { ResponsiveSunburst } from "@nivo/sunburst";
import type { SunburstCustomLayerProps } from "@nivo/sunburst";
import { useTooltip } from "@nivo/tooltip";
import type { FamilyTreeNode } from "./EtymologyTree";

// Renders the language-family hierarchy as a sunburst chart with the root
// (top of the hierarchy) on the outer ring and the leaves in the center.
// Nivo lays out the tree root-first, so we render arcs ourselves using each
// node's `height` (distance from the deepest leaf) to invert the radius order.
// Every family gets its own color and is listed in a legend next to the chart.

const PALETTE = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#a855f7", // purple
];

interface ColoredFamilyNode extends FamilyTreeNode {
  color: string;
  children?: ColoredFamilyNode[];
}

interface LegendEntry {
  name: string;
  color: string;
}

function buildColoredTree(tree: FamilyTreeNode): {
  root: ColoredFamilyNode;
  legend: LegendEntry[];
} {
  const nodes: LegendEntry[] = [];
  let index = 0;

  const colorize = (node: FamilyTreeNode): ColoredFamilyNode => {
    const color = PALETTE[index % PALETTE.length];
    index += 1;
    nodes.push({ name: node.name, color });
    return { ...node, children: node.children?.map(colorize), color };
  };

  const root = colorize(tree);

  // The synthetic root node isn't rendered, so drop it from the legend.
  const legend = nodes.slice(1);

  return { root, legend };
}

function ReversedSunburstLayer({
  nodes,
  centerX,
  centerY,
  radius,
  arcGenerator,
}: SunburstCustomLayerProps<ColoredFamilyNode>) {
  const { showTooltipFromEvent, hideTooltip } = useTooltip();

  const maxHeight = Math.max(...nodes.map((node) => node.height), 1);
  const band = radius / (maxHeight + 1);

  return (
    <g transform={`translate(${centerX}, ${centerY})`}>
      {nodes.map((node) => {
        const innerRadius = node.height * band;
        const outerRadius = (node.height + 1) * band;
        const d = arcGenerator({
          startAngle: node.arc.startAngle,
          endAngle: node.arc.endAngle,
          innerRadius,
          outerRadius,
        });

        const tooltip = (
          <div className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg">
            {String(node.id)}
          </div>
        );

        return (
          <path
            key={`${node.depth}-${node.id}`}
            d={d ?? undefined}
            fill={node.data.color}
            stroke="#ffffff"
            strokeWidth={1}
            onMouseEnter={(e) => showTooltipFromEvent(tooltip, e)}
            onMouseMove={(e) => showTooltipFromEvent(tooltip, e)}
            onMouseLeave={hideTooltip}
          />
        );
      })}
    </g>
  );
}

export default function FamilySunburst({ familyTree }: { familyTree: FamilyTreeNode }) {
  const model = useMemo(
    () => (familyTree?.children?.length ? buildColoredTree(familyTree) : null),
    [familyTree],
  );

  if (!model) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="h-72 min-w-0 flex-1">
        <ResponsiveSunburst
          data={model.root}
          id="name"
          value="value"
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          cornerRadius={0}
          layers={[ReversedSunburstLayer]}
        />
      </div>

      <ul className="flex w-48 shrink-0 flex-col gap-2">
        {model.legend.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs text-zinc-600">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate">{entry.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
