'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/components/providers/app-provider'
import { Button } from '@/components/ui/button'

interface DataCounts {
  awards: number
  vestingSchedule: number
  releases: number
  saleLots: number
}

export function DataSummary() {
  const { store, refreshKey, refreshData } = useAppContext()
  const [counts, setCounts] = useState<DataCounts | null>(null)
  const [confirmState, setConfirmState] = useState<'idle' | 'confirming'>('idle')

  useEffect(() => {
    async function load() {
      const [awards, vestingSchedule, releases, saleLots] = await Promise.all([
        store.getAwards(),
        store.getVestingSchedule(),
        store.getRsuReleases(),
        store.getSaleLots(),
      ])
      setCounts({
        awards: awards.length,
        vestingSchedule: vestingSchedule.length,
        releases: releases.length,
        saleLots: saleLots.length,
      })
    }
    load()
  }, [store, refreshKey])

  useEffect(() => {
    if (confirmState !== 'confirming') {
      return
    }
    const timer = setTimeout(() => setConfirmState('idle'), 3000)
    return () => clearTimeout(timer)
  }, [confirmState])

  async function handleClear() {
    if (confirmState === 'idle') {
      setConfirmState('confirming')
      return
    }
    await Promise.all([
      store.clearAwards(),
      store.clearVestingSchedule(),
      store.clearRsuReleases(),
      store.clearSaleLots(),
    ])
    setConfirmState('idle')
    refreshData()
  }

  if (!counts) {
    return null
  }

  const total = counts.awards + counts.vestingSchedule + counts.releases + counts.saleLots
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No data imported yet.</p>
  }

  const entries = [
    { label: 'Awards', count: counts.awards },
    { label: 'Vesting Schedule', count: counts.vestingSchedule },
    { label: 'Releases', count: counts.releases },
    { label: 'Sale Lots', count: counts.saleLots },
  ].filter((e) => e.count > 0)

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium">Loaded data</h3>
      <ul className="text-sm text-muted-foreground">
        {entries.map(({ label, count }) => (
          <li key={label}>
            {label}: {count} rows
          </li>
        ))}
      </ul>
      <Button
        variant={confirmState === 'confirming' ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleClear}
      >
        {confirmState === 'confirming' ? 'Confirm Clear?' : 'Clear Data'}
      </Button>
    </div>
  )
}
