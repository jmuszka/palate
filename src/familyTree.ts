import type { FamilyTreeNode } from "./etymologyTree";

// Renders the language-family hierarchy as a sunburst chart with the root
// (top of the hierarchy) on the outer ring and the leaves in the center.
// Nivo lays out the tree root-first, so we render arcs ourselves using each
// node's `depth` to invert the radius order: the outer ring is always full and
// every node's children fully split its arc on the next ring inward.
// Every family gets its own color and is listed in a legend next to the chart.

export const PALETTE = [
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

export interface ColoredFamilyNode extends FamilyTreeNode {
  color: string;
  children?: ColoredFamilyNode[];
}

export interface LegendEntry {
  name: string;
  color: string;
}

export function buildColoredTree(tree: FamilyTreeNode): {
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
