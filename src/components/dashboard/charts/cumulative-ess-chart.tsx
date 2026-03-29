"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { CumulativeEssPoint } from "@/lib/chart-data";

interface CumulativeEssChartProps {
  data: CumulativeEssPoint[];
  currency: "USD" | "AUD";
}

export function CumulativeEssChart({ data, currency }: CumulativeEssChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground" data-testid="cumulative-ess-empty">No cumulative income data available.</p>;
  }

  return (
    <div data-testid="cumulative-ess-chart">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="essGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `${currency === "AUD" ? "A$" : "$"}${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `${currency === "AUD" ? "A$" : "$"}${v.toLocaleString()}`} />
          <Area type="monotone" dataKey="cumulative" stroke="#2563eb" fill="url(#essGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
