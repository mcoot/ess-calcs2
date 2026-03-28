"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SharePricePoint } from "@/lib/chart-data";

interface SharePriceChartProps {
  data: SharePricePoint[];
}

export function SharePriceChart({ data }: SharePriceChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground" data-testid="share-price-empty">No share price data available.</p>;
  }

  return (
    <div data-testid="share-price-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => `$${v}`} />
          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} labelFormatter={(l) => `Date: ${l}`} />
          <Line type="monotone" dataKey="fmvPerShare" stroke="#2563eb" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
