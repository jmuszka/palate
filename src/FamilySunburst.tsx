import { ResponsiveSunburst } from "@nivo/sunburst";
import type { FamilyTreeNode } from "./EtymologyTree";

// Renders the language-family hierarchy as a sunburst chart.
// Input is the nested `familyTree` from the /etymology endpoint:
// a root node with `name`, `value`, and (optionally) `children`.

export default function FamilySunburst({ familyTree }: { familyTree: FamilyTreeNode }) {
  if (!familyTree?.children?.length) return null;

  return (
    <div className="h-80 w-full">
      <ResponsiveSunburst
        data={familyTree}
        id="name"
        value="value"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        cornerRadius={2}
        borderWidth={1}
        borderColor="#ffffff"
        colors={{ scheme: "nivo" }}
        childColor={{ from: "color", modifiers: [["brighter", 0.2]] }}
        enableArcLabels
        arcLabel={(d) => String(d.id)}
        arcLabelsSkipAngle={15}
        arcLabelsTextColor="#18181b"
        tooltip={(d) => (
          <div className="pointer-events-none rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg">
            {String(d.id)} · {d.value}
          </div>
        )}
      />
    </div>
  );
}
