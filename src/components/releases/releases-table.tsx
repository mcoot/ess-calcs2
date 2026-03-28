"use client";

import { useState } from "react";
import type { RsuRelease } from "@/types";
import type { ReleaseEssIncome } from "@/services/ess-income.service";
import { formatCurrency } from "@/lib/money";
import { formatDate, formatShares } from "@/lib/format";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

interface ReleasesTableProps {
  incomes: ReleaseEssIncome[];
  releases: RsuRelease[];
}

export function ReleasesTable({ incomes, releases }: ReleasesTableProps) {
  if (incomes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No releases loaded. Import an RSU Releases CSV to get started.
      </p>
    );
  }

  const nameByRef = new Map(
    releases.map((r) => [r.releaseReferenceNumber, r.grantName])
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead />
          <TableHead>Release Date</TableHead>
          <TableHead>Grant #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">FMV/Share</TableHead>
          <TableHead className="text-right">ESS Income (AUD)</TableHead>
          <TableHead className="text-right">30-Day Lots</TableHead>
          <TableHead>FY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.map((inc) => (
          <ReleaseRow
            key={inc.releaseRef}
            income={inc}
            grantName={nameByRef.get(inc.releaseRef) ?? ""}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function ReleaseRow({
  income,
  grantName,
}: {
  income: ReleaseEssIncome;
  grantName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>
          <button
            aria-label="Expand"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "▼" : "▶"}
          </button>
        </TableCell>
        <TableCell>{formatDate(income.releaseDate)}</TableCell>
        <TableCell>{income.grantNumber}</TableCell>
        <TableCell>{grantName}</TableCell>
        <TableCell className="text-right">
          {formatShares(income.sharesVested)}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(income.fmvPerShare as number, "USD")}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(income.totalEssIncomeAud as number, "AUD")}
        </TableCell>
        <TableCell className="text-right">
          {income.thirtyDayLots.length > 0
            ? income.thirtyDayLots.length
            : "—"}
        </TableCell>
        <TableCell>{income.financialYear}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="bg-muted/30 p-4">
            <div className="space-y-2 text-sm">
              <div>
                <strong>Standard ESS Income</strong>
                <span className="ml-2">
                  {income.standardShares} shares × {formatCurrency(income.fmvPerShare as number, "USD")}
                  {" = "}{formatCurrency(income.standardIncomeUsd as number, "USD")}
                </span>
              </div>
              <div>
                Forex rate: {income.standardForexRate} ({formatDate(income.standardForexDate)})
                {" → "}{formatCurrency(income.standardIncomeAud as number, "AUD")}
              </div>
              {income.thirtyDayLots.map((lot) => (
                <div key={lot.saleLotRef} className="border-t pt-2">
                  <strong>30-Day Lot</strong> ({lot.saleLotRef})
                  <span className="ml-2">
                    {lot.sharesSold} shares sold {formatDate(lot.saleDate)}
                    {" → "}{formatCurrency(lot.essIncomeAud as number, "AUD")}
                    {" (rate: "}{lot.forexRate})
                  </span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
