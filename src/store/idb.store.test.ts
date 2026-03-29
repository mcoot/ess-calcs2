import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IndexedDBStore } from './idb.store'
import type { DataStore } from './data-store'
import type { Award, VestingScheduleEntry, RsuRelease, SaleLot, ForexRate } from '@/types'
import { usd } from '@/types'
import { d } from '@/test-helpers'

// ── Fixtures ────────────────────────────────────────────────────────

const award: Award = {
  grantDate: d(2018, 2, 15),
  grantNumber: 9375,
  grantType: 'Share Units (RSU)',
  grantName: 'Test Grant',
  grantReason: 'New Hire',
  conversionPrice: usd(52.65),
  sharesGranted: 475,
}

const awardB: Award = {
  grantDate: d(2020, 5, 1),
  grantNumber: 1234,
  grantType: 'Share Units (RSU)',
  grantName: 'Second Grant',
  grantReason: 'Annual',
  conversionPrice: usd(100),
  sharesGranted: 200,
}

const vestingEntry: VestingScheduleEntry = {
  grantNumber: 9375,
  vestDate: d(2019, 2, 18),
  shares: 118,
}

const release: RsuRelease = {
  grantDate: d(2018, 2, 15),
  grantNumber: 9375,
  grantName: 'Test Grant',
  grantReason: 'New Hire',
  releaseDate: d(2020, 2, 18),
  sharesVested: 30,
  sharesSoldToCover: 0,
  sharesHeld: 30,
  valueUsd: usd(4616.4),
  fmvPerShare: usd(153.88),
  sellToCoverAmount: usd(0),
  releaseReferenceNumber: 'RB6538C8B1',
}

const saleLot: SaleLot = {
  withdrawalReferenceNumber: 'WRC123',
  originatingReleaseRef: 'RB6538C8B1',
  grantNumber: 9375,
  grantName: 'Test Grant',
  lotNumber: 1,
  saleType: 'Long Shares',
  saleDate: d(2020, 1, 29),
  originalAcquisitionDate: d(2019, 2, 18),
  soldWithin30Days: false,
  costBasisPerShare: usd(104.9),
  costBasis: usd(3147),
  sharesSold: 30,
  saleProceeds: usd(4478.1),
  salePricePerShare: usd(149.27),
  brokerageCommission: usd(39.33),
  supplementalTransactionFee: usd(0.39),
}

const forexRate: ForexRate = {
  date: d(2023, 1, 3),
  audToUsd: 0.6828,
}

// ── Helpers ─────────────────────────────────────────────────────────

let dbCounter = 0
function uniqueDbName(): string {
  return `test-db-${Date.now()}-${dbCounter++}`
}

// ── Tests ───────────────────────────────────────────────────────────

