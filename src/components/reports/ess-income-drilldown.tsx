import type { EssIncomeReportRow } from "@/services/report.service";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";

interface EssIncomeDrilldownProps {
  row: EssIncomeReportRow;
}

export function EssIncomeDrilldown({ row }: EssIncomeDrilldownProps) {
  return (
    <div className="space-y-1 py-2 px-4 text-sm text-muted-foreground bg-muted/50 rounded">
      <div>Source: Release {row.releaseRef}, {formatDate(row.date)}</div>
      <div>
        Gross value: {row.shares} × {formatCurrency(row.fmvPerShareUsd as number, "USD")} ={" "}
        {formatCurrency(row.grossValueUsd as number, "USD")}
      </div>
      {row.is30DayRule && (
        <>
          <div className="font-medium text-foreground">30-day rule applied</div>
          {row.notes && <div>{row.notes}</div>}
        </>
      )}
      <div>
        Exchange rate: {row.exchangeRate.toFixed(4)} ({formatDate(row.rateDate)})
      </div>
      <div>
        AUD conversion: {formatCurrency(row.grossValueUsd as number, "USD")} /{" "}
        {row.exchangeRate.toFixed(4)} = {formatCurrency(row.essIncomeAud as number, "AUD")}
      </div>
    </div>
  );
}
