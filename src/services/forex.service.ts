import type { ForexRate, USD, AUD } from '@/types'
import { usd, aud } from '@/types'
import { toDateKey } from '@/lib/dates'
import { roundTo2dp } from '@/lib/money'
import { AppError, ErrorCodes } from '@/lib/errors'

export interface ForexService {
  getRate(date: Date): { rate: number; rateDate: Date }
  usdToAud(amount: USD, date: Date): { aud: AUD; rate: number; rateDate: Date }
  audToUsd(amount: AUD, date: Date): { usd: USD; rate: number; rateDate: Date }
  getDateRange(): { earliest: Date; latest: Date }
}

export function createForexService(rates: ForexRate[]): ForexService {
  const sorted = [...rates].sort((a, b) => a.date.getTime() - b.date.getTime())
  const byKey = new Map<string, ForexRate>()
  for (const r of sorted) {
    byKey.set(toDateKey(r.date), r)
  }

  function getRate(date: Date): { rate: number; rateDate: Date } {
    if (sorted.length > 0 && date.getTime() > sorted[sorted.length - 1].date.getTime()) {
      throw new AppError(
        ErrorCodes.MISSING_RATE,
        `No forex rate available for ${toDateKey(date)} — date is after latest rate`,
      )
    }

    const key = toDateKey(date)
    const exact = byKey.get(key)
    if (exact) {
      return { rate: exact.audToUsd, rateDate: exact.date }
    }

    // Binary search for nearest prior rate
    const t = date.getTime()
    let lo = 0
    let hi = sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (sorted[mid].date.getTime() <= t) {
        lo = mid + 1
      } else {
        hi = mid
      }
    }
    // lo is the insertion point; lo-1 is the nearest prior entry
    const idx = lo - 1
    if (idx < 0) {
      throw new AppError(
        ErrorCodes.MISSING_RATE,
        `No forex rate available for ${toDateKey(date)} — date is before all available rates`,
      )
    }

    const entry = sorted[idx]
    return { rate: entry.audToUsd, rateDate: entry.date }
  }

  return {
    getRate,

    usdToAud(amount: USD, date: Date) {
      const { rate, rateDate } = getRate(date)
      return { aud: aud(roundTo2dp(amount / rate)), rate, rateDate }
    },

    audToUsd(amount: AUD, date: Date) {
      const { rate, rateDate } = getRate(date)
      return { usd: usd(roundTo2dp(amount * rate)), rate, rateDate }
    },

    getDateRange() {
      if (sorted.length === 0) {
        throw new AppError(ErrorCodes.MISSING_RATE, 'No forex rates available')
      }
      return {
        earliest: sorted[0].date,
        latest: sorted[sorted.length - 1].date,
      }
    },
  }
}
