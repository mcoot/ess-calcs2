"use client";

import type { Award } from "@/types";
import { formatCurrency } from "@/lib/money";
import { formatDate, formatShares } from "@/lib/format";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

interface AwardsTableProps {
  awards: Award[];
}

export function AwardsTable({ awards }: AwardsTableProps) {
  if (awards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No awards loaded. Import an Award Summary CSV to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Grant Date</TableHead>
          <TableHead>Grant #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Shares Granted</TableHead>
          <TableHead className="text-right">Conversion Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {awards.map((award) => (
          <TableRow key={award.grantNumber}>
            <TableCell>{formatDate(award.grantDate)}</TableCell>
            <TableCell>{award.grantNumber}</TableCell>
            <TableCell>{award.grantName}</TableCell>
            <TableCell>{award.grantReason}</TableCell>
            <TableCell className="text-right">
              {formatShares(award.sharesGranted)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(award.conversionPrice as number, "USD")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
