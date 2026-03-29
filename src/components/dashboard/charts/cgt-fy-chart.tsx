"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { CgtFyBar } from "@/lib/chart-data";
import { currencyPrefix } from "@/lib/money";

interface CgtFyChartProps {
  data: CgtFyBar[];
  currency: "USD" | "AUD";
}

export function CgtFyChart({ data, currency }: CgtFyChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-muted-foreground" data-testid="cgt-fy-empty">No capital gains data available.</p>;
  }

  return (
    <div data-testid="cgt-fy-chart">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <XAxis dataKey="fy" />
          <YAxis tickFormatter={(v: number) => `${currencyPrefix(currency)}${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `${currencyPrefix(currency)}${v.toLocaleString()}`} />
          <Legend />
          <ReferenceLine y={0} stroke="#666" />
          <Bar dataKey="shortTermGains" fill="#16a34a" name="Short-term Gains" />
          <Bar dataKey="longTermGains" fill="#2563eb" name="Long-term Gains" />
          <Bar dataKey="losses" fill="#dc2626" name="Losses" />
          <Line type="monotone" dataKey="netGain" stroke="#8b5cf6" name="Net Gain" strokeWidth={2} dot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
