import { ResponsiveSunburst } from "@nivo/sunburst";

// Renders the language-family distribution as a sunburst chart.
// Input is a flat list of family labels (e.g. ["Germanic", "Latin", "Germanic"]);
// we tally counts and draw one slice per distinct family. Later this can be
// fed a hierarchical structure to add depth.

export default function FamilySunburst({ families }: { families: string[] }) {
  if (!families || families.length === 0) return null;

  // Tally occurrences, then sort largest-first for a stable, readable order.
  const counts = new Map<string, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);

  const data = {
    name: "Language families",
    children: [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveSunburst
        data={data}
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
        arcLabelsSkipAngle={12}
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
