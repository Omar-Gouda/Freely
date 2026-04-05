"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#7c3aed", "#a855f7", "#c084fc", "#6d28d9", "#4c1d95"];

export function SourceChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
