'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/components/providers/app-provider'
import { FileDropZone } from '@/components/import/file-drop-zone'
import { ImportResults } from '@/components/import/import-results'
import { ReconciliationWarnings } from '@/components/import/reconciliation-warnings'
import { DataSummary } from '@/components/import/data-summary'
import { importCsv, type ImportResult } from '@/services/csv-import.service'
import {
  createReconciliationService,
  type ReconciliationWarning,
} from '@/services/reconciliation.service'

const reconciliation = createReconciliationService()

export default function ImportPage() {
  const { store, refreshData, refreshKey } = useAppContext()
  const [result, setResult] = useState<ImportResult | null>(null)
  const [warnings, setWarnings] = useState<ReconciliationWarning[]>([])

  useEffect(() => {
    async function runReconciliation() {
      const [awards, releases, saleLots] = await Promise.all([
        store.getAwards(),
        store.getRsuReleases(),
        store.getSaleLots(),
      ])
      setWarnings(reconciliation.validate(awards, releases, saleLots))
    }
    runReconciliation()
  }, [store, refreshKey])

  async function handleFiles(files: File[]) {
    for (const file of files) {
      const text = await file.text()
      const r = await importCsv(store, text)
      setResult(r)
    }
    refreshData()
  }

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Import Data</h1>
      <FileDropZone onFilesSelected={handleFiles} />
      <ImportResults result={result} />
      <ReconciliationWarnings warnings={warnings} />
      <DataSummary />
    </main>
  )
}
