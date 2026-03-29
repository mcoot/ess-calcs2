'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/components/providers/app-provider'
import { AwardsTable } from '@/components/awards/awards-table'
import type { Award } from '@/types'

export default function AwardsPage() {
  const { store, refreshKey } = useAppContext()
  const [awards, setAwards] = useState<Award[]>([])

  useEffect(() => {
    store.getAwards().then(setAwards)
  }, [store, refreshKey])

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-2xl font-bold">Awards</h1>
      <AwardsTable awards={awards} />
    </main>
  )
}
