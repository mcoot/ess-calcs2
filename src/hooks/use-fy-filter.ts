import { useState, useCallback } from 'react'

export function useFyFilter() {
  const [selectedFy, setSelectedFy] = useState('all')

  const filterByFy = useCallback(
    <T extends { financialYear: string }>(items: T[]): T[] => {
      if (selectedFy === 'all') return items
      return items.filter((item) => item.financialYear === selectedFy)
    },
    [selectedFy],
  )

  return { selectedFy, setSelectedFy, filterByFy }
}