describe('IndexedDBStore', () => {
  let store: DataStore

  beforeEach(async () => {
    store = await IndexedDBStore.create(uniqueDbName())
  })

  // ── Awards ──────────────────────────────────────────────────────

  describe('awards', () => {
    it('returns empty array on fresh DB', async () => {
      expect(await store.getAwards()).toEqual([])
    })

    it('round-trips data including Date fields', async () => {
      await store.saveAwards([award])
      const result = await store.getAwards()
      expect(result).toEqual([award])
      expect(result[0].grantDate).toBeInstanceOf(Date)
    })

    it('replaces previous data on save', async () => {
      await store.saveAwards([award])
      await store.saveAwards([awardB])
      expect(await store.getAwards()).toEqual([awardB])
    })

    it('clearAwards removes all records', async () => {
      await store.saveAwards([award])
      await store.clearAwards()
      expect(await store.getAwards()).toEqual([])
    })
  })

  // ── Vesting Schedule ────────────────────────────────────────────

  describe('vestingSchedule', () => {
    it('returns empty array on fresh DB', async () => {
      expect(await store.getVestingSchedule()).toEqual([])
    })

    it('round-trips data including Date fields', async () => {
      await store.saveVestingSchedule([vestingEntry])
      const result = await store.getVestingSchedule()
      expect(result).toEqual([vestingEntry])
      expect(result[0].vestDate).toBeInstanceOf(Date)
    })

    it('replaces previous data on save', async () => {
      const entryB: VestingScheduleEntry = {
        grantNumber: 1234,
        vestDate: d(2021, 6, 1),
        shares: 50,
      }
      await store.saveVestingSchedule([vestingEntry])
      await store.saveVestingSchedule([entryB])
      expect(await store.getVestingSchedule()).toEqual([entryB])
    })

    it('clearVestingSchedule removes all records', async () => {
      await store.saveVestingSchedule([vestingEntry])
      await store.clearVestingSchedule()
      expect(await store.getVestingSchedule()).toEqual([])
    })
  })

  // ── RSU Releases ────────────────────────────────────────────────

  describe('rsuReleases', () => {
    it('returns empty array on fresh DB', async () => {
      expect(await store.getRsuReleases()).toEqual([])
    })

    it('round-trips data including Date fields', async () => {
      await store.saveRsuReleases([release])
      const result = await store.getRsuReleases()
      expect(result).toEqual([release])
      expect(result[0].grantDate).toBeInstanceOf(Date)
      expect(result[0].releaseDate).toBeInstanceOf(Date)
    })

    it('replaces previous data on save', async () => {
      const releaseB: RsuRelease = {
        ...release,
        releaseReferenceNumber: 'RB9999',
        releaseDate: d(2021, 8, 18),
      }
      await store.saveRsuReleases([release])
      await store.saveRsuReleases([releaseB])
      expect(await store.getRsuReleases()).toEqual([releaseB])
    })

    it('clearRsuReleases removes all records', async () => {
      await store.saveRsuReleases([release])
      await store.clearRsuReleases()
      expect(await store.getRsuReleases()).toEqual([])
    })
  })

  // ── Sale Lots ───────────────────────────────────────────────────

  describe('saleLots', () => {
    it('returns empty array on fresh DB', async () => {
      expect(await store.getSaleLots()).toEqual([])
    })

    it('round-trips data including Date fields', async () => {
      await store.saveSaleLots([saleLot])
      const result = await store.getSaleLots()
      expect(result).toEqual([saleLot])
      expect(result[0].saleDate).toBeInstanceOf(Date)
      expect(result[0].originalAcquisitionDate).toBeInstanceOf(Date)
    })

    it('replaces previous data on save', async () => {
      const lotB: SaleLot = {
        ...saleLot,
        withdrawalReferenceNumber: 'WRC999',
        lotNumber: 2,
        saleDate: d(2021, 3, 15),
      }
      await store.saveSaleLots([saleLot])
      await store.saveSaleLots([lotB])
      expect(await store.getSaleLots()).toEqual([lotB])
    })

    it('clearSaleLots removes all records', async () => {
      await store.saveSaleLots([saleLot])
      await store.clearSaleLots()
      expect(await store.getSaleLots()).toEqual([])
    })
  })

  // ── Forex Rates ─────────────────────────────────────────────────

  describe('forexRates', () => {
    it('returns empty array on fresh DB', async () => {
      expect(await store.getForexRates()).toEqual([])
    })

    it('round-trips data including Date fields', async () => {
      await store.saveForexRates([forexRate])
      const result = await store.getForexRates()
      expect(result).toEqual([forexRate])
      expect(result[0].date).toBeInstanceOf(Date)
    })

    it('replaces previous data on save', async () => {
      const rateB: ForexRate = { date: d(2023, 6, 15), audToUsd: 0.71 }
      await store.saveForexRates([forexRate])
      await store.saveForexRates([rateB])
      expect(await store.getForexRates()).toEqual([rateB])
    })

    it('clearForexRates removes all records', async () => {
      await store.saveForexRates([forexRate])
      await store.clearForexRates()
      expect(await store.getForexRates()).toEqual([])
    })
  })

  // ── Config ──────────────────────────────────────────────────────

  describe('config', () => {
    it('returns null on fresh DB', async () => {
      expect(await store.getConfig()).toBeNull()
    })

    it('round-trips config data', async () => {
      await store.saveConfig({ displayCurrency: 'AUD' })
      expect(await store.getConfig()).toEqual({ displayCurrency: 'AUD' })
    })

    it('replaces previous config on save', async () => {
      await store.saveConfig({ displayCurrency: 'USD' })
      await store.saveConfig({ displayCurrency: 'AUD' })
      expect(await store.getConfig()).toEqual({ displayCurrency: 'AUD' })
    })
  })

  // ── clearAll ────────────────────────────────────────────────────

  describe('clearAll', () => {
    it('resets all stores to empty/null', async () => {
      await store.saveAwards([award])
      await store.saveVestingSchedule([vestingEntry])
      await store.saveRsuReleases([release])
      await store.saveSaleLots([saleLot])
      await store.saveForexRates([forexRate])
      await store.saveConfig({ displayCurrency: 'USD' })

      await store.clearAll()

      expect(await store.getAwards()).toEqual([])
      expect(await store.getVestingSchedule()).toEqual([])
      expect(await store.getRsuReleases()).toEqual([])
      expect(await store.getSaleLots()).toEqual([])
      expect(await store.getForexRates()).toEqual([])
      expect(await store.getConfig()).toBeNull()
    })
  })

  // ── Fallback ────────────────────────────────────────────────────

  describe('fallback', () => {
    it('returns a working store when IndexedDB is unavailable', async () => {
      const original = globalThis.indexedDB
      try {
        // @ts-expect-error — simulating unavailable IndexedDB
        globalThis.indexedDB = undefined
        const fallbackStore = await IndexedDBStore.create('should-fallback')
        await fallbackStore.saveAwards([award])
        expect(await fallbackStore.getAwards()).toEqual([award])
      } finally {
        globalThis.indexedDB = original
      }
    })
  })
})
