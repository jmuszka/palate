import { describe, expect, it } from "vitest";
import { buildColoredTree, PALETTE } from "./familyTree";
import type { FamilyTreeNode } from "./etymologyTree";

describe("buildColoredTree", () => {
  it("assigns colors in traversal order and drops the root from the legend", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 10,
      children: [
        { id: "a", name: "A", value: 5, children: [{ id: "a1", name: "A1", value: 2 }] },
        { id: "b", name: "B", value: 3 },
      ],
    };

    const { root, legend } = buildColoredTree(tree);

    expect(root.color).toBe(PALETTE[0]);
    expect(root.children?.[0].color).toBe(PALETTE[1]);
    expect(root.children?.[0].children?.[0].color).toBe(PALETTE[2]);
    expect(root.children?.[1].color).toBe(PALETTE[3]);

    expect(legend.map((l) => l.name)).toEqual(["A", "A1", "B"]);
    expect(legend.map((l) => l.color)).toEqual([PALETTE[1], PALETTE[2], PALETTE[3]]);
  });

  it("wraps the palette when there are more nodes than colors", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 1,
      children: Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `N${i}`, value: 1 })),
    };

    const { legend } = buildColoredTree(tree);

    expect(legend).toHaveLength(20);
    expect(legend[11].color).toBe(PALETTE[0]);
    expect(legend[12].color).toBe(PALETTE[1]);
  });

  it("returns an empty legend for a root with no children", () => {
    const { root, legend } = buildColoredTree({ id: "root", name: "root", value: 1 });

    expect(root.color).toBe(PALETTE[0]);
    expect(legend).toEqual([]);
  });
});
