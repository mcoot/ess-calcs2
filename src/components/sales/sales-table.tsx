"use client";

import { useState } from "react";
import type { SaleLot } from "@/types";
import type { SaleLotCgt } from "@/services/cgt.service";
import { formatCurrency } from "@/lib/money";
import { formatDate, formatShares } from "@/lib/format";
import { toFyString } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

interface SalesTableProps {
  lots: SaleLot[];
  cgtResults: SaleLotCgt[];
}

export function SalesTable({ lots, cgtResults }: SalesTableProps) {
  if (lots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sales loaded. Import a Sales - Long Shares CSV to get started.
      </p>
    );
  }

  const cgtByKey = new Map(
    cgtResults.map((c) => [`${c.withdrawalRef}-${c.lotNumber}`, c])
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead />
          <TableHead>Sale Date</TableHead>
          <TableHead>Grant #</TableHead>
          <TableHead>Lot</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Cost Basis</TableHead>
          <TableHead className="text-right">Proceeds</TableHead>
          <TableHead className="text-right">Gain/Loss (AUD)</TableHead>
          <TableHead>30-Day</TableHead>
          <TableHead>FY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lots.map((lot) => {
          const key = `${lot.withdrawalReferenceNumber}-${lot.lotNumber}`;
          const cgt = cgtByKey.get(key);
          return (
            <SaleRow key={key} lot={lot} cgt={cgt} />
          );
        })}
      </TableBody>
    </Table>
  );
}

function SaleRow({ lot, cgt }: { lot: SaleLot; cgt?: SaleLotCgt }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          {cgt && (
            <button
              aria-label="Expand"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "▼" : "▶"}
            </button>
          )}
        </TableCell>
        <TableCell>{formatDate(lot.saleDate)}</TableCell>
        <TableCell>{lot.grantNumber}</TableCell>
        <TableCell>{lot.lotNumber}</TableCell>
        <TableCell className="text-right">
          {formatShares(lot.sharesSold)}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(lot.costBasis as number, "USD")}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(lot.saleProceeds as number, "USD")}
        </TableCell>
        <TableCell className="text-right">
          {cgt
            ? formatCurrency(cgt.capitalGainLossAud as number, "AUD")
            : "—"}
        </TableCell>
        <TableCell>
          {lot.soldWithin30Days && (
            <Badge variant="secondary">30-Day</Badge>
          )}
        </TableCell>
        <TableCell>
          {cgt ? cgt.financialYear : toFyString(lot.saleDate)}
        </TableCell>
      </TableRow>
      {expanded && cgt && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Holding period:</strong> {cgt.holdingDays} days
                {cgt.isDiscountEligible && " (50% discount eligible)"}
              </div>
              <div>
                <strong>Cost Basis:</strong>{" "}
                {formatCurrency(cgt.costBasisUsd as number, "USD")}
                {" → "}{formatCurrency(cgt.costBasisAud as number, "AUD")}
                {" (rate: "}{cgt.acquisitionForexRate}
                {", "}{formatDate(cgt.acquisitionForexDate)})
              </div>
              <div>
                <strong>Net Proceeds:</strong>{" "}
                {formatCurrency(cgt.netProceedsUsd as number, "USD")}
                {" → "}{formatCurrency(cgt.netProceedsAud as number, "AUD")}
                {" (rate: "}{cgt.saleForexRate}
                {", "}{formatDate(cgt.saleForexDate)})
              </div>
              <div>
                <strong>Capital {(cgt.capitalGainLossAud as number) >= 0 ? "Gain" : "Loss"}:</strong>{" "}
                {formatCurrency(cgt.capitalGainLossAud as number, "AUD")}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
