"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { EssIncomeFyBar } from "@/lib/chart-data";

interface EssIncomeFyChartProps {
  data: EssIncomeFyBar[];
}

export function EssIncomeFyChart({ data }: EssIncomeFyChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground" data-testid="ess-income-fy-empty">No ESS income data available.</p>;
  }

  return (
    <div data-testid="ess-income-fy-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="fy" />
          <YAxis tickFormatter={(v: number) => `A$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `A$${v.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="standard" stackId="ess" fill="#2563eb" name="Standard" />
          <Bar dataKey="thirtyDay" stackId="ess" fill="#ea580c" name="30-Day Rule" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
