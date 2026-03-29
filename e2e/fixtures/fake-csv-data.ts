/**
 * Generators for fake CSV data matching the format expected by each parser.
 * Used by e2e tests (and unit tests) to avoid depending on local sample files.
 */

function ddMonYyyy(year: number, monthIndex: number): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const day = String(15 + (monthIndex % 14)).padStart(2, '0')
  return `${day}-${months[monthIndex]}-${year}`
}

export function awardCsv(count: number): string {
  const headers = [
    'Award Summary',
    'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Conversion Price,,Granted,Previously Distributed,,,Not Available For Distribution,,',
    ',,,,,,,,,Shares,Benefit Received,,Shares,Estimated Benefit,',
  ].join('\n')

  const rows = Array.from({ length: count }, (_, i) => {
    const num = 1000 + i
    const price = (50 + i * 1.25).toFixed(4)
    const shares = 100 + i * 10
    const benefit = (shares * parseFloat(price)).toFixed(2)
    return `15-Mar-2026,${ddMonYyyy(2018 + (i % 5), i % 12)},${num},Share Units (RSU),Grant ${num},New Hire,$${price},USD,${shares},${shares},"$${benefit}",USD,0,$0.00,USD`
  })

  const totalShares = Array.from({ length: count }, (_, i) => 100 + i * 10).reduce(
    (a, b) => a + b,
    0,
  )
  const total = `,,,,,,,,"${totalShares.toLocaleString()}","${totalShares.toLocaleString()}","$0.00",USD,0,$0.00,USD`

  return [headers, ...rows, total].join('\n')
}

export function vestingCsv(grantCount: number, entriesPerGrant: number): string {
  const headers = [
    'Full Vesting Schedule',
    'As Of Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Vest Date,Shares',
  ].join('\n')

  const lines: string[] = []
  for (let g = 0; g < grantCount; g++) {
    const num = 1000 + g
    lines.push(`Grant Number: ${num}`)
    for (let e = 0; e < entriesPerGrant; e++) {
      const shares = 10 + e
      lines.push(
        `15-Mar-2026,${ddMonYyyy(2018, g % 12)},${num},Share Units (RSU),Grant ${num},New Hire,${ddMonYyyy(2019 + Math.floor(e / 4), e % 12)},${shares}`,
      )
    }
    lines.push(`,,,,,,,${entriesPerGrant * 15}`)
  }
  lines.push(`,,,,,,,"${(grantCount * entriesPerGrant * 15).toLocaleString()}"`)

  return [headers, ...lines].join('\n')
}

export function releasesCsv(count: number): string {
  const headers = [
    'RSU Releases',
    'Period Start Date,Period End Date,Grant Date,Grant Number,Grant Type,Grant Name,Grant Reason,Release Date,Shares Vested,Shares Sold-To-Cover,Shares Held,Value,,Fair Market Value Per Share,,Sale Date (Sell-To-Cover only),Sale Price Per Share,,Sale Proceeds,,Sell-To-Cover Amount,,Release Reference Number',
  ].join('\n')

  const rows = Array.from({ length: count }, (_, i) => {
    const num = 1000 + (i % 10)
    const shares = 20 + i
    const fmv = (150 + i * 0.5).toFixed(2)
    const value = (shares * parseFloat(fmv)).toFixed(2)
    const ref = `RB${(0xa0000000 + i).toString(16).toUpperCase()}`
    return `01-Jan-2020,15-Mar-2026,${ddMonYyyy(2018, i % 12)},${num},Share Units (RSU),Grant ${num},New Hire,${ddMonYyyy(2020 + Math.floor(i / 12), i % 12)},${shares},0,${shares},"$${value}",USD,$${fmv},USD,,,,,,$0.00,USD,${ref}`
  })

  const total = `,,,,,,,,"${count}",0,"${count}","$0.00",USD,,,,,,,,$0.00,USD,`
  return [headers, ...rows, total].join('\n')
}

export function salesCsv(count: number): string {
  const headers = [
    'Sales - Long Shares',
    'Period Start Date,Period End Date,Withdrawal Reference Number,Originating Release Reference Number,Employee Grant Number,Grant Name,Lot Number,Sale Type,Sale Date,Original Acquisition Date,Sold Within 30 Days of Vest,Original Cost Basis Per Share,,Original Cost Basis,,Shares Sold,Sale Proceeds,,Sale Price Per Share,,Brokerage Commission,,Supplemental Transaction Fee,',
  ].join('\n')

  const rows = Array.from({ length: count }, (_, i) => {
    const num = 1000 + (i % 10)
    const wRef = `WRC${(0xc0000000 + i).toString(16).toUpperCase()}-1EE`
    const oRef = `RB${(0xa0000000 + i).toString(16).toUpperCase()}`
    const costBasis = (100 + i * 0.5).toFixed(2)
    const shares = 10 + (i % 20)
    const totalCost = (shares * parseFloat(costBasis)).toFixed(2)
    const salePrice = (parseFloat(costBasis) + 20).toFixed(4)
    const proceeds = (shares * parseFloat(salePrice)).toFixed(2)
    const within30 = i % 5 === 0 ? 'YES' : 'NO'
    return `01-Jan-2020,15-Mar-2026,${wRef},${oRef},${num},Grant ${num},${(i % 3) + 1},Long Shares,${ddMonYyyy(2020 + Math.floor(i / 12), i % 12)},${ddMonYyyy(2019, i % 12)},${within30},$${costBasis},USD,"$${totalCost}",USD,${shares},"$${proceeds}",USD,$${salePrice},USD,$10.00,USD,$0.50,USD`
  })

  const total = ',,,,,,,,,,,,,,,,,,,,,,,,'
  return [headers, ...rows, total].join('\n')
}
