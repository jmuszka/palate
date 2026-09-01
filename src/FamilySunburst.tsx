import { ResponsiveSunburst } from "@nivo/sunburst";
import type { SunburstCustomLayerProps } from "@nivo/sunburst";
import { useTooltip } from "@nivo/tooltip";
import type { FamilyTreeNode } from "./EtymologyTree";

// Renders the language-family hierarchy as a sunburst chart with the root
// (top of the hierarchy) on the outer ring and the leaves in the center.
// Nivo lays out the tree root-first, so we render arcs ourselves using each
// node's `height` (distance from the deepest leaf) to invert the radius order.

const MIN_LABEL_ANGLE = 0.3; // radians

function ReversedSunburstLayer({
  nodes,
  centerX,
  centerY,
  radius,
  arcGenerator,
}: SunburstCustomLayerProps<FamilyTreeNode>) {
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
            {String(node.id)} · {node.value}
          </div>
        );

        return (
          <path
            key={`${node.depth}-${node.id}`}
            d={d ?? undefined}
            fill={node.color}
            stroke="#ffffff"
            strokeWidth={1}
            onMouseEnter={(e) => showTooltipFromEvent(tooltip, e)}
            onMouseMove={(e) => showTooltipFromEvent(tooltip, e)}
            onMouseLeave={hideTooltip}
          />
        );
      })}

      {nodes.map((node) => {
        const span = node.arc.endAngle - node.arc.startAngle;
        if (span < MIN_LABEL_ANGLE) return null;

        const innerRadius = node.height * band;
        const outerRadius = (node.height + 1) * band;
        const midAngle = (node.arc.startAngle + node.arc.endAngle) / 2;
        const r = (innerRadius + outerRadius) / 2;
        const x = Math.sin(midAngle) * r;
        const y = -Math.cos(midAngle) * r;
        let deg = (midAngle * 180) / Math.PI;
        if (deg > 90 && deg < 270) deg += 180;

        return (
          <text
            key={`${node.depth}-${node.id}-label`}
            x={x}
            y={y}
            transform={`rotate(${deg} ${x} ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fill: "#18181b", pointerEvents: "none" }}
          >
            {String(node.id)}
          </text>
        );
      })}
    </g>
  );
}

export default function FamilySunburst({ familyTree }: { familyTree: FamilyTreeNode }) {
  if (!familyTree?.children?.length) return null;

  return (
    <div className="h-80 w-full">
      <ResponsiveSunburst
        data={familyTree}
        id="name"
        value="value"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        cornerRadius={0}
        colors={{ scheme: "nivo" }}
        layers={[ReversedSunburstLayer]}
      />
    </div>
  );
}
