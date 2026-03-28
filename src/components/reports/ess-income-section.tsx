import type { AUD } from "@/types";
import type { EssIncomeReportRow } from "@/services/report.service";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";

interface EssIncomeSectionProps {
  rows: EssIncomeReportRow[];
  totalAud: AUD;
  fy: string;
}

export function EssIncomeSection({ rows, totalAud, fy }: EssIncomeSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ESS Income — Item 12, Label F</CardTitle>
        <p className="text-sm text-muted-foreground">
          Employee share scheme discount from deferral schemes — FY {fy}
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No ESS income events in this financial year.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Grant</TableHead>
                <TableHead>Release Ref</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">FMV/Share (USD)</TableHead>
                <TableHead className="text-right">Gross Value (USD)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">ESS Income (AUD)</TableHead>
                <TableHead>30-Day</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${row.releaseRef}-${i}`}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{row.grantNumber}</TableCell>
                  <TableCell>{row.releaseRef}</TableCell>
                  <TableCell className="text-right">{row.shares}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.fmvPerShareUsd as number, "USD")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.grossValueUsd as number, "USD")}
                  </TableCell>
                  <TableCell className="text-right">{row.exchangeRate.toFixed(4)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.essIncomeAud as number, "AUD")}
                  </TableCell>
                  <TableCell>
                    {row.is30DayRule && <Badge variant="secondary">30-day</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={7} className="font-semibold">Total ESS Income</TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totalAud as number, "AUD")}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
