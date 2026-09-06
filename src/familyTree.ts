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
  // Glottocode extracted from the node id (e.g. "Indo-European [indo1319]").
  code?: string;
  // Number of levels below this node (0 for a leaf). Used by the sunburst to
  // extend arcs inward without leaving gaps in unbalanced trees.
  subtreeDepth: number;
  children?: ColoredFamilyNode[];
}

export interface LegendEntry {
  name: string;
  color: string;
  code?: string;
}

const FAMILY_CODE_PATTERN = /\[([a-z0-9]+)\]/i;

export function extractFamilyCode(id: string): string | undefined {
  return id.match(FAMILY_CODE_PATTERN)?.[1];
}

// Active arc ids for a hovered family: the matched node, all of its ancestors,
// and all of its descendants. Everything else can be dimmed.
export function matchFamily(
  root: ColoredFamilyNode,
  code: string,
): { active: Set<string>; found: boolean } {
  const active = new Set<string>();

  const walk = (node: ColoredFamilyNode): boolean => {
    const foundHere = node.code === code;
    let foundDescendant = false;
    for (const child of node.children ?? []) {
      if (walk(child)) foundDescendant = true;
    }
    if (foundHere || foundDescendant) active.add(node.code ?? "");
    return foundHere || foundDescendant;
  };

  const found = walk(root);
  return { active, found };
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
    const code = extractFamilyCode(node.id);
    nodes.push({ name: node.name, color, code });
    const children = node.children?.map(colorize);
    // d3's hierarchy().sum() adds a node's own value to its descendants', so an
    // internal node's value (already the sum of its children) would be counted
    // twice and leave a gap in the circle. Only leaves should carry weight.
    const hasChildren = children !== undefined && children.length > 0;
    const subtreeDepth = hasChildren
      ? 1 + Math.max(...children.map((child) => child.subtreeDepth))
      : 0;
    return {
      ...node,
      value: hasChildren ? 0 : node.value,
      children,
      color,
      code,
      subtreeDepth,
    };
  };

  const root = colorize(tree);

  // The synthetic root node isn't rendered, so drop it from the legend.
  const legend = nodes.slice(1);

  return { root, legend };
}
