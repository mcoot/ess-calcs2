'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAppContext } from '@/components/providers/app-provider'
import { createReportService } from '@/services/report.service'
import type { FyTaxReport } from '@/services/report.service'
import { createCsvExportService } from '@/services/csv-export.service'
import { FySelector } from '@/components/dashboard/fy-selector'
import { EssIncomeSection } from '@/components/reports/ess-income-section'
import { CgtSection } from '@/components/reports/cgt-section'
import { ThirtyDaySection } from '@/components/reports/thirty-day-section'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { RsuRelease, SaleLot } from '@/types'
import { AppError } from '@/lib/errors'

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { store, essIncome, cgt, refreshKey } = useAppContext()
  const reportService = useMemo(() => createReportService(), [])
  const csvExport = useMemo(() => createCsvExportService(), [])

  const [releases, setReleases] = useState<RsuRelease[]>([])
  const [saleLots, setSaleLots] = useState<SaleLot[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedFy, setSelectedFy] = useState<string>('')

  useEffect(() => {
    async function load() {
      const [rels, lots] = await Promise.all([store.getRsuReleases(), store.getSaleLots()])
      setReleases(rels)
      setSaleLots(lots)
      setLoaded(true)
    }
    load()
  }, [store, refreshKey])

  const availableFys = useMemo(
    () => reportService.availableFinancialYears(releases, saleLots),
    [reportService, releases, saleLots],
  )

  // Auto-select the most recent FY
  useEffect(() => {
    if (availableFys.length > 0 && !availableFys.includes(selectedFy)) {
      setSelectedFy(availableFys[availableFys.length - 1])
    }
  }, [availableFys, selectedFy])

  const [reportError, setReportError] = useState<string | null>(null)

  const report: FyTaxReport | null = useMemo(() => {
    setReportError(null)
    if (!selectedFy) {
      return null
    }
    try {
      return reportService.generateFyReport(selectedFy, releases, saleLots, essIncome, cgt)
    } catch (err) {
      if (err instanceof AppError && err.code === 'MISSING_RATE') {
        setReportError(err.message)
      } else {
        setReportError(err instanceof Error ? err.message : 'An unexpected error occurred')
      }
      return null
    }
  }, [reportService, selectedFy, releases, saleLots, essIncome, cgt])

  function handleExportEss() {
    if (!report) {
      return
    }
    const csv = csvExport.exportEssIncomeCsv(report.essIncomeRows, report.financialYear)
    downloadCsv(csv, `ess-tax-report-FY${report.financialYear}-ess-income.csv`)
  }

  function handleExportCgt() {
    if (!report) {
      return
    }
    const csv = csvExport.exportCgtCsv(report.cgtRows, report.financialYear)
    downloadCsv(csv, `ess-tax-report-FY${report.financialYear}-cgt.csv`)
  }

  function handleExport30Day() {
    if (!report) {
      return
    }
    const csv = csvExport.exportThirtyDayCsv(report.thirtyDaySummaryRows, report.financialYear)
    downloadCsv(csv, `ess-tax-report-FY${report.financialYear}-30day.csv`)
  }

  if (loaded && availableFys.length === 0) {
    return (
      <main className="space-y-6 p-8">
        <h1 className="text-2xl font-bold">Tax Reports</h1>
        <p className="text-muted-foreground">
          No data available. Import RSU Releases and Sales CSV files to generate reports.
        </p>
      </main>
    )
  }

  return (
    <main className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tax Reports</h1>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExportEss}>
            Export ESS CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCgt}>
            Export CGT CSV
          </Button>
          {report && report.thirtyDaySummaryRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport30Day}>
              Export 30-Day CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <FySelector availableFys={availableFys} selectedFy={selectedFy} onSelect={setSelectedFy} />
      </div>

      {reportError && (
        <Alert variant="destructive">
          <AlertTitle>Report generation error</AlertTitle>
          <AlertDescription>{reportError}</AlertDescription>
        </Alert>
      )}

      {report && (
        <div className="space-y-6">
          <EssIncomeSection
            rows={report.essIncomeRows}
            totalAud={report.essIncomeTotalAud}
            fy={report.financialYear}
          />

          <CgtSection rows={report.cgtRows} summary={report.cgtSummary} fy={report.financialYear} />

          {report.thirtyDaySummaryRows.length > 0 && (
            <ThirtyDaySection rows={report.thirtyDaySummaryRows} />
          )}

          <p className="text-xs text-muted-foreground border-t pt-4">
            This report is generated for informational purposes only. It is not tax advice. Verify
            all calculations with a qualified tax professional before lodging your tax return.
            Exchange rates sourced from the Reserve Bank of Australia.
          </p>
        </div>
      )}
    </main>
  )
}
