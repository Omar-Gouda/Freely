"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FunnelChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="chart-wrapper">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#7c3aed" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
