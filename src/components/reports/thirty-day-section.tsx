import type { ThirtyDaySummaryRow } from '@/services/report.service'
import { formatCurrency } from '@/lib/money'
import { formatDate } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ThirtyDaySectionProps {
  rows: ThirtyDaySummaryRow[]
}

export function ThirtyDaySection({ rows }: ThirtyDaySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Day Rule Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shares sold within 30 days of vesting — included in ESS income, excluded from CGT
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No 30-day rule events in this financial year.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale Date</TableHead>
                <TableHead>Vest Date</TableHead>
                <TableHead className="text-right">Days Held</TableHead>
                <TableHead>Grant</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Sale Proceeds (USD)</TableHead>
                <TableHead className="text-right">ESS Income (AUD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${row.grantNumber}-${i}`}>
                  <TableCell>{formatDate(row.saleDate)}</TableCell>
                  <TableCell>{formatDate(row.vestDate)}</TableCell>
                  <TableCell className="text-right">{row.daysHeld}</TableCell>
                  <TableCell>{row.grantNumber}</TableCell>
                  <TableCell className="text-right">{row.shares}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.saleProceedsUsd as number, 'USD')}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.essIncomeAud as number, 'AUD')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
