import { useMemo } from "react";
import { ResponsiveSunburst } from "@nivo/sunburst";
import type { SunburstCustomLayerProps } from "@nivo/sunburst";
import { useTooltip } from "@nivo/tooltip";
import type { FamilyTreeNode } from "../lib/etymologyTree";
import { buildColoredTree, matchFamily } from "../lib/familyTree";
import type { ColoredFamilyNode } from "../lib/familyTree";
import useIsMobile from "../hooks/useIsMobile";

// Renders a "fill-to-center" sunburst: every node's arc spans from its own ring
// (one band per level, root at the outside) all the way inward to the innermost
// ring its subtree occupies, and leaves always reach the center. This leaves no
// gaps regardless of how unbalanced the branch depths are.
// Children are painted after their parents so each ring shows its own color.
function ReversedSunburstLayer({
  nodes,
  centerX,
  centerY,
  radius,
  arcGenerator,
  activeIds,
  onHover,
}: SunburstCustomLayerProps<ColoredFamilyNode> & {
  activeIds?: Set<string> | null;
  onHover: (code: string | null) => void;
}) {
  const { showTooltipFromEvent, hideTooltip } = useTooltip();

  const maxDepth = Math.max(...nodes.map((node) => node.depth), 1);
  const band = radius / (maxDepth + 1);
  const ordered = [...nodes].sort((a, b) => a.depth - b.depth);

  return (
    <g transform={`translate(${centerX}, ${centerY})`}>
      {ordered.map((node) => {
        const hasChildren = node.data.children !== undefined && node.data.children.length > 0;
        const subtreeDepth = node.data.subtreeDepth ?? 0;
        const innerRadius = hasChildren ? (maxDepth - (node.depth + subtreeDepth)) * band : 0;
        const outerRadius = (maxDepth - node.depth + 1) * band;
        const d = arcGenerator({
          startAngle: node.arc.startAngle,
          endAngle: node.arc.endAngle,
          innerRadius,
          outerRadius,
        });

        const code = node.data.code;
        const dimmed = activeIds !== null && activeIds !== undefined && !activeIds.has(code ?? "");

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
            opacity={dimmed ? 0.15 : 1}
            onMouseEnter={(e) => {
              showTooltipFromEvent(tooltip, e);
              onHover(code ?? null);
            }}
            onMouseMove={(e) => showTooltipFromEvent(tooltip, e)}
            onMouseLeave={() => {
              hideTooltip();
              onHover(null);
            }}
          />
        );
      })}
    </g>
  );
}

function matchNodeIds(
  model: ColoredFamilyNode,
  code: string,
): { active: Set<string>; found: boolean } {
  return matchFamily(model, code);
}

export default function FamilySunburst({
  familyTree,
  highlight,
  onHover,
}: {
  familyTree: FamilyTreeNode;
  highlight?: string | null;
  onHover?: (code: string | null) => void;
}) {
  const isMobile = useIsMobile();
  const model = useMemo(
    () => (familyTree?.children?.length ? buildColoredTree(familyTree) : null),
    [familyTree],
  );

  const activeIds = useMemo(() => {
    if (!model || !highlight) return null;
    const match = matchNodeIds(model.root, highlight);
    return match.found ? match.active : null;
  }, [model, highlight]);

  if (!model) return null;

  const hover = onHover ?? (() => {});

  const chart = (
    <div className="aspect-square w-64 max-w-full sm:w-72">
      <ResponsiveSunburst
        data={model.root}
        id="name"
        value="value"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        cornerRadius={0}
        layers={[
          (props) => <ReversedSunburstLayer {...props} activeIds={activeIds} onHover={hover} />,
        ]}
      />
    </div>
  );

  const legend = (
    <ul className="flex flex-col gap-1.5 sm:grid sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1.5">
      {model.legend.map((entry) => (
        <li
          key={entry.name}
          className="flex items-center gap-2 text-xs text-zinc-600 cursor-default"
          onMouseEnter={() => entry.code && hover(entry.code)}
          onMouseLeave={() => hover(null)}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate">{entry.name}</span>
        </li>
      ))}
    </ul>
  );

  // Stacked below the chart when there's not enough horizontal room for the
  // side-by-side layout, so the chart is never squeezed.
  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-3">
        {chart}
        <div className="w-full">{legend}</div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">{chart}</div>
      <div className="min-w-0 flex-1">{legend}</div>
    </div>
  );
}
