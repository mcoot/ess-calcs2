import type { EssIncomeReportRow, CgtReportRow, ThirtyDaySummaryRow } from './report.service'
import { toDateKey } from '@/lib/dates'

// ── Service interface ───────────────────────────────────────────────

export interface CsvExportService {
  exportEssIncomeCsv(rows: EssIncomeReportRow[], fy: string): string
  exportCgtCsv(rows: CgtReportRow[], fy: string): string
  exportThirtyDayCsv(rows: ThirtyDaySummaryRow[], fy: string): string
}

// ── Helpers ─────────────────────────────────────────────────────────

const BOM = '\uFEFF'

function money(n: number): string {
  return n.toFixed(2)
}

function rate(n: number): string {
  return n.toFixed(4)
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsvLine(fields: string[]): string {
  return fields.map(escapeCsv).join(',')
}

function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [toCsvLine(headers), ...rows.map(toCsvLine)]
  return BOM + lines.join('\n')
}

// ── Factory ─────────────────────────────────────────────────────────

export function createCsvExportService(): CsvExportService {
  function exportEssIncomeCsv(rows: EssIncomeReportRow[]): string {
    const headers = [
      'Date',
      'Grant Number',
      'Grant Name',
      'Release Ref',
      'Shares',
      'FMV/Share (USD)',
      'Gross Value (USD)',
      'Exchange Rate',
      'Rate Date',
      'ESS Income (AUD)',
      '30-Day Rule',
      'Notes',
    ]

    const dataRows = rows.map((r) => [
      toDateKey(r.date),
      String(r.grantNumber),
      r.grantName,
      r.releaseRef,
      String(r.shares),
      money(r.fmvPerShareUsd as number),
      money(r.grossValueUsd as number),
      rate(r.exchangeRate),
      toDateKey(r.rateDate),
      money(r.essIncomeAud as number),
      r.is30DayRule ? 'Yes' : 'No',
      r.notes,
    ])

    return buildCsv(headers, dataRows)
  }

  function exportCgtCsv(rows: CgtReportRow[]): string {
    const headers = [
      'Sale Date',
      'Acquisition Date',
      'Grant Number',
      'Grant Name',
      'Lot',
      'Shares Sold',
      'Holding Period (Days)',
      'Discount Eligible',
      'Cost Basis (USD)',
      'Cost Basis (AUD)',
      'Cost Basis Rate',
      'Cost Basis Rate Date',
      'Net Proceeds (USD)',
      'Net Proceeds (AUD)',
      'Proceeds Rate',
      'Proceeds Rate Date',
      'Capital Gain/Loss (AUD)',
    ]

    const dataRows = rows.map((r) => [
      toDateKey(r.saleDate),
      toDateKey(r.acquisitionDate),
      String(r.grantNumber),
      r.grantName,
      String(r.lotNumber),
      String(r.sharesSold),
      String(r.holdingDays),
      r.discountEligible ? 'Yes' : 'No',
      money(r.costBasisUsd as number),
      money(r.costBasisAud as number),
      rate(r.costBasisRate),
      toDateKey(r.costBasisRateDate),
      money(r.netProceedsUsd as number),
      money(r.netProceedsAud as number),
      rate(r.proceedsRate),
      toDateKey(r.proceedsRateDate),
      money(r.capitalGainLossAud as number),
    ])

    return buildCsv(headers, dataRows)
  }

  function exportThirtyDayCsv(rows: ThirtyDaySummaryRow[]): string {
    const headers = [
      'Sale Date',
      'Vest Date',
      'Days Held',
      'Grant Number',
      'Grant Name',
      'Shares',
      'Sale Proceeds (USD)',
      'ESS Income (AUD)',
    ]

    const dataRows = rows.map((r) => [
      toDateKey(r.saleDate),
      toDateKey(r.vestDate),
      String(r.daysHeld),
      String(r.grantNumber),
      r.grantName,
      String(r.shares),
      money(r.saleProceedsUsd as number),
      money(r.essIncomeAud as number),
    ])

    return buildCsv(headers, dataRows)
  }

  return { exportEssIncomeCsv, exportCgtCsv, exportThirtyDayCsv }
}
