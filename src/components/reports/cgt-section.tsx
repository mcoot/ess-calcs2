"use client";

import { Fragment, useState } from "react";
import type { CgtReportRow } from "@/services/report.service";
import type { FyCgtSummary } from "@/services/cgt.service";
import { formatCurrency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { CgtDrilldown } from "./cgt-drilldown";

interface CgtSectionProps {
  rows: CgtReportRow[];
  summary: FyCgtSummary;
  fy: string;
}

function WalkthroughLine({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className={cn("flex justify-between", indent && "pl-4")}>
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(amount, "AUD")}</span>
    </div>
  );
}

export function CgtSection({ rows, summary, fy }: CgtSectionProps) {
  const hasEvents = rows.length > 0;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  function toggleRow(i: number) {
    setExpandedIndex(expandedIndex === i ? null : i);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Gains Tax — Item 18, Labels H+A</CardTitle>
        <p className="text-sm text-muted-foreground">
          Capital gains schedule — FY {fy}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasEvents ? (
          <p className="text-muted-foreground">No capital gains events in this financial year.</p>
        ) : (
          <>
            {/* Gain/Loss Walkthrough */}
            <div className="rounded-md border p-4 space-y-1 text-sm max-w-md">
              <WalkthroughLine label="Short-term capital gains" amount={summary.shortTermGains as number} />
              <WalkthroughLine label="Long-term capital gains" amount={summary.longTermGains as number} />
              <div className="border-t pt-1">
                <WalkthroughLine label="Total capital gains (Label H)" amount={summary.totalGains as number} />
              </div>
              {(summary.totalLosses as number) > 0 && (
                <>
                  <WalkthroughLine label="Losses applied to short-term" amount={-(summary.shortTermLosses as number)} indent />
                  <WalkthroughLine label="Losses applied to long-term" amount={-(summary.longTermLosses as number)} indent />
                </>
              )}
              <WalkthroughLine label="Short-term after losses" amount={summary.shortTermAfterLosses as number} indent />
              <WalkthroughLine label="Long-term after losses" amount={summary.longTermAfterLosses as number} indent />
              {(summary.discountAmount as number) > 0 && (
                <WalkthroughLine label="50% CGT discount" amount={-(summary.discountAmount as number)} />
              )}
              <div className="border-t pt-1 font-semibold">
                <WalkthroughLine label="Net capital gain (Label A)" amount={summary.netCapitalGain as number} />
              </div>
              {(summary.netCapitalLoss as number) > 0 && (
                <div className="border-t pt-1 text-destructive">
                  <WalkthroughLine label="Net capital loss (carry forward)" amount={summary.netCapitalLoss as number} />
                </div>
              )}
            </div>

            {/* Detail Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Acquisition Date</TableHead>
                  <TableHead>Grant</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Days Held</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Cost Basis (AUD)</TableHead>
                  <TableHead className="text-right">Proceeds (AUD)</TableHead>
                  <TableHead className="text-right">Gain/Loss (AUD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <Fragment key={`${row.lotNumber}-${i}`}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleRow(i)}
                    >
                      <TableCell className="w-8 px-2">
                        {expandedIndex === i
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>{formatDate(row.saleDate)}</TableCell>
                      <TableCell>{formatDate(row.acquisitionDate)}</TableCell>
                      <TableCell>{row.grantNumber}</TableCell>
                      <TableCell>{row.lotNumber}</TableCell>
                      <TableCell className="text-right">{row.sharesSold}</TableCell>
                      <TableCell className="text-right">{row.holdingDays}</TableCell>
                      <TableCell>
                        {row.discountEligible && <Badge variant="secondary">50%</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.costBasisAud as number, "AUD")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.netProceedsAud as number, "AUD")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.capitalGainLossAud as number, "AUD")}
                      </TableCell>
                    </TableRow>
                    {expandedIndex === i && (
                      <TableRow>
                        <TableCell colSpan={11} className="p-0">
                          <CgtDrilldown row={row} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
