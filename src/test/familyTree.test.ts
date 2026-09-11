import { describe, expect, it } from "vitest";
import { buildColoredTree, extractFamilyCode, matchFamily, PALETTE } from "../lib/familyTree";
import type { FamilyTreeNode } from "../lib/etymologyTree";

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

  it("zeroes internal node values so only leaves carry weight", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 6,
      children: [
        {
          id: "a",
          name: "A",
          value: 2,
          children: [
            { id: "a1", name: "A1", value: 1 },
            { id: "a2", name: "A2", value: 1 },
          ],
        },
        { id: "b", name: "B", value: 1 },
      ],
    };

    const { root } = buildColoredTree(tree);

    expect(root.value).toBe(0);
    expect(root.children?.[0].value).toBe(0);
    expect(root.children?.[0].children?.[0].value).toBe(1);
    expect(root.children?.[1].value).toBe(1);
  });

  it("computes subtreeDepth as the number of levels below each node", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 6,
      children: [
        {
          id: "a",
          name: "A",
          value: 4,
          children: [
            { id: "a1", name: "A1", value: 3, children: [{ id: "a11", name: "A11", value: 1 }] },
            { id: "a2", name: "A2", value: 1 },
          ],
        },
        { id: "b", name: "B", value: 1 },
      ],
    };

    const { root } = buildColoredTree(tree);

    expect(root.subtreeDepth).toBe(3);
    expect(root.children?.[0].subtreeDepth).toBe(2);
    expect(root.children?.[0].children?.[0].subtreeDepth).toBe(1);
    expect(root.children?.[0].children?.[0].children?.[0].subtreeDepth).toBe(0);
    expect(root.children?.[1].subtreeDepth).toBe(0);
  });

  it("extracts glidecodes from bracketed family ids", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 1,
      children: [{ id: "'Indo-European [indo1319]'", name: "Indo-European", value: 1 }],
    };

    const { root } = buildColoredTree(tree);

    expect(root.children?.[0].code).toBe("indo1319");
    expect(root.children?.[0].name).toBe("Indo-European");
  });

  it("reads glottocodes from the glottocode property", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 1,
      children: [{ id: "Indo-European", name: "Indo-European", glottocode: "indo1319", value: 1 }],
    };

    const { root, legend } = buildColoredTree(tree);

    expect(root.children?.[0].code).toBe("indo1319");
    expect(legend[0].code).toBe("indo1319");
  });

  it("prefers the glottocode property over the bracketed id", () => {
    const tree: FamilyTreeNode = {
      id: "root",
      name: "root",
      value: 1,
      children: [
        {
          id: "Indo-European [indo1319]",
          name: "Indo-European",
          glottocode: "indo9999",
          value: 1,
        },
      ],
    };

    const { root } = buildColoredTree(tree);

    expect(root.children?.[0].code).toBe("indo9999");
  });
});

describe("extractFamilyCode", () => {
  it("extracts a code from a bracketed id", () => {
    expect(extractFamilyCode("Indo-European [indo1319]")).toBe("indo1319");
  });

  it("returns undefined when there is no code", () => {
    expect(extractFamilyCode("Indo-European")).toBeUndefined();
  });
});

describe("matchFamily", () => {
  const tree: FamilyTreeNode = {
    id: "root",
    name: "root",
    value: 5,
    children: [
      {
        id: "'Germanic [germ1287]'",
        name: "Germanic",
        value: 2,
        children: [
          { id: "'West Germanic [west2793]'", name: "West Germanic", value: 1 },
          { id: "'North Germanic [nort2782]'", name: "North Germanic", value: 1 },
        ],
      },
      {
        id: "'Romance [roma1334]'",
        name: "Romance",
        value: 1,
      },
    ],
  };

  it("activates a family, its ancestors, and its descendants", () => {
    const { root } = buildColoredTree(tree);
    const { active, found } = matchFamily(root, "west2793");

    expect(found).toBe(true);
    // root has no code; Germanic and West Germanic are on the path
    expect(active.has("germ1287")).toBe(true);
    expect(active.has("west2793")).toBe(true);
    expect(active.has("nort2782")).toBe(false);
    expect(active.has("roma1334")).toBe(false);
  });

  it("reports not found for families outside the tree", () => {
    const { root } = buildColoredTree(tree);
    const { found } = matchFamily(root, "absent1234");
    expect(found).toBe(false);
  });
});
