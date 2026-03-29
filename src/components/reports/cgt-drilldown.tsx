import type { CgtReportRow } from '@/services/report.service'
import { formatCurrency } from '@/lib/money'
import { formatDate } from '@/lib/format'

interface CgtDrilldownProps {
  row: CgtReportRow
}

export function CgtDrilldown({ row }: CgtDrilldownProps) {
  return (
    <div className="space-y-1 py-2 px-4 text-sm text-muted-foreground bg-muted/50 rounded">
      <div>
        Holding period: {row.holdingDays} days —{' '}
        {row.discountEligible ? 'Discount eligible (50%)' : 'Not eligible for discount'}
      </div>
      <div>
        Cost basis: {formatCurrency(row.costBasisUsd as number, 'USD')} at rate{' '}
        {row.costBasisRate.toFixed(4)} ({formatDate(row.costBasisRateDate)}) ={' '}
        {formatCurrency(row.costBasisAud as number, 'AUD')}
      </div>
      <div>Gross proceeds: {formatCurrency(row.grossProceedsUsd as number, 'USD')}</div>
      <div className="pl-4">Brokerage: −{formatCurrency(row.brokerageUsd as number, 'USD')}</div>
      <div className="pl-4">Fees: −{formatCurrency(row.feesUsd as number, 'USD')}</div>
      <div>
        Net proceeds: {formatCurrency(row.netProceedsUsd as number, 'USD')} at rate{' '}
        {row.proceedsRate.toFixed(4)} ({formatDate(row.proceedsRateDate)}) ={' '}
        {formatCurrency(row.netProceedsAud as number, 'AUD')}
      </div>
      <div className="font-medium text-foreground">
        Gain/Loss: {formatCurrency(row.netProceedsAud as number, 'AUD')} −{' '}
        {formatCurrency(row.costBasisAud as number, 'AUD')} ={' '}
        {formatCurrency(row.capitalGainLossAud as number, 'AUD')}
      </div>
    </div>
  )
}
