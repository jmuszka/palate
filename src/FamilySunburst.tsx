import { useMemo } from "react";
import { ResponsiveSunburst } from "@nivo/sunburst";
import type { SunburstCustomLayerProps } from "@nivo/sunburst";
import { useTooltip } from "@nivo/tooltip";
import type { FamilyTreeNode } from "./etymologyTree";
import { buildColoredTree } from "./familyTree";
import type { ColoredFamilyNode } from "./familyTree";

function ReversedSunburstLayer({
  nodes,
  centerX,
  centerY,
  radius,
  arcGenerator,
}: SunburstCustomLayerProps<ColoredFamilyNode>) {
  const { showTooltipFromEvent, hideTooltip } = useTooltip();

  const maxDepth = Math.max(...nodes.map((node) => node.depth), 1);
  const band = radius / maxDepth;

  return (
    <g transform={`translate(${centerX}, ${centerY})`}>
      {nodes.map((node) => {
        const innerRadius = (maxDepth - node.depth) * band;
        const outerRadius = (maxDepth - node.depth + 1) * band;
        const d = arcGenerator({
          startAngle: node.arc.startAngle,
          endAngle: node.arc.endAngle,
          innerRadius,
          outerRadius,
        });

        const tooltip = (
          <div className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg">
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
