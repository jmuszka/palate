import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Renders the language-family distribution as a pie chart.
// Input is a flat list of family labels (e.g. ["Germanic", "Latin", "Germanic"]);
// we tally counts and draw one slice per distinct family.

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
];

export default function FamilyPieChart({ families }: { families: string[] }) {
  if (!families || families.length === 0) return null;

  // Tally occurrences, then sort largest-first for a stable, readable order.
  const counts = new Map<string, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);
  const data = [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
