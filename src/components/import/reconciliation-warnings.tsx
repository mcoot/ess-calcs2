import type { ReconciliationWarning } from '@/services/reconciliation.service'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ReconciliationWarningsProps {
  warnings: ReconciliationWarning[]
}

export function ReconciliationWarnings({ warnings }: ReconciliationWarningsProps) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <Alert key={i} variant={w.severity === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>{w.severity === 'error' ? 'Error' : 'Warning'}</AlertTitle>
          <AlertDescription>{w.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}
