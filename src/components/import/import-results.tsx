'use client'

import type { ImportResult } from '@/services/csv-import.service'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ImportResultsProps {
  result: ImportResult | null
}

export function ImportResults({ result }: ImportResultsProps) {
  if (!result) return null

  if (result.ok) {
    return (
      <Alert>
        <AlertTitle>Import successful</AlertTitle>
        <AlertDescription>
          Imported {result.count} {result.type} records.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Import failed</AlertTitle>
      <AlertDescription>{result.error}</AlertDescription>
    </Alert>
  )
}
