import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFyFilter } from './use-fy-filter'

describe('useFyFilter', () => {
  it("defaults to 'all'", () => {
    const { result } = renderHook(() => useFyFilter(['2021-22', '2022-23']))

    expect(result.current.selectedFy).toBe('all')
  })

  it("filterByFy returns all items when 'all' selected", () => {
    const { result } = renderHook(() => useFyFilter(['2021-22', '2022-23']))

    const items = [
      { financialYear: '2021-22', value: 1 },
      { financialYear: '2022-23', value: 2 },
    ]

    expect(result.current.filterByFy(items)).toEqual(items)
  })

  it('filterByFy returns only matching items when specific FY selected', () => {
    const { result } = renderHook(() => useFyFilter(['2021-22', '2022-23']))

    act(() => {
      result.current.setSelectedFy('2022-23')
    })

    const items = [
      { financialYear: '2021-22', value: 1 },
      { financialYear: '2022-23', value: 2 },
      { financialYear: '2022-23', value: 3 },
    ]

    expect(result.current.filterByFy(items)).toEqual([
      { financialYear: '2022-23', value: 2 },
      { financialYear: '2022-23', value: 3 },
    ])
  })

  it('updates selectedFy when setSelectedFy is called', () => {
    const { result } = renderHook(() => useFyFilter(['2021-22']))

    expect(result.current.selectedFy).toBe('all')

    act(() => {
      result.current.setSelectedFy('2021-22')
    })

    expect(result.current.selectedFy).toBe('2021-22')
  })
})
