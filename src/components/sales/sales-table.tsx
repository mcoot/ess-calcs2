'use client'

import { Fragment, useState } from 'react'
import type { SaleLot, USD } from '@/types'
import { usd } from '@/types'
import type { SaleLotCgt } from '@/services/cgt.service'
import { formatCurrency } from '@/lib/money'
import { formatDate, formatShares } from '@/lib/format'
import { toFyString } from '@/lib/dates'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

// ── Grouping helper ────────────────────────────────────────────────

interface WithdrawalGroup {
  withdrawalRef: string
  saleDate: Date
  lots: SaleLot[]
  totalShares: number
  totalProceeds: USD
  thirtyDayCount: number
  cgtCount: number
}

function groupByWithdrawal(lots: SaleLot[]): WithdrawalGroup[] {
  const map = new Map<string, SaleLot[]>()
  for (const lot of lots) {
    const ref = lot.withdrawalReferenceNumber
    const existing = map.get(ref)
    if (existing) {
      existing.push(lot)
    } else {
      map.set(ref, [lot])
    }
  }

  return Array.from(map.entries()).map(([ref, groupLots]) => {
    let totalShares = 0
    let totalProceeds = 0
    let thirtyDayCount = 0
    let cgtCount = 0
    for (const lot of groupLots) {
      totalShares += lot.sharesSold
      totalProceeds += lot.saleProceeds as number
      if (lot.soldWithin30Days) {
        thirtyDayCount++
      } else {
        cgtCount++
      }
    }
    return {
      withdrawalRef: ref,
      saleDate: groupLots[0].saleDate,
      lots: groupLots,
      totalShares,
      totalProceeds: usd(Math.round(totalProceeds * 100) / 100),
      thirtyDayCount,
      cgtCount,
    }
  })
}

function lotKey(lot: SaleLot): string {
  return `${lot.withdrawalReferenceNumber}-${lot.originatingReleaseRef}-${lot.lotNumber}`
}

// ── Components ─────────────────────────────────────────────────────

interface SalesTableProps {
  lots: SaleLot[]
  cgtResults: SaleLotCgt[]
  displayCurrency: 'USD' | 'AUD'
}

export function SalesTable({ lots, cgtResults, displayCurrency }: SalesTableProps) {
  if (lots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sales loaded. Import a Sales - Long Shares CSV to get started.
      </p>
    )
  }

  const cgtByKey = new Map(
    cgtResults.map((c) => [`${c.withdrawalRef}-${c.originatingReleaseRef}-${c.lotNumber}`, c]),
  )

  const groups = groupByWithdrawal(lots)

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
          <TableHead className="text-right">{`Gain/Loss (${displayCurrency})`}</TableHead>
          <TableHead>30-Day</TableHead>
          <TableHead>FY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <Fragment key={group.withdrawalRef}>
            <WithdrawalHeaderRow group={group} />
            {group.lots.map((lot) => {
              const key = lotKey(lot)
              const cgt = cgtByKey.get(key)
              return <SaleRow key={key} lot={lot} cgt={cgt} displayCurrency={displayCurrency} />
            })}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

function WithdrawalHeaderRow({ group }: { group: WithdrawalGroup }) {
  return (
    <TableRow className="bg-muted/50 font-semibold border-t-2">
      <TableCell />
      <TableCell>{formatDate(group.saleDate)}</TableCell>
      <TableCell colSpan={2} className="text-xs text-muted-foreground">
        {group.withdrawalRef}
      </TableCell>
      <TableCell className="text-right">{formatShares(group.totalShares)}</TableCell>
      <TableCell />
      <TableCell className="text-right">
        {formatCurrency(group.totalProceeds as number, 'USD')}
      </TableCell>
      <TableCell />
      <TableCell>
        {group.thirtyDayCount > 0 && (
          <Badge variant="secondary">{group.thirtyDayCount} x 30-day</Badge>
        )}
      </TableCell>
      <TableCell>{toFyString(group.saleDate)}</TableCell>
    </TableRow>
  )
}

const MILLIS_PER_DAY = 86_400_000

function SaleRow({
  lot,
  cgt,
  displayCurrency,
}: {
  lot: SaleLot
  cgt?: SaleLotCgt
  displayCurrency: 'USD' | 'AUD'
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <TableCell className="w-8 px-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell>{formatDate(lot.saleDate)}</TableCell>
        <TableCell>{lot.grantNumber}</TableCell>
        <TableCell>{lot.lotNumber}</TableCell>
        <TableCell className="text-right">{formatShares(lot.sharesSold)}</TableCell>
        <TableCell className="text-right">
          {formatCurrency(lot.costBasis as number, 'USD')}
        </TableCell>
        <TableCell className="text-right">
          {formatCurrency(lot.saleProceeds as number, 'USD')}
        </TableCell>
        <TableCell className="text-right">
          {cgt
            ? formatCurrency(
                displayCurrency === 'USD'
                  ? (cgt.capitalGainLossUsd as number)
                  : (cgt.capitalGainLossAud as number),
                displayCurrency,
              )
            : '—'}
        </TableCell>
        <TableCell>{lot.soldWithin30Days && <Badge variant="secondary">30-Day</Badge>}</TableCell>
        <TableCell>{cgt ? cgt.financialYear : toFyString(lot.saleDate)}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            {cgt ? <CgtDetail cgt={cgt} /> : <ThirtyDayDetail lot={lot} />}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function CgtDetail({ cgt }: { cgt: SaleLotCgt }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <strong>Holding period:</strong> {cgt.holdingDays} days
        {cgt.isDiscountEligible && ' (50% discount eligible)'}
      </div>
      <div>
        <strong>Cost Basis:</strong> {formatCurrency(cgt.costBasisUsd as number, 'USD')}
        {' → '}
        {formatCurrency(cgt.costBasisAud as number, 'AUD')}
        {' (rate: '}
        {cgt.acquisitionForexRate}
        {', '}
        {formatDate(cgt.acquisitionForexDate)})
      </div>
      <div>
        <strong>Net Proceeds:</strong> {formatCurrency(cgt.netProceedsUsd as number, 'USD')}
        {' → '}
        {formatCurrency(cgt.netProceedsAud as number, 'AUD')}
        {' (rate: '}
        {cgt.saleForexRate}
        {', '}
        {formatDate(cgt.saleForexDate)})
      </div>
      <div>
        <strong>Capital {(cgt.capitalGainLossAud as number) >= 0 ? 'Gain' : 'Loss'}:</strong>{' '}
        {formatCurrency(cgt.capitalGainLossAud as number, 'AUD')}
      </div>
    </div>
  )
}

function ThirtyDayDetail({ lot }: { lot: SaleLot }) {
  const daysHeld = Math.round(
    (lot.saleDate.getTime() - lot.originalAcquisitionDate.getTime()) / MILLIS_PER_DAY,
  )

  return (
    <div className="space-y-2 text-sm">
      <div className="text-muted-foreground">
        Sold within 30 days of vesting — treated as ESS income, not subject to CGT.
      </div>
      <div>
        <strong>Release:</strong> {lot.originatingReleaseRef}
      </div>
      <div>
        <strong>Acquired:</strong> {formatDate(lot.originalAcquisitionDate)}
        {' → '}
        <strong>Sold:</strong> {formatDate(lot.saleDate)}
        {' ('}
        {daysHeld} days)
      </div>
      <div className="text-muted-foreground">
        Income from this lot is calculated on the Releases page.
      </div>
    </div>
  )
}
